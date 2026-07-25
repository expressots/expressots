/**
 * Coverage history — a tiny append-only store of per-run totals, used
 * to draw the trend sparkline and survive Studio restarts.
 *
 * We deliberately use a small JSON file in the `.studio` directory
 * rather than a SQLite table: the data is a capped list of plain numbers
 * the UI charts directly, so a dependency-free JSON file is simplest and
 * easy to inspect.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { CoverageHistoryPoint, CoverageMetrics } from '../types/index.js';

/** Keep the trend readable and the file tiny. */
const MAX_POINTS = 100;
const FILE_NAME = 'coverage-history.json';

/**
 * Append-only store of per-run coverage totals, persisted as a small
 * JSON file next to the agent database. Capped at 100 points; feeds
 * the trend sparkline in the Studio Coverage view.
 */
export class CoverageHistory {
  private readonly file: string;
  private points: CoverageHistoryPoint[] = [];
  private loaded = false;

  /** `dbPath` is the agent's `.studio/studio.db`; we sit next to it. */
  constructor(dbPath: string) {
    this.file = path.join(path.dirname(dbPath) || '.studio', FILE_NAME);
  }

  /** Load persisted points (best-effort; corrupt files reset to empty). */
  load(): CoverageHistoryPoint[] {
    if (this.loaded) return this.points;
    this.loaded = true;
    try {
      const raw = fs.readFileSync(this.file, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this.points = parsed.filter(isPoint).slice(-MAX_POINTS);
      }
    } catch {
      this.points = [];
    }
    return this.points;
  }

  /** Current points (oldest → newest), loading on first access. */
  list(): CoverageHistoryPoint[] {
    return this.load();
  }

  /**
   * Append a point for `totals` if it meaningfully differs from the last
   * one (avoids flooding the trend on every filesystem touch). Persisted
   * best-effort; a write failure is non-fatal. Returns the updated list.
   */
  append(totals: CoverageMetrics, at: number = Date.now()): CoverageHistoryPoint[] {
    this.load();
    const point: CoverageHistoryPoint = {
      at,
      lines: totals.lines.pct,
      branches: totals.branches.pct,
      statements: totals.statements.pct,
      functions: totals.functions.pct,
    };

    const last = this.points[this.points.length - 1];
    if (last && samePct(last, point)) return this.points;

    this.points.push(point);
    if (this.points.length > MAX_POINTS) {
      this.points = this.points.slice(-MAX_POINTS);
    }
    this.persist();
    return this.points;
  }

  private persist(): void {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify(this.points), 'utf-8');
    } catch {
      // Best-effort: trends are a nicety, not worth crashing over.
    }
  }
}

function samePct(a: CoverageHistoryPoint, b: CoverageHistoryPoint): boolean {
  return (
    a.lines === b.lines &&
    a.branches === b.branches &&
    a.statements === b.statements &&
    a.functions === b.functions
  );
}

function isPoint(v: unknown): v is CoverageHistoryPoint {
  if (!v || typeof v !== 'object') return false;
  const p = v as Record<string, unknown>;
  return (
    typeof p.at === 'number' &&
    typeof p.lines === 'number' &&
    typeof p.branches === 'number' &&
    typeof p.statements === 'number' &&
    typeof p.functions === 'number'
  );
}
