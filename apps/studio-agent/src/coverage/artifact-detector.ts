/**
 * Locate the freshest coverage artifact a test run produced.
 *
 * We search a small set of conventional locations and pick the most
 * recently modified existing file, tie-breaking towards Istanbul JSON
 * (it carries richer per-statement/branch detail than LCOV). Callers can
 * override the search list via `customPaths` (project config).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/** Coverage artifact formats the detector recognises. */
export type ArtifactKind = 'istanbul' | 'lcov';

/** A coverage artifact found on disk, with its format and mtime. */
export interface DetectedArtifact {
  kind: ArtifactKind;
  /** Absolute path to the artifact file. */
  path: string;
  /** Last-modified time (ms epoch) — drives "freshest wins". */
  mtimeMs: number;
}

/** Default search order, relative to the project root. */
const DEFAULT_CANDIDATES: Array<{ rel: string; kind: ArtifactKind }> = [
  { rel: 'coverage/coverage-final.json', kind: 'istanbul' },
  { rel: 'coverage/lcov.info', kind: 'lcov' },
  { rel: 'coverage/lcov/lcov.info', kind: 'lcov' },
  { rel: 'coverage-final.json', kind: 'istanbul' },
  { rel: 'lcov.info', kind: 'lcov' },
];

/**
 * Return the best coverage artifact under `cwd`, or `null` when none
 * exist. `customPaths` (project-root-relative) take precedence and are
 * searched first; their kind is inferred from the file extension.
 */
export function detectCoverageArtifact(
  cwd: string,
  customPaths?: string[],
): DetectedArtifact | null {
  const candidates = [
    ...(customPaths ?? []).map((rel) => ({ rel, kind: kindFromPath(rel) })),
    ...DEFAULT_CANDIDATES,
  ];

  let best: DetectedArtifact | null = null;
  for (const { rel, kind } of candidates) {
    const abs = path.resolve(cwd, rel);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(abs);
    } catch {
      continue;
    }
    if (!stat.isFile()) continue;

    if (
      !best ||
      stat.mtimeMs > best.mtimeMs ||
      // Same mtime: prefer Istanbul for its richer detail.
      (stat.mtimeMs === best.mtimeMs && kind === 'istanbul' && best.kind === 'lcov')
    ) {
      best = { kind, path: abs, mtimeMs: stat.mtimeMs };
    }
  }
  return best;
}

function kindFromPath(rel: string): ArtifactKind {
  return rel.toLowerCase().endsWith('.json') ? 'istanbul' : 'lcov';
}
