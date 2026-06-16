/**
 * Runtime reachability analysis for supply-chain findings.
 *
 * This is the single feature that justifies "why Studio over Snyk?". A
 * static scanner can tell you that `lodash@4.17.10` has CVE-X; only a
 * tool sitting inside the running app can tell you that:
 *
 *   - `src/users/users.service.ts` actually imports lodash
 *   - that service is wired into `UsersController`, which owns `GET /users`
 *   - and `GET /users` has been hit 47 times in the last hour
 *
 * We combine three signals to land on one of four labels per finding:
 *
 *   - **confirmed**: a route that imports (transitively) the vulnerable
 *     package has been exercised in the current session.
 *   - **likely**: the package is imported from `src/` but we haven't
 *     seen a request hit a route that reaches it yet.
 *   - **unreachable**: we have a complete import graph for `src/` and
 *     the package doesn't appear anywhere. Usually means it's only
 *     pulled in by a dev tool or another transitive dep.
 *   - **unknown**: we can't compute the graph (no src dir, scanning
 *     disabled). Default for transitive packages with no direct
 *     imports — we don't follow node_modules → node_modules edges.
 *
 * The analyzer is intentionally cheap: regex-based import extraction
 * over the same source tree the route scanner already walked. We
 * don't reach for a TypeScript AST — it'd be 100× slower for almost
 * no precision gain at this granularity (we only need package names,
 * not symbols).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { glob } from 'glob';
import type {
  AppStructure,
  ControllerInfo,
  DependencyFinding,
  Reachability,
  ReachabilityInfo,
  RecordedExchange,
  RouteInfo,
  ServiceInfo,
} from '../types/index.js';

/**
 * Reachability snapshot built once per security scan. We compute it on
 * the agent thread (synchronous file I/O, but only ~200 small files for
 * a typical service) and pass it to `enrichWithReachability`, which is
 * then a pure map.
 */
export interface ReachabilitySnapshot {
  /** package name → files in `src/` that import it. */
  importedByPkg: Map<string, Set<string>>;
  /** file path → routes whose handlers live in (or transitively reach) that file. */
  routesByFile: Map<string, RouteInfo[]>;
}

const IMPORT_PATTERNS: RegExp[] = [
  // ESM: import ... from 'pkg'  /  import 'pkg'
  /import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g,
  // Re-exports: export ... from 'pkg'
  /export\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g,
  // Dynamic import: import('pkg')
  /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  // CJS: require('pkg')
  /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];

/**
 * Build a reachability snapshot for the host project. Returns an empty
 * snapshot if `srcPath` doesn't exist — callers should treat that as
 * "always emit `unknown`" rather than failing.
 *
 * Safe to call on every full scan; for a 1000-file project it usually
 * completes in <100 ms.
 */
export async function buildReachabilitySnapshot(
  cwd: string,
  structure: AppStructure | null,
): Promise<ReachabilitySnapshot> {
  const srcPath = findSrcPath(cwd);
  const importedByPkg = new Map<string, Set<string>>();
  const filesByImports = new Map<string, Set<string>>();

  if (!srcPath) {
    return { importedByPkg, routesByFile: new Map() };
  }

  const files = await glob('**/*.{ts,tsx,js,mjs,cjs}', {
    cwd: srcPath,
    ignore: ['**/node_modules/**', '**/*.spec.ts', '**/*.test.ts', '**/*.d.ts'],
    absolute: true,
  });

  for (const file of files) {
    let content: string;
    try {
      content = fs.readFileSync(file, 'utf-8');
    } catch {
      continue;
    }
    const pkgs = extractPackageImports(content);
    if (pkgs.size === 0) continue;
    filesByImports.set(file, pkgs);
    for (const pkg of pkgs) {
      const existing = importedByPkg.get(pkg) ?? new Set<string>();
      existing.add(file);
      importedByPkg.set(pkg, existing);
    }
  }

  const routesByFile = buildRoutesByFile(structure, filesByImports);
  return { importedByPkg, routesByFile };
}

/**
 * Attach a `ReachabilityInfo` block to every finding in `findings`.
 * Pure given the snapshot + exchanges; same call with the same inputs
 * always produces the same output, which keeps hashing stable.
 */
export function enrichWithReachability(
  findings: DependencyFinding[],
  snapshot: ReachabilitySnapshot,
  exchanges: RecordedExchange[],
): DependencyFinding[] {
  // Index exchanges by `method:path` so we can count hits per route
  // in O(N) over routes regardless of exchange count.
  const exchangeCountsByRoute = new Map<string, number>();
  for (const ex of exchanges) {
    const method = ex.request.method;
    const matchPath = ex.request.path || ex.request.url;
    if (!matchPath) continue;
    const key = `${method}:${normalisePath(matchPath)}`;
    exchangeCountsByRoute.set(key, (exchangeCountsByRoute.get(key) ?? 0) + 1);
  }

  return findings.map((finding) => {
    // For transitive findings, prefer the root package — that's the
    // one the user's source actually imports. We fall back to the
    // vulnerable package name when no root cause is set (direct dep
    // or unknown lockfile).
    const probe = finding.rootCause?.rootPackage ?? finding.package;
    const info = computeReachability(
      probe,
      snapshot,
      exchangeCountsByRoute,
      Boolean(finding.rootCause?.isDirect ?? snapshot.importedByPkg.has(probe)),
    );
    return { ...finding, reachability: info };
  });
}

// ────────────────────────────────────────────────────────────────────────
// Internals
// ────────────────────────────────────────────────────────────────────────

function computeReachability(
  pkg: string,
  snapshot: ReachabilitySnapshot,
  exchangeCounts: Map<string, number>,
  hasGraph: boolean,
): ReachabilityInfo {
  const importers = snapshot.importedByPkg.get(pkg);

  if (!importers || importers.size === 0) {
    if (!hasGraph && snapshot.importedByPkg.size === 0) {
      // We have no source-graph data at all (e.g. no `src/` dir,
      // analyzer disabled). Be honest about it rather than calling
      // every dep "unreachable".
      return {
        level: 'unknown',
        importedBy: [],
        routes: [],
        runtimeHits: 0,
        reason: 'No source graph available — Studio could not analyse `src/`.',
      };
    }
    if (snapshot.importedByPkg.size > 0) {
      // We scanned src/ successfully and the package never appears.
      // For transitive packages this is the common case: they're
      // only used internally by other deps.
      return {
        level: 'unreachable',
        importedBy: [],
        routes: [],
        runtimeHits: 0,
        reason: 'No source files import this package directly.',
      };
    }
    return {
      level: 'unknown',
      importedBy: [],
      routes: [],
      runtimeHits: 0,
      reason: 'No matching source files found.',
    };
  }

  const importedBy = Array.from(importers);
  const routes = new Map<string, RouteInfo>();
  for (const file of importedBy) {
    const fileRoutes = snapshot.routesByFile.get(file) ?? [];
    for (const r of fileRoutes) {
      routes.set(`${r.method}:${r.path}`, r);
    }
  }
  const routesArr = Array.from(routes.values()).map((r) => ({
    method: r.method,
    path: r.path,
  }));

  let hits = 0;
  for (const r of routesArr) {
    hits += exchangeCounts.get(`${r.method}:${normalisePath(r.path)}`) ?? 0;
  }

  let level: Reachability;
  let reason: string;
  if (hits > 0) {
    level = 'confirmed';
    reason = `${routesArr.length} route${routesArr.length === 1 ? '' : 's'} reach this package and ${hits} request${hits === 1 ? '' : 's'} hit them in the current session.`;
  } else if (routesArr.length > 0) {
    level = 'likely';
    reason = `${routesArr.length} route${routesArr.length === 1 ? '' : 's'} reach this package, but none have been exercised yet.`;
  } else {
    // Imported, but we couldn't tie it back to any route — could be a
    // utility module, a bootstrap helper, or a worker. Still "likely"
    // because the package *is* in your code path.
    level = 'likely';
    reason = `Imported by ${importedBy.length} file${importedBy.length === 1 ? '' : 's'} but no route reaches it directly.`;
  }

  return {
    level,
    importedBy,
    routes: routesArr,
    runtimeHits: hits,
    reason,
  };
}

/**
 * Walk `content` looking for bare-package imports. Bare = not relative
 * (`./foo`) and not absolute (`/foo`). Returns deduped package names
 * (scoped packages keep their `@scope/` prefix).
 */
function extractPackageImports(content: string): Set<string> {
  const out = new Set<string>();
  for (const re of IMPORT_PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const spec = m[1];
      if (!spec || spec.startsWith('.') || spec.startsWith('/')) continue;
      // Strip subpath: `foo/bar/baz` → `foo`, `@scope/pkg/sub` → `@scope/pkg`.
      const parts = spec.split('/');
      const name = spec.startsWith('@')
        ? parts.slice(0, 2).join('/')
        : parts[0];
      if (name) out.add(name);
    }
  }
  return out;
}

/**
 * Resolve `src/` for the host project. We try a few common spellings
 * because not every ExpressoTS app uses literal `./src` (monorepo
 * roots sometimes don't).
 */
function findSrcPath(cwd: string): string | null {
  const candidates = ['src', 'lib', 'app'];
  for (const c of candidates) {
    const full = path.join(cwd, c);
    if (fs.existsSync(full) && fs.statSync(full).isDirectory()) {
      return full;
    }
  }
  return null;
}

/**
 * Reverse-index controllers/services by file so each importing file
 * can be answered "which routes does this serve?".
 *
 * The mapping isn't perfect (an imported util file may not be a
 * controller itself), so we also fold in transitive reach: if a
 * service file imports lodash and a controller depends on that
 * service, the controller's routes are credited.
 */
function buildRoutesByFile(
  structure: AppStructure | null,
  filesByImports: Map<string, Set<string>>,
): Map<string, RouteInfo[]> {
  const out = new Map<string, RouteInfo[]>();
  if (!structure) return out;

  const controllersByFile = new Map<string, ControllerInfo>();
  for (const c of structure.controllers) {
    controllersByFile.set(normalisePath(c.filePath), c);
  }
  const servicesByName = new Map<string, ServiceInfo>();
  for (const s of [...structure.services, ...structure.providers]) {
    servicesByName.set(s.name, s);
  }

  // 1. Direct: a controller's own file gets all of its routes.
  for (const c of structure.controllers) {
    out.set(c.filePath, c.routes.slice());
  }

  // 2. Transitive: walk each controller's dependency graph and credit
  //    every file reachable through services it imports.
  for (const c of structure.controllers) {
    const visited = new Set<string>();
    const queue: string[] = [...c.dependencies];
    while (queue.length > 0) {
      const dep = queue.shift()!;
      if (visited.has(dep)) continue;
      visited.add(dep);
      const svc = servicesByName.get(dep);
      if (!svc) continue;
      // Credit the service's own file with the controller's routes.
      const existing = out.get(svc.filePath) ?? [];
      out.set(svc.filePath, mergeRoutes(existing, c.routes));
      for (const next of svc.dependencies ?? []) queue.push(next);
    }
  }

  // 3. Mark every other source file we saw imports for as having no
  //    routes (so `unreachable` becomes the natural label when nothing
  //    references it).
  for (const file of filesByImports.keys()) {
    if (!out.has(file)) out.set(file, []);
  }

  return out;
}

function mergeRoutes(into: RouteInfo[], add: RouteInfo[]): RouteInfo[] {
  const seen = new Set(into.map((r) => `${r.method}:${r.path}`));
  for (const r of add) {
    const k = `${r.method}:${r.path}`;
    if (!seen.has(k)) {
      into.push(r);
      seen.add(k);
    }
  }
  return into;
}

/** Strip query string / trailing slash so route-key matching is stable. */
function normalisePath(p: string): string {
  const noQuery = p.split('?')[0] ?? p;
  const trimmed = noQuery.replace(/\/+$/, '');
  return trimmed || '/';
}
