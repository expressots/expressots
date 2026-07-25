import type { RouteInfo, RecordedExchange } from '../../types';
import type { NodeStats } from './types';

export function routeMatchScore(routePath: string, requestPath: string): number {
  const rSegs = routePath.split('/').filter(Boolean);
  const pSegs = requestPath.split('/').filter(Boolean);
  if (rSegs.length !== pSegs.length) return 0;
  let score = 0;
  for (let i = 0; i < rSegs.length; i++) {
    const r = rSegs[i];
    const p = pSegs[i];
    if (r.startsWith(':') || r === '*') score += 1;
    else if (r === p) score += 2;
    else return 0;
  }
  return score;
}

export function buildNodeStats(
  routes: RouteInfo[],
  exchanges: RecordedExchange[],
): Map<string, NodeStats> {
  const out = new Map<string, NodeStats>();
  if (exchanges.length === 0) return out;

  const buckets = new Map<string, { durations: number[]; errors: number }>();
  for (const ex of exchanges) {
    const matched =
      routes.find((r) => r.method === ex.request.method && r.path === ex.request.path) ??
      routes
        .filter((r) => r.method === ex.request.method)
        .map((r) => ({ r, score: routeMatchScore(r.path, ex.request.path) }))
        .filter((m) => m.score > 0)
        .sort((a, b) => b.score - a.score)[0]?.r;
    if (!matched) continue;
    const b = buckets.get(matched.controller) ?? { durations: [], errors: 0 };
    b.durations.push(ex.response.duration);
    if (ex.response.statusCode >= 400) b.errors++;
    buckets.set(matched.controller, b);
  }

  for (const [name, b] of buckets) {
    const sorted = [...b.durations].sort((a, b2) => a - b2);
    const p95Index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
    const avg = sorted.reduce((s, d) => s + d, 0) / sorted.length;
    out.set(name, {
      req: sorted.length,
      errors: b.errors,
      avgMs: avg,
      p95Ms: sorted[p95Index] ?? avg,
    });
  }
  return out;
}
