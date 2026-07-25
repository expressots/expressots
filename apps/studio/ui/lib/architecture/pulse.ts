import type { RouteInfo, RecordedExchange } from '../../types';
import { routeMatchScore } from './stats';

export function computePulsePath(
  exchange: RecordedExchange,
  routes: RouteInfo[],
  resolved: string[],
): { nodeIds: Set<string>; edgeIds: Set<string> } {
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();

  const matched =
    routes.find((r) => r.method === exchange.request.method && r.path === exchange.request.path) ??
    routes
      .filter((r) => r.method === exchange.request.method)
      .map((r) => ({ r, score: routeMatchScore(r.path, exchange.request.path) }))
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score)[0]?.r;
  if (matched) nodeIds.add(`controller-${matched.controller}`);

  for (const id of resolved) {
    const name = id.replace(/^Symbol\(([^)]+)\)$/, '$1').trim();
    nodeIds.add(`service-${name}`);
    nodeIds.add(`provider-${name}`);
  }

  return { nodeIds, edgeIds };
}
