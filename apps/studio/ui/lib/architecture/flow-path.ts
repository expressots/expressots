import type { AppStructure, RouteInfo } from '../../types';

export type FlowStepKind = 'http' | 'middleware' | 'controller' | 'service' | 'provider';

export interface FlowStep {
  kind: FlowStepKind;
  name: string;
  filePath?: string;
  controllerMethod?: string;
  resolved?: boolean;
  middlewareScope?: 'global' | 'controller' | 'route' | 'unknown';
}

export interface FlowPathResult {
  steps: FlowStep[];
  truncated: boolean;
  hiddenCount: number;
}

const MAX_FLOW_STEPS = 30;

export function buildRequestFlowPath(
  route: RouteInfo,
  structure: AppStructure,
  resolvedIds?: string[],
): FlowPathResult {
  const resolvedSet = new Set(
    (resolvedIds ?? []).map((id) => id.replace(/^Symbol\(([^)]+)\)$/, '$1').trim()),
  );

  const steps: FlowStep[] = [];

  steps.push({ kind: 'http', name: `${route.method} ${route.path}` });

  // Global middleware first.
  for (const mw of structure.middleware) {
    if (mw.scope === 'global') {
      steps.push({
        kind: 'middleware',
        name: mw.name,
        filePath: mw.filePath || undefined,
        resolved: resolvedSet.has(mw.name),
        middlewareScope: 'global',
      });
    }
  }

  // Route-specific middleware (from RouteInfo.middleware or scoped
  // middleware edges targeting this controller).
  const controllerName = route.controller;
  if (route.middleware) {
    for (const mwName of route.middleware) {
      const mw = structure.middleware.find((m) => m.name === mwName);
      if (mw && mw.scope !== 'global') {
        steps.push({
          kind: 'middleware',
          name: mw.name,
          filePath: mw.filePath || undefined,
          resolved: resolvedSet.has(mw.name),
          middlewareScope: mw.scope,
        });
      }
    }
  }
  // Also pick up scoped middleware edges that target this controller but
  // weren't already listed by route.middleware.
  const addedMw = new Set(steps.filter((s) => s.kind === 'middleware').map((s) => s.name));
  for (const dep of structure.dependencies) {
    if (
      dep.type === 'middleware' &&
      dep.target === controllerName &&
      !addedMw.has(dep.source)
    ) {
      const mw = structure.middleware.find((m) => m.name === dep.source);
      if (mw && mw.scope !== 'global') {
        steps.push({
          kind: 'middleware',
          name: mw.name,
          filePath: mw.filePath || undefined,
          resolved: resolvedSet.has(mw.name),
          middlewareScope: mw.scope,
        });
      }
    }
  }

  // Controller step.
  const ctrl = structure.controllers.find((c) => c.name === controllerName);
  steps.push({
    kind: 'controller',
    name: controllerName,
    filePath: ctrl?.filePath,
    controllerMethod: route.controllerMethod,
    resolved: resolvedSet.has(controllerName),
  });

  // BFS through DI dependencies from the controller's declared deps.
  const serviceSet = new Set(structure.services.map((s) => s.name));
  const providerSet = new Set(structure.providers.map((p) => p.name));

  const depMap = new Map<string, string[]>();
  for (const dep of structure.dependencies) {
    if (dep.type === 'middleware') continue;
    const list = depMap.get(dep.source) ?? [];
    list.push(dep.target);
    depMap.set(dep.source, list);
  }

  const visited = new Set<string>();
  const queue: string[] = ctrl?.dependencies ? [...ctrl.dependencies] : [];
  let hiddenCount = 0;

  while (queue.length > 0) {
    if (steps.length >= MAX_FLOW_STEPS) {
      hiddenCount = queue.length;
      break;
    }
    const name = queue.shift()!;
    if (visited.has(name)) continue;
    visited.add(name);

    let kind: FlowStepKind;
    let filePath: string | undefined;
    if (serviceSet.has(name)) {
      kind = 'service';
      filePath = structure.services.find((s) => s.name === name)?.filePath;
    } else if (providerSet.has(name)) {
      kind = 'provider';
      filePath = structure.providers.find((p) => p.name === name)?.filePath;
    } else {
      continue;
    }

    steps.push({
      kind,
      name,
      filePath,
      resolved: resolvedSet.has(name),
    });

    for (const next of depMap.get(name) ?? []) {
      if (!visited.has(next)) queue.push(next);
    }
  }

  return {
    steps,
    truncated: hiddenCount > 0,
    hiddenCount,
  };
}
