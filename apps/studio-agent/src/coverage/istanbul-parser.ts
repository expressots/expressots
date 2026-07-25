/**
 * Istanbul `coverage-final.json` parser.
 *
 * This is the canonical coverage input for the whole JS ecosystem:
 * Vitest (both the `v8` and `istanbul` providers), Jest, and
 * `nyc` / `c8` (which back Mocha and node:test) all emit this exact
 * shape. By normalising it here, "support four test frameworks" reduces
 * to "support one format".
 *
 * We intentionally do NOT depend on `istanbul-lib-coverage`. The data
 * model is small, stable, and fully documented; re-deriving the summary
 * ourselves keeps the agent dependency-free and trivially unit-testable.
 * The line-coverage derivation mirrors istanbul's own
 * `FileCoverage.getLineCoverage()` (max statement-hit per line).
 */

import type {
  CoverageMetrics,
  FileCoverage,
} from '../types/index.js';
import { metric } from './metrics.js';

interface Loc {
  start: { line: number; column?: number };
  end: { line: number; column?: number };
}

/** The subset of istanbul's per-file coverage object that we read. */
interface IstanbulFileCoverage {
  path: string;
  statementMap: Record<string, Loc>;
  fnMap: Record<string, { name?: string; decl?: Loc; loc?: Loc; line?: number }>;
  branchMap: Record<
    string,
    { loc?: Loc; type?: string; locations?: Loc[]; line?: number }
  >;
  s: Record<string, number>;
  f: Record<string, number>;
  b: Record<string, number[]>;
}

/** Raw Istanbul `coverage-final.json` contents, keyed by absolute file path. */
export type IstanbulCoverageData = Record<string, IstanbulFileCoverage>;

/**
 * Parse a raw `coverage-final.json` object into normalised
 * `FileCoverage[]`. `relPath` is left equal to the absolute `path`
 * here; the engine rewrites it relative to the project root (it owns
 * `cwd`). Throws nothing — malformed file entries are skipped.
 */
export function parseIstanbulCoverage(
  data: IstanbulCoverageData,
): FileCoverage[] {
  const out: FileCoverage[] = [];
  for (const key of Object.keys(data)) {
    const fc = data[key];
    if (!fc || typeof fc !== 'object' || !fc.statementMap) continue;
    out.push(parseFile(fc, fc.path || key));
  }
  return out;
}

function parseFile(fc: IstanbulFileCoverage, path: string): FileCoverage {
  const metrics = computeMetrics(fc);
  const { covered, uncovered } = computeLineSets(fc);
  return {
    path,
    relPath: path,
    metrics,
    coveredLines: covered,
    uncoveredLines: uncovered,
    partialBranchLines: computePartialBranchLines(fc),
  };
}

function computeMetrics(fc: IstanbulFileCoverage): CoverageMetrics {
  // Statements.
  const sKeys = Object.keys(fc.s ?? {});
  let sCovered = 0;
  for (const k of sKeys) if ((fc.s[k] ?? 0) > 0) sCovered++;

  // Functions.
  const fKeys = Object.keys(fc.f ?? {});
  let fCovered = 0;
  for (const k of fKeys) if ((fc.f[k] ?? 0) > 0) fCovered++;

  // Branches: total is the sum of every branch path across all branch
  // points; covered is how many of those paths were taken at least once.
  let bTotal = 0;
  let bCovered = 0;
  for (const k of Object.keys(fc.b ?? {})) {
    const paths = fc.b[k] ?? [];
    bTotal += paths.length;
    for (const hits of paths) if (hits > 0) bCovered++;
  }

  // Lines: derived from the statement map. A line's hit count is the max
  // hit count of any statement starting on it (istanbul's own rule).
  const lineMap = buildLineMap(fc);
  const lineNums = Object.keys(lineMap);
  let lCovered = 0;
  for (const ln of lineNums) if (lineMap[Number(ln)] > 0) lCovered++;

  return {
    statements: metric(sCovered, sKeys.length),
    functions: metric(fCovered, fKeys.length),
    branches: metric(bCovered, bTotal),
    lines: metric(lCovered, lineNums.length),
  };
}

/** Map of `line number → max statement hit count on that line`. */
function buildLineMap(fc: IstanbulFileCoverage): Record<number, number> {
  const lineMap: Record<number, number> = {};
  for (const k of Object.keys(fc.s ?? {})) {
    const stmt = fc.statementMap[k];
    if (!stmt || !stmt.start) continue;
    const line = stmt.start.line;
    const count = fc.s[k] ?? 0;
    const prev = lineMap[line];
    if (prev === undefined || prev < count) lineMap[line] = count;
  }
  return lineMap;
}

function computeLineSets(fc: IstanbulFileCoverage): {
  covered: number[];
  uncovered: number[];
} {
  const lineMap = buildLineMap(fc);
  const covered: number[] = [];
  const uncovered: number[] = [];
  for (const ln of Object.keys(lineMap)) {
    const n = Number(ln);
    if (lineMap[n] > 0) covered.push(n);
    else uncovered.push(n);
  }
  covered.sort((a, b) => a - b);
  uncovered.sort((a, b) => a - b);
  return { covered, uncovered };
}

/**
 * Lines where a branch point has at least one taken and one untaken
 * path. These render as the yellow "partial" gutter in the UI.
 */
function computePartialBranchLines(fc: IstanbulFileCoverage): number[] {
  const lines = new Set<number>();
  for (const k of Object.keys(fc.b ?? {})) {
    const paths = fc.b[k] ?? [];
    if (paths.length < 2) continue;
    const taken = paths.filter((h) => h > 0).length;
    const isPartial = taken > 0 && taken < paths.length;
    if (!isPartial) continue;
    const line = branchLine(fc.branchMap?.[k]);
    if (line) lines.add(line);
  }
  return [...lines].sort((a, b) => a - b);
}

function branchLine(
  b: IstanbulFileCoverage['branchMap'][string] | undefined,
): number | null {
  if (!b) return null;
  if (typeof b.line === 'number') return b.line;
  if (b.loc?.start?.line) return b.loc.start.line;
  if (b.locations && b.locations[0]?.start?.line) {
    return b.locations[0].start.line;
  }
  return null;
}
