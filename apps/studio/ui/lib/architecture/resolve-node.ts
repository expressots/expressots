import type { AppStructure, RouteInfo } from '../../types';
import type { NodeStats, NodeWarnings, SelectedNode } from './types';

export function stripPrefix(nodeId: string): string {
  return nodeId.replace(/^(controller|service|provider|middleware|module)-/, '');
}

export function resolveSelectedNode(
  nodeId: string,
  structure: AppStructure,
  routes: RouteInfo[],
  stats?: NodeStats,
  warnings?: NodeWarnings,
): SelectedNode | null {
  if (nodeId.startsWith('controller-')) {
    const name = nodeId.slice('controller-'.length);
    const c = structure.controllers.find((x) => x.name === name);
    if (!c) return null;
    return {
      kind: 'controller',
      name,
      filePath: c.filePath,
      routes: routes.filter((r) => r.controller === name),
      methods: [],
      dependencies: c.dependencies,
      stats,
      warnings,
    };
  }
  if (nodeId.startsWith('service-')) {
    const name = nodeId.slice('service-'.length);
    const s = structure.services.find((x) => x.name === name);
    if (!s) return null;
    return {
      kind: 'service',
      name,
      filePath: s.filePath,
      routes: [],
      methods: s.methods,
      dependencies: s.dependencies,
      stats,
      warnings,
    };
  }
  if (nodeId.startsWith('provider-')) {
    const name = nodeId.slice('provider-'.length);
    const p = structure.providers.find((x) => x.name === name);
    if (!p) return null;
    return {
      kind: 'provider',
      name,
      filePath: p.filePath,
      routes: [],
      methods: p.methods,
      dependencies: p.dependencies,
      stats,
      warnings,
    };
  }
  if (nodeId.startsWith('middleware-')) {
    const name = nodeId.slice('middleware-'.length);
    const m = structure.middleware.find((x) => x.name === name);
    if (!m) return null;
    return {
      kind: 'middleware',
      name,
      filePath: m.filePath || undefined,
      routes: [],
      methods: m.methods,
      dependencies: m.dependencies,
      stats,
      warnings,
      middlewareScope: m.scope,
    };
  }
  return null;
}
