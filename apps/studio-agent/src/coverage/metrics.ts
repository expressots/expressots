/**
 * Small, dependency-free helpers for the four-dimensional coverage
 * model (statements / branches / functions / lines). Kept pure so both
 * the Istanbul and LCOV parsers, the tree builder, and the engine share
 * one definition of "how a percentage is computed".
 */

import type { CoverageMetric, CoverageMetrics } from '../types/index.js';

/** Round to two decimals without floating-point noise (e.g. 66.666… → 66.67). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Coverage percentage for a (covered, total) pair. An empty unit set is
 * 100% by convention — this matches Istanbul's own summary behaviour and
 * avoids penalising files that legitimately have, say, zero branches.
 */
export function pctOf(covered: number, total: number): number {
  if (total <= 0) return 100;
  return round2((covered / total) * 100);
}

/** Build a `CoverageMetric` from raw counts. */
export function metric(covered: number, total: number): CoverageMetric {
  return { covered, total, pct: pctOf(covered, total) };
}

/** A zeroed-out metrics object (an empty file/dir reads as 100%). */
export function emptyMetrics(): CoverageMetrics {
  return {
    statements: metric(0, 0),
    branches: metric(0, 0),
    functions: metric(0, 0),
    lines: metric(0, 0),
  };
}

/** Sum two `CoverageMetric`s (used to roll files up into folders). */
function addMetric(a: CoverageMetric, b: CoverageMetric): CoverageMetric {
  return metric(a.covered + b.covered, a.total + b.total);
}

/** Combine a list of metrics into one aggregate (each dimension summed). */
export function combineMetrics(parts: CoverageMetrics[]): CoverageMetrics {
  const out = emptyMetrics();
  for (const p of parts) {
    out.statements = addMetric(out.statements, p.statements);
    out.branches = addMetric(out.branches, p.branches);
    out.functions = addMetric(out.functions, p.functions);
    out.lines = addMetric(out.lines, p.lines);
  }
  return out;
}
