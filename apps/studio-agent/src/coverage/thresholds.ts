/**
 * Coverage threshold gates.
 *
 * Thresholds come from coverage config (`.studio/coverage.json` or
 * `AgentConfig.coverage.thresholds`), with one shortcut:
 *
 *   `EXPRESSOTS_STUDIO_COVERAGE_THRESHOLD` env var — a single number
 *   applied to all four dimensions (quick CI-style gate), which wins
 *   over config when set.
 *
 * When neither is present, gates are simply absent and the UI shows no
 * pass/fail chip (rather than a misleading "passing").
 */

import type { CoverageMetrics } from '../types/index.js';

/** Minimum percentage gates per coverage dimension (0-100). */
export interface CoverageThresholds {
  lines?: number;
  branches?: number;
  functions?: number;
  statements?: number;
}

/** Configured thresholds plus whether the current totals meet them all. */
export type ThresholdResult = CoverageThresholds & { passed?: boolean };

/**
 * Resolve effective thresholds from config + the env shortcut, or `null`
 * when none are configured.
 */
export function resolveThresholds(
  configured: CoverageThresholds | undefined,
): CoverageThresholds | null {
  const envRaw = process.env.EXPRESSOTS_STUDIO_COVERAGE_THRESHOLD;
  if (envRaw && envRaw.trim()) {
    const n = Number(envRaw.trim());
    if (Number.isFinite(n)) {
      return { lines: n, branches: n, functions: n, statements: n };
    }
  }

  if (configured) {
    const out: CoverageThresholds = {};
    for (const key of ['lines', 'branches', 'functions', 'statements'] as const) {
      const v = configured[key];
      if (typeof v === 'number' && Number.isFinite(v)) out[key] = v;
    }
    if (Object.keys(out).length > 0) return out;
  }
  return null;
}

/** Evaluate `totals` against `thresholds`; `passed` is true iff all meet. */
export function evaluateThresholds(
  totals: CoverageMetrics,
  thresholds: CoverageThresholds,
): ThresholdResult {
  let passed = true;
  for (const key of ['lines', 'branches', 'functions', 'statements'] as const) {
    const min = thresholds[key];
    if (typeof min === 'number' && totals[key].pct < min) passed = false;
  }
  return { ...thresholds, passed };
}
