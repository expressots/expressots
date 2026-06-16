/**
 * LCOV (`lcov.info`) parser — the universal coverage fallback.
 *
 * Every runner can emit LCOV, so this is what we fall back to when no
 * `coverage-final.json` is present (notably node:test's
 * `--test-coverage-lcov`). LCOV has no concept of "statements", so we
 * mirror the line metric into the statement slot to keep the UI's
 * four-card layout populated.
 *
 * Record reference (the subset we use):
 *   SF:<path>                       start of a file section
 *   DA:<line>,<hits>                line execution count
 *   FN:<line>,<name> / FNDA:<hits>,<name>   function hit counts
 *   BRDA:<line>,<block>,<branch>,<taken>    branch hit ('-' = not reached)
 *   end_of_record                   end of the file section
 */

import type { CoverageMetrics, FileCoverage } from '../types/index.js';
import { metric } from './metrics.js';

interface FileAccumulator {
  path: string;
  lineHits: Map<number, number>;
  fnHits: number[];
  /** Per branch line: list of taken counts (-1 encodes the `-` "not reached"). */
  branchByLine: Map<number, number[]>;
}

/** Parse LCOV text into normalised `FileCoverage[]`. */
export function parseLcov(text: string): FileCoverage[] {
  const files: FileCoverage[] = [];
  let acc: FileAccumulator | null = null;

  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (line.length === 0) continue;

    if (line.startsWith('SF:')) {
      acc = {
        path: line.slice(3).trim(),
        lineHits: new Map(),
        fnHits: [],
        branchByLine: new Map(),
      };
      continue;
    }
    if (!acc) continue;

    if (line === 'end_of_record') {
      files.push(finalizeFile(acc));
      acc = null;
      continue;
    }

    if (line.startsWith('DA:')) {
      const [lnStr, hitsStr] = line.slice(3).split(',');
      const ln = Number(lnStr);
      const hits = Number(hitsStr);
      if (Number.isFinite(ln)) {
        // A line can appear more than once; keep the max hit count.
        const prev = acc.lineHits.get(ln) ?? 0;
        acc.lineHits.set(ln, Math.max(prev, Number.isFinite(hits) ? hits : 0));
      }
      continue;
    }

    if (line.startsWith('FNDA:')) {
      const [hitsStr] = line.slice(5).split(',');
      const hits = Number(hitsStr);
      acc.fnHits.push(Number.isFinite(hits) ? hits : 0);
      continue;
    }

    if (line.startsWith('BRDA:')) {
      const parts = line.slice(5).split(',');
      const ln = Number(parts[0]);
      const takenStr = parts[3];
      const taken = takenStr === '-' ? -1 : Number(takenStr);
      if (Number.isFinite(ln)) {
        const arr = acc.branchByLine.get(ln) ?? [];
        arr.push(Number.isFinite(taken) ? taken : -1);
        acc.branchByLine.set(ln, arr);
      }
      continue;
    }
  }

  // Tolerate a missing trailing `end_of_record`.
  if (acc) files.push(finalizeFile(acc));

  return files;
}

function finalizeFile(acc: FileAccumulator): FileCoverage {
  // Lines.
  let lCovered = 0;
  const coveredLines: number[] = [];
  const uncoveredLines: number[] = [];
  for (const [ln, hits] of acc.lineHits) {
    if (hits > 0) {
      lCovered++;
      coveredLines.push(ln);
    } else {
      uncoveredLines.push(ln);
    }
  }
  const lTotal = acc.lineHits.size;

  // Functions.
  const fTotal = acc.fnHits.length;
  let fCovered = 0;
  for (const h of acc.fnHits) if (h > 0) fCovered++;

  // Branches (`-` counts as an untaken path).
  let bTotal = 0;
  let bCovered = 0;
  const partialBranchLines: number[] = [];
  for (const [ln, paths] of acc.branchByLine) {
    bTotal += paths.length;
    const taken = paths.filter((t) => t > 0).length;
    bCovered += taken;
    if (paths.length >= 2 && taken > 0 && taken < paths.length) {
      partialBranchLines.push(ln);
    }
  }

  const lineMetric = metric(lCovered, lTotal);
  const metrics: CoverageMetrics = {
    // LCOV has no statement granularity; mirror the line metric so the
    // UI's four-card layout stays populated and self-consistent.
    statements: lineMetric,
    lines: lineMetric,
    functions: metric(fCovered, fTotal),
    branches: metric(bCovered, bTotal),
  };

  return {
    path: acc.path,
    relPath: acc.path,
    metrics,
    coveredLines: coveredLines.sort((a, b) => a - b),
    uncoveredLines: uncoveredLines.sort((a, b) => a - b),
    partialBranchLines: partialBranchLines.sort((a, b) => a - b),
  };
}
