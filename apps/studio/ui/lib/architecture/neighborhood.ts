import type { AppStructure } from '../../types';
import { buildAdjacency } from '../architecture-layout';
import type { NodeWarnings } from './types';

export interface NeighborhoodNode {
  name: string;
  kind: 'controller' | 'service' | 'provider' | 'middleware';
  direction: 'focus' | 'upstream' | 'downstream';
  hop: number;
  filePath?: string;
}

export interface NeighborhoodEdge {
  source: string;
  target: string;
  type?: string;
}

export interface NeighborhoodResult {
  nodes: NeighborhoodNode[];
  edges: NeighborhoodEdge[];
  upstream: string[];
  downstream: string[];
  truncated: boolean;
}

const MAX_NODES = 40;
const MAX_EDGES = 80;

export function buildNeighborhood(
  focusNodeId: string,
  structure: AppStructure,
  hops: number = 2,
  options?: { warningFilter?: 'cycle' | 'orphan' | 'hub'; warnings?: Map<string, NodeWarnings> },
): NeighborhoodResult {
  const focusName = focusNodeId.replace(/^(controller|service|provider|middleware)-/, '');

  const kindMap = new Map<string, NeighborhoodNode['kind']>();
  const fileMap = new Map<string, string>();
  for (const c of structure.controllers) {
    kindMap.set(c.name, 'controller');
    fileMap.set(c.name, c.filePath);
  }
  for (const s of structure.services) {
    kindMap.set(s.name, 'service');
    fileMap.set(s.name, s.filePath);
  }
  for (const p of structure.providers) {
    kindMap.set(p.name, 'provider');
    fileMap.set(p.name, p.filePath);
  }
  for (const m of structure.middleware) {
    kindMap.set(m.name, 'middleware');
    if (m.filePath) fileMap.set(m.name, m.filePath);
  }

  if (!kindMap.has(focusName)) {
    return { nodes: [], edges: [], upstream: [], downstream: [], truncated: false };
  }

  const entries = Array.from(kindMap.entries()).map(([name, kind]) => ({ name, kind }));
  const deps = structure.dependencies.map((d) => ({ source: d.source, target: d.target }));
  const { outgoing, incoming } = buildAdjacency(entries, deps);

  const upstream = new Set<string>();
  const downstream = new Set<string>();
  const hopMap = new Map<string, number>();
  hopMap.set(focusName, 0);

  const totalCount = () => upstream.size + downstream.size + 1;

  // BFS downstream (outgoing).
  {
    const queue: Array<{ name: string; hop: number }> = [{ name: focusName, hop: 0 }];
    while (queue.length > 0) {
      if (totalCount() >= MAX_NODES) break;
      const { name, hop } = queue.shift()!;
      if (hop >= hops) continue;
      for (const next of outgoing.get(name) ?? []) {
        if (totalCount() >= MAX_NODES) break;
        if (next === focusName) continue;
        if (!downstream.has(next)) {
          downstream.add(next);
          const nextHop = hop + 1;
          if (!hopMap.has(next) || hopMap.get(next)! > nextHop) hopMap.set(next, nextHop);
          queue.push({ name: next, hop: nextHop });
        }
      }
    }
  }

  // BFS upstream (incoming).
  {
    const queue: Array<{ name: string; hop: number }> = [{ name: focusName, hop: 0 }];
    while (queue.length > 0) {
      if (totalCount() >= MAX_NODES) break;
      const { name, hop } = queue.shift()!;
      if (hop >= hops) continue;
      for (const next of incoming.get(name) ?? []) {
        if (totalCount() >= MAX_NODES) break;
        if (next === focusName) continue;
        if (!upstream.has(next)) {
          upstream.add(next);
          const nextHop = hop + 1;
          if (!hopMap.has(next) || hopMap.get(next)! > nextHop) hopMap.set(next, nextHop);
          queue.push({ name: next, hop: nextHop });
        }
      }
    }
  }

  const allNames = new Set([focusName, ...upstream, ...downstream]);

  // Optional warning filter: only keep nodes that match the filter.
  if (options?.warningFilter && options.warnings) {
    const { warningFilter, warnings } = options;
    const filtered = new Set<string>();
    filtered.add(focusName);
    for (const name of allNames) {
      const w = warnings.get(name);
      if (!w) continue;
      if (warningFilter === 'cycle' && w.cycle) filtered.add(name);
      if (warningFilter === 'orphan' && w.orphan) filtered.add(name);
      if (warningFilter === 'hub' && w.fanIn) filtered.add(name);
    }
    for (const name of [...allNames]) {
      if (!filtered.has(name)) {
        allNames.delete(name);
        upstream.delete(name);
        downstream.delete(name);
      }
    }
  }

  const truncated = upstream.size + downstream.size + 1 >= MAX_NODES;

  const nodes: NeighborhoodNode[] = [];
  for (const name of allNames) {
    const kind = kindMap.get(name);
    if (!kind) continue;
    let direction: NeighborhoodNode['direction'];
    if (name === focusName) direction = 'focus';
    else if (upstream.has(name)) direction = 'upstream';
    else direction = 'downstream';

    nodes.push({
      name,
      kind,
      direction,
      hop: hopMap.get(name) ?? 0,
      filePath: fileMap.get(name),
    });
  }

  const edges: NeighborhoodEdge[] = [];
  for (const dep of structure.dependencies) {
    if (edges.length >= MAX_EDGES) break;
    if (allNames.has(dep.source) && allNames.has(dep.target)) {
      edges.push({ source: dep.source, target: dep.target, type: dep.type });
    }
  }

  return {
    nodes,
    edges,
    upstream: [...upstream],
    downstream: [...downstream],
    truncated,
  };
}
