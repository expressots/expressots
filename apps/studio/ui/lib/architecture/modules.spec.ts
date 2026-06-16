import { describe, it, expect } from 'vitest';
import { buildModuleSummaries } from './modules';
import type { AppStructure, RouteInfo } from '../../types';
import type { NodeStats, NodeWarnings } from './types';

function makeStructure(overrides?: Partial<AppStructure>): AppStructure {
  return {
    controllers: [],
    services: [],
    providers: [],
    middleware: [],
    dependencies: [],
    modules: [],
    ...overrides,
  };
}

describe('buildModuleSummaries', () => {
  it('groups artifacts into modules', () => {
    const structure = makeStructure({
      controllers: [
        { name: 'UserCtrl', filePath: '/a.ts', routes: [{ path: '/u', method: 'GET', controller: 'UserCtrl', controllerMethod: 'get' }], dependencies: [] },
      ],
      services: [{ name: 'UserSvc', filePath: '/b.ts', dependencies: [], methods: ['create'] }],
      providers: [],
      modules: [{ name: 'UserModule', filePath: '/m.ts', members: ['UserCtrl', 'UserSvc'] }],
    });
    const routes: RouteInfo[] = [
      { path: '/u', method: 'GET', controller: 'UserCtrl', controllerMethod: 'get' },
    ];
    const result = buildModuleSummaries(structure, routes, new Map(), new Map());
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('UserModule');
    expect(result[0].controllers).toEqual(['UserCtrl']);
    expect(result[0].services).toEqual(['UserSvc']);
    expect(result[0].routeCount).toBe(1);
  });

  it('creates Unassigned bucket for unmodularised artifacts', () => {
    const structure = makeStructure({
      controllers: [
        { name: 'Loose', filePath: '/l.ts', routes: [], dependencies: [] },
      ],
      modules: [],
    });
    const result = buildModuleSummaries(structure, [], new Map(), new Map());
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Unassigned');
    expect(result[0].controllers).toEqual(['Loose']);
  });

  it('aggregates warning counts per module', () => {
    const structure = makeStructure({
      services: [
        { name: 'A', filePath: '/a.ts', dependencies: [], methods: [] },
        { name: 'B', filePath: '/b.ts', dependencies: [], methods: [] },
      ],
      modules: [{ name: 'Mod', filePath: '/m.ts', members: ['A', 'B'] }],
    });
    const warnings = new Map<string, NodeWarnings>([
      ['A', { cycle: true }],
      ['B', { fanIn: 6 }],
    ]);
    const result = buildModuleSummaries(structure, [], new Map(), warnings);
    expect(result[0].warningCounts).toEqual({ cycles: 1, orphans: 0, hubs: 1 });
  });

  it('aggregates request totals from stats', () => {
    const structure = makeStructure({
      controllers: [
        { name: 'C1', filePath: '/c.ts', routes: [], dependencies: [] },
      ],
      modules: [{ name: 'M', filePath: '/m.ts', members: ['C1'] }],
    });
    const stats = new Map<string, NodeStats>([
      ['C1', { req: 42, errors: 1, avgMs: 10, p95Ms: 15 }],
    ]);
    const result = buildModuleSummaries(structure, [], stats, new Map());
    expect(result[0].reqTotal).toBe(42);
  });

  it('returns empty array when no artifacts exist', () => {
    const result = buildModuleSummaries(makeStructure(), [], new Map(), new Map());
    expect(result).toEqual([]);
  });
});
