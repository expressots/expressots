/**
 * In-memory model of `package-lock.json` v2/v3.
 *
 * The lockfile is the ground truth for *what's actually installed* in
 * the user's `node_modules`. npm audit's output is a flat list keyed by
 * package name and a partial `effects` array — useful, but it doesn't
 * give us the full transitive chain or the direct dependency that
 * brought a vulnerable package in. We need that for two features:
 *
 *   1. Root-cause routing — show "lodash@4.17.10 reached via
 *      express-session → fix by upgrading express-session 1.17.0 → 1.17.3".
 *   2. Fix-group construction — collapse N CVEs that all resolve via
 *      one upgrade into a single "Upgrade X — fixes N advisories" row.
 *
 * The graph is intentionally minimal: we parse the lockfile once,
 * resolve each "node_modules/<path>" entry's dependencies against npm's
 * hoist rules (nearest ancestor wins), and store the forward edges. We
 * do *not* try to invert it — root-cause queries do a small BFS from
 * the project's direct deps, which is cheap enough at any realistic
 * project size (thousands of packages, milliseconds).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { RootCause } from '../types/index.js';

/**
 * A single resolved node in the install graph. Keyed by the lockfile's
 * `node_modules/...` path (the *install location*), not by name —
 * because npm 7+ allows multiple copies of the same package living at
 * different depths.
 */
interface LockNode {
  /** Lockfile key, e.g. `"node_modules/foo"` or `""` for the root. */
  key: string;
  /** Package name (root has the project's own name). */
  name: string;
  /** Installed version. */
  version: string;
  /** Lockfile-declared dependencies by name → semver range. */
  deps: Record<string, string>;
  /** True for the project itself (the `""` key). */
  isRoot: boolean;
}

/**
 * Loaded lockfile graph. A `null` instance means we couldn't parse the
 * lockfile (no file, unsupported version, etc.) — callers should treat
 * that as "no transitive resolution available" and skip enrichment.
 */
export class LockfileGraph {
  private readonly nodes = new Map<string, LockNode>();
  /** Adjacency cache: node-key → array of resolved-child node-keys. */
  private readonly childCache = new Map<string, string[]>();

  private constructor(private readonly root: LockNode) {
    this.nodes.set(root.key, root);
  }

  /**
   * Parse the lockfile at `cwd`. Returns `null` for missing /
   * unparseable lockfiles — root-cause routing then no-ops, which is
   * better than a hard failure.
   */
  static load(cwd: string): LockfileGraph | null {
    const file = path.join(cwd, 'package-lock.json');
    let raw: string;
    try {
      raw = fs.readFileSync(file, 'utf-8');
    } catch {
      return null;
    }

    let parsed: LockfileV2;
    try {
      parsed = JSON.parse(raw) as LockfileV2;
    } catch {
      return null;
    }

    // We only handle lockfile v2/v3 (which share the `packages` map).
    // npm v7+ defaults to v2; npm v9+ to v3. Both are universally
    // supported by the Node LTS releases we care about.
    if (!parsed.packages || typeof parsed.packages !== 'object') {
      return null;
    }

    const rootEntry = parsed.packages[''];
    const root: LockNode = {
      key: '',
      name: parsed.name ?? rootEntry?.name ?? '<project>',
      version: parsed.version ?? rootEntry?.version ?? '0.0.0',
      deps: {
        ...(rootEntry?.dependencies ?? {}),
        ...(rootEntry?.devDependencies ?? {}),
        ...(rootEntry?.optionalDependencies ?? {}),
      },
      isRoot: true,
    };

    const graph = new LockfileGraph(root);

    for (const [key, entry] of Object.entries(parsed.packages)) {
      if (key === '') continue;
      // The lockfile key encodes the install path; the package name is
      // the last segment after the final `node_modules/`. Take that
      // rather than trust `entry.name` (which v2 sometimes omits).
      const name = nameFromKey(key) ?? entry?.name;
      if (!name) continue;
      graph.nodes.set(key, {
        key,
        name,
        version: entry?.version ?? 'unknown',
        deps: {
          ...(entry?.dependencies ?? {}),
          ...(entry?.optionalDependencies ?? {}),
        },
        isRoot: false,
      });
    }

    return graph;
  }

  /** True when `pkg` is declared as a direct dep / devDep / optionalDep. */
  isDirect(pkg: string): boolean {
    return pkg in this.root.deps;
  }

  /** Version of a direct dep, or undefined if it's not a direct dep. */
  directVersion(pkg: string): string | undefined {
    const child = this.resolveDep(this.root.key, pkg);
    return child ? this.nodes.get(child)?.version : undefined;
  }

  /** Returns the set of every distinct package name in the graph. */
  packageNames(): Set<string> {
    const out = new Set<string>();
    for (const node of this.nodes.values()) {
      if (!node.isRoot) out.add(node.name);
    }
    return out;
  }

  /**
   * Find the shortest chain of dependency names from any direct dep to
   * an installation of `vulnerablePkg`.
   *
   * Returns `null` when:
   *   - the vulnerable package isn't installed at all, or
   *   - the BFS exhausts the graph without finding a route (shouldn't
   *     happen if the lockfile is internally consistent).
   */
  findRootCause(vulnerablePkg: string): RootCause | null {
    const vulnNode = this.findInstalledNode(vulnerablePkg);
    if (!vulnNode) return null;

    // Direct dep? No further work — the "chain" is just the package itself.
    if (this.isDirect(vulnerablePkg)) {
      return {
        rootPackage: vulnerablePkg,
        rootInstalledVersion: vulnNode.version,
        chain: [vulnerablePkg],
        isDirect: true,
      };
    }

    // BFS from every direct dep, taking the first chain that reaches a
    // node whose `name === vulnerablePkg`. We keep a parent map keyed
    // by node-key so we can walk back to the root once we find a hit.
    // Tracking visited *nodes* (by key) prevents cycles and keeps the
    // search bounded by the lockfile size.
    const parent = new Map<string, string | null>(); // childKey → parentKey ('' marks a root entry)
    const queue: string[] = [];

    for (const directName of Object.keys(this.root.deps)) {
      const childKey = this.resolveDep(this.root.key, directName);
      if (!childKey || parent.has(childKey)) continue;
      parent.set(childKey, null);
      queue.push(childKey);
    }

    while (queue.length > 0) {
      const curKey = queue.shift()!;
      const node = this.nodes.get(curKey);
      if (!node) continue;

      if (node.name === vulnerablePkg) {
        const chain: string[] = [];
        let cursor: string | null = curKey;
        while (cursor !== null) {
          const n = this.nodes.get(cursor);
          if (n) chain.unshift(n.name);
          cursor = parent.get(cursor) ?? null;
        }
        const rootName = chain[0] ?? vulnerablePkg;
        return {
          rootPackage: rootName,
          rootInstalledVersion: this.directVersion(rootName) ?? 'unknown',
          chain,
          isDirect: false,
        };
      }

      for (const depName of Object.keys(node.deps)) {
        const nextKey = this.resolveDep(curKey, depName);
        if (!nextKey || parent.has(nextKey)) continue;
        parent.set(nextKey, curKey);
        queue.push(nextKey);
      }
    }

    return null;
  }

  /**
   * Resolve `parentKey`'s declared dep `depName` to the lockfile entry
   * that actually fulfils it. npm's hoist rule is "nearest ancestor with
   * a matching `node_modules/<name>` wins" — we walk back up by trimming
   * the path one segment at a time until we hit a match.
   */
  private resolveDep(parentKey: string, depName: string): string | null {
    const cacheKey = `${parentKey}::${depName}`;
    const hit = this.childCache.get(cacheKey);
    if (hit !== undefined) return hit[0] ?? null;

    // Direct attempt: `<parentKey>/node_modules/<depName>`.
    let cursor = parentKey;
    while (true) {
      const candidate = cursor
        ? `${cursor}/node_modules/${depName}`
        : `node_modules/${depName}`;
      if (this.nodes.has(candidate)) {
        this.childCache.set(cacheKey, [candidate]);
        return candidate;
      }
      if (!cursor) break;
      // Strip the last `node_modules/<x>` segment, if any.
      const idx = cursor.lastIndexOf('/node_modules/');
      cursor = idx === -1 ? '' : cursor.slice(0, idx);
    }

    this.childCache.set(cacheKey, []);
    return null;
  }

  /**
   * Find *some* installation of `pkg`. We prefer a hoisted top-level
   * one (most common); falling back to the first nested copy found.
   */
  private findInstalledNode(pkg: string): LockNode | null {
    const top = this.nodes.get(`node_modules/${pkg}`);
    if (top) return top;
    for (const node of this.nodes.values()) {
      if (!node.isRoot && node.name === pkg) return node;
    }
    return null;
  }
}

// ────────────────────────────────────────────────────────────────────────
// Internal: minimal lockfile typings + helpers
// ────────────────────────────────────────────────────────────────────────

interface LockfileV2 {
  name?: string;
  version?: string;
  lockfileVersion?: number;
  packages?: Record<string, LockfileV2Entry>;
}

interface LockfileV2Entry {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

/**
 * Pull the package name from a lockfile key. Handles scoped packages
 * (`node_modules/@scope/name`) and nested ones
 * (`node_modules/foo/node_modules/@scope/bar`).
 */
function nameFromKey(key: string): string | null {
  const idx = key.lastIndexOf('node_modules/');
  if (idx === -1) return null;
  const tail = key.slice(idx + 'node_modules/'.length);
  if (!tail) return null;
  return tail; // `@scope/name` or `name`
}
