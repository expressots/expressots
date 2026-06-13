import type { AppStructure, RouteInfo } from '../../types';
import type { NodeStats, NodeWarnings } from './types';

export interface ModuleSummary {
  name: string;
  filePath?: string;
  controllers: string[];
  services: string[];
  providers: string[];
  middleware: string[];
  routeCount: number;
  reqTotal: number;
  warningCounts: { cycles: number; orphans: number; hubs: number };
  members: string[];
}

export function buildModuleSummaries(
  structure: AppStructure,
  routes: RouteInfo[],
  stats: Map<string, NodeStats>,
  warnings: Map<string, NodeWarnings>,
): ModuleSummary[] {
  const controllerSet = new Set(structure.controllers.map((c) => c.name));
  const serviceSet = new Set(structure.services.map((s) => s.name));
  const providerSet = new Set(structure.providers.map((p) => p.name));
  const middlewareSet = new Set(structure.middleware.map((m) => m.name));

  const routesByController = new Map<string, number>();
  for (const r of routes) {
    routesByController.set(r.controller, (routesByController.get(r.controller) ?? 0) + 1);
  }

  const assigned = new Set<string>();

  const result: ModuleSummary[] = [];

  for (const mod of structure.modules ?? []) {
    const controllers: string[] = [];
    const services: string[] = [];
    const providers: string[] = [];
    const middleware: string[] = [];
    let routeCount = 0;
    let reqTotal = 0;
    let cycles = 0;
    let orphans = 0;
    let hubs = 0;

    for (const member of mod.members) {
      assigned.add(member);
      if (controllerSet.has(member)) {
        controllers.push(member);
        routeCount += routesByController.get(member) ?? 0;
      } else if (serviceSet.has(member)) {
        services.push(member);
      } else if (providerSet.has(member)) {
        providers.push(member);
      } else if (middlewareSet.has(member)) {
        middleware.push(member);
      }
      const s = stats.get(member);
      if (s) reqTotal += s.req;
      const w = warnings.get(member);
      if (w?.cycle) cycles++;
      if (w?.orphan) orphans++;
      if (w?.fanIn) hubs++;
    }

    result.push({
      name: mod.name,
      filePath: mod.filePath,
      controllers,
      services,
      providers,
      middleware,
      routeCount,
      reqTotal,
      warningCounts: { cycles, orphans, hubs },
      members: mod.members,
    });
  }

  // Bucket for artifacts not assigned to any module.
  const unControllers: string[] = [];
  const unServices: string[] = [];
  const unProviders: string[] = [];
  const unMiddleware: string[] = [];
  let unRouteCount = 0;
  let unReqTotal = 0;
  let unCycles = 0;
  let unOrphans = 0;
  let unHubs = 0;
  const unMembers: string[] = [];

  for (const c of structure.controllers) {
    if (!assigned.has(c.name)) {
      unControllers.push(c.name);
      unMembers.push(c.name);
      unRouteCount += routesByController.get(c.name) ?? 0;
      const s = stats.get(c.name);
      if (s) unReqTotal += s.req;
      const w = warnings.get(c.name);
      if (w?.cycle) unCycles++;
      if (w?.orphan) unOrphans++;
      if (w?.fanIn) unHubs++;
    }
  }
  for (const svc of structure.services) {
    if (!assigned.has(svc.name)) {
      unServices.push(svc.name);
      unMembers.push(svc.name);
      const s = stats.get(svc.name);
      if (s) unReqTotal += s.req;
      const w = warnings.get(svc.name);
      if (w?.cycle) unCycles++;
      if (w?.orphan) unOrphans++;
      if (w?.fanIn) unHubs++;
    }
  }
  for (const p of structure.providers) {
    if (!assigned.has(p.name)) {
      unProviders.push(p.name);
      unMembers.push(p.name);
      const s = stats.get(p.name);
      if (s) unReqTotal += s.req;
      const w = warnings.get(p.name);
      if (w?.cycle) unCycles++;
      if (w?.orphan) unOrphans++;
      if (w?.fanIn) unHubs++;
    }
  }
  for (const mw of structure.middleware) {
    if (!assigned.has(mw.name)) {
      unMiddleware.push(mw.name);
      unMembers.push(mw.name);
      const w = warnings.get(mw.name);
      if (w?.cycle) unCycles++;
      if (w?.orphan) unOrphans++;
      if (w?.fanIn) unHubs++;
    }
  }

  if (unMembers.length > 0) {
    result.push({
      name: 'Unassigned',
      controllers: unControllers,
      services: unServices,
      providers: unProviders,
      middleware: unMiddleware,
      routeCount: unRouteCount,
      reqTotal: unReqTotal,
      warningCounts: { cycles: unCycles, orphans: unOrphans, hubs: unHubs },
      members: unMembers,
    });
  }

  return result;
}
