/**
 * Load coverage configuration from `.studio/coverage.json`.
 *
 * This is the file-based half of coverage config (the other half is
 * `AgentConfig.coverage`, supplied programmatically). Auto-detection is
 * always the default; this file lets a developer pin the runner, point
 * at a custom command, relocate artifacts, set the diff base, or define
 * threshold gates — which is what makes monorepos and multi-runner repos
 * deterministic instead of a heuristic guess.
 *
 * Everything is best-effort and defensively validated: a missing or
 * malformed file resolves to an empty config, never a throw.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { CoverageConfig } from '../types/index.js';

/** Resolve the config file path from the agent's `dbPath` directory. */
export function coverageConfigPath(dbPath: string): string {
  return path.join(path.dirname(dbPath) || '.studio', 'coverage.json');
}

/** Load + validate `.studio/coverage.json`, or `{}` when absent/invalid. */
export function loadCoverageConfig(dbPath: string): CoverageConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(coverageConfigPath(dbPath), 'utf-8'));
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== 'object') return {};

  const raw = parsed as Record<string, unknown>;
  const out: CoverageConfig = {};

  if (typeof raw.runner === 'string') out.runner = raw.runner;
  if (typeof raw.command === 'string') out.command = raw.command;
  if (typeof raw.diffBase === 'string') out.diffBase = raw.diffBase;
  if (Array.isArray(raw.paths)) {
    const paths = raw.paths.filter((p): p is string => typeof p === 'string');
    if (paths.length > 0) out.paths = paths;
  }

  const t = raw.thresholds;
  if (t && typeof t === 'object') {
    const tr = t as Record<string, unknown>;
    const thresholds: NonNullable<CoverageConfig['thresholds']> = {};
    for (const key of ['lines', 'branches', 'functions', 'statements'] as const) {
      const v = tr[key];
      if (typeof v === 'number' && Number.isFinite(v)) thresholds[key] = v;
    }
    if (Object.keys(thresholds).length > 0) out.thresholds = thresholds;
  }

  return out;
}

/**
 * Merge programmatic config over file config (programmatic wins), with a
 * deep merge for the nested `thresholds` object.
 */
export function mergeCoverageConfig(
  file: CoverageConfig,
  programmatic: CoverageConfig | undefined,
): CoverageConfig {
  if (!programmatic) return file;
  return {
    ...file,
    ...programmatic,
    thresholds:
      file.thresholds || programmatic.thresholds
        ? { ...file.thresholds, ...programmatic.thresholds }
        : undefined,
  };
}
