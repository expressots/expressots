import type { AppStructure } from '../../types';
import type { NodeWarnings } from './types';
import { FAN_IN_WARN } from './types';

export function buildWarnings(structure: AppStructure): Map<string, NodeWarnings> {
  const out = new Map<string, NodeWarnings>();

  const allNames = new Set<string>([
    ...structure.controllers.map((c) => c.name),
    ...structure.services.map((s) => s.name),
    ...structure.providers.map((p) => p.name),
    ...structure.middleware.map((m) => m.name),
  ]);

  const outgoing = new Map<string, Set<string>>();
  const inDeg = new Map<string, number>();
  for (const name of allNames) {
    outgoing.set(name, new Set());
    inDeg.set(name, 0);
  }
  for (const dep of structure.dependencies) {
    if (!allNames.has(dep.source) || !allNames.has(dep.target)) continue;
    if (!outgoing.get(dep.source)!.has(dep.target)) {
      outgoing.get(dep.source)!.add(dep.target);
      inDeg.set(dep.target, (inDeg.get(dep.target) ?? 0) + 1);
    }
  }

  // Cycle detection via DFS coloring.
  const color = new Map<string, 0 | 1 | 2>();
  const cycleSet = new Set<string>();
  const stack: string[] = [];
  function dfs(node: string) {
    color.set(node, 1);
    stack.push(node);
    for (const next of outgoing.get(node) ?? []) {
      const c = color.get(next) ?? 0;
      if (c === 0) dfs(next);
      else if (c === 1) {
        const startIdx = stack.indexOf(next);
        if (startIdx >= 0) {
          for (let i = startIdx; i < stack.length; i++) cycleSet.add(stack[i]);
        }
      }
    }
    stack.pop();
    color.set(node, 2);
  }
  for (const name of allNames) if ((color.get(name) ?? 0) === 0) dfs(name);

  const controllerSet = new Set(structure.controllers.map((c) => c.name));
  const middlewareSet = new Set(structure.middleware.map((m) => m.name));
  for (const name of allNames) {
    const w: NodeWarnings = {};
    if (cycleSet.has(name)) w.cycle = true;
    if (
      !controllerSet.has(name) &&
      !middlewareSet.has(name) &&
      (inDeg.get(name) ?? 0) === 0
    ) {
      w.orphan = true;
    }
    const fan = inDeg.get(name) ?? 0;
    if (fan >= FAN_IN_WARN) w.fanIn = fan;
    if (Object.keys(w).length > 0) out.set(name, w);
  }
  return out;
}

export function summariseWarnings(warnings: Map<string, NodeWarnings>): string {
  let cycles = 0;
  let orphans = 0;
  let fanIn = 0;
  for (const w of warnings.values()) {
    if (w.cycle) cycles++;
    if (w.orphan) orphans++;
    if (w.fanIn) fanIn++;
  }
  const parts: string[] = [];
  if (cycles) parts.push(`${cycles} cycle`);
  if (orphans) parts.push(`${orphans} orphan${orphans === 1 ? '' : 's'}`);
  if (fanIn) parts.push(`${fanIn} hub`);
  return parts.join(' \u00b7 ');
}
