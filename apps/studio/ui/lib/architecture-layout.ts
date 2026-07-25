/**
 * Layered-layout depth assignment for the Architecture Map.
 *
 * Extracted from `ArchitectureMap.tsx` so the layout algorithm — the
 * part most exposed to pathological input (cyclic DI graphs, self-edges
 * from interface→implementation resolution) — can be unit-tested
 * without React or the heavy React Flow runtime.
 */

export type LayoutNodeKind = 'controller' | 'service' | 'provider' | 'middleware';

export interface LayoutEntry {
  name: string;
  kind: LayoutNodeKind;
}

export interface LayoutDependency {
  source: string;
  target: string;
}

export interface LayoutAdjacency {
  outgoing: Map<string, string[]>;
  incoming: Map<string, string[]>;
}

/**
 * Build deduped adjacency lists over the entries' name space. Edges
 * whose endpoints aren't known nodes are dropped (they can't be laid
 * out), and parallel duplicate edges are collapsed.
 */
export function buildAdjacency(
  entries: LayoutEntry[],
  dependencies: LayoutDependency[],
): LayoutAdjacency {
  const known = new Set(entries.map((e) => e.name));
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  for (const entry of entries) {
    outgoing.set(entry.name, []);
    incoming.set(entry.name, []);
  }
  const seen = new Set<string>();
  for (const dep of dependencies) {
    if (!known.has(dep.source) || !known.has(dep.target)) continue;
    const key = `${dep.source}->${dep.target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    outgoing.get(dep.source)!.push(dep.target);
    incoming.get(dep.target)!.push(dep.source);
  }
  return { outgoing, incoming };
}

/**
 * Assign a layer depth to every node for the LR/TB layered layout.
 *
 * Depth is relaxed longest-path style so a dependent always sits to the
 * right of (LR) / below (TB) its dependencies. Seeding rules:
 *   - middleware pins to depth 0 (leftmost column)
 *   - controllers seed at depth 1 so the flow reads middleware →
 *     controller → service → provider
 *   - any remaining source with no incoming edge seeds at depth 0
 *   - if nothing seeded (e.g. a fully cyclic graph), fall back to
 *     seeding controllers at depth 0
 *
 * Termination guarantee: a DAG's longest simple path visits at most
 * every node once, so no legitimate depth can exceed the node count.
 * Capping the relaxation at `entries.length` therefore never distorts a
 * valid layout, while guaranteeing the loop halts when the graph
 * contains a cycle or a self-edge (which would otherwise climb the
 * depth forever and freeze the tab).
 */
export function assignNodeDepths(
  entries: LayoutEntry[],
  dependencies: LayoutDependency[],
): Map<string, number> {
  const { outgoing, incoming } = buildAdjacency(entries, dependencies);

  const depth = new Map<string, number>();
  const queue: string[] = [];

  for (const entry of entries) {
    if (entry.kind === 'middleware') {
      depth.set(entry.name, 0);
      queue.push(entry.name);
    }
  }
  for (const entry of entries) {
    if (entry.kind === 'controller' && !depth.has(entry.name)) {
      depth.set(entry.name, 1);
      queue.push(entry.name);
    }
  }
  for (const entry of entries) {
    if ((incoming.get(entry.name) ?? []).length === 0 && !depth.has(entry.name)) {
      depth.set(entry.name, 0);
      queue.push(entry.name);
    }
  }
  if (queue.length === 0) {
    for (const entry of entries) {
      if (entry.kind === 'controller') {
        depth.set(entry.name, 0);
        queue.push(entry.name);
      }
    }
  }

  // Cap depth at |V| so cyclic DI graphs cannot spin forever re-queuing
  // nodes with ever-increasing depths (which freezes the tab).
  const maxLayoutDepth = entries.length;
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const curDepth = depth.get(cur) ?? 0;
    for (const next of outgoing.get(cur) ?? []) {
      const proposed = curDepth + 1;
      if (proposed > maxLayoutDepth) continue;
      if ((depth.get(next) ?? -1) < proposed) {
        depth.set(next, proposed);
        queue.push(next);
      }
    }
  }

  // Anything still unplaced (unreachable from a seed) lands one layer
  // past the deepest positioned node.
  const maxDepth = Math.max(0, ...Array.from(depth.values()));
  for (const entry of entries) {
    if (!depth.has(entry.name)) depth.set(entry.name, maxDepth + 1);
  }

  return depth;
}
