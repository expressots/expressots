import { describe, it, expect } from 'vitest';
import { buildRequestFlowPath } from './flow-path';
import type { AppStructure, RouteInfo } from '../../types';

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

describe('buildRequestFlowPath', () => {
  it('builds a linear HTTP -> MW -> Controller -> Service -> Provider chain', () => {
    const route: RouteInfo = {
      path: '/users',
      method: 'GET',
      controller: 'UserCtrl',
      controllerMethod: 'list',
    };
    const structure = makeStructure({
      controllers: [{ name: 'UserCtrl', filePath: '/c.ts', routes: [], dependencies: ['UserSvc'] }],
      services: [{ name: 'UserSvc', filePath: '/s.ts', dependencies: ['DB'], methods: ['list'] }],
      providers: [{ name: 'DB', filePath: '/p.ts', dependencies: [], methods: ['query'] }],
      middleware: [{ name: 'Auth', filePath: '/m.ts', dependencies: [], methods: [], scope: 'global' }],
      dependencies: [
        { source: 'UserCtrl', target: 'UserSvc', type: 'service' },
        { source: 'UserSvc', target: 'DB', type: 'provider' },
      ],
    });

    const result = buildRequestFlowPath(route, structure);
    expect(result.truncated).toBe(false);
    expect(result.steps.map((s) => s.kind)).toEqual([
      'http', 'middleware', 'controller', 'service', 'provider',
    ]);
    expect(result.steps[0].name).toBe('GET /users');
    expect(result.steps[1].name).toBe('Auth');
    expect(result.steps[2].name).toBe('UserCtrl');
    expect(result.steps[3].name).toBe('UserSvc');
    expect(result.steps[4].name).toBe('DB');
  });

  it('annotates resolved steps from runtime container data', () => {
    const route: RouteInfo = {
      path: '/u',
      method: 'GET',
      controller: 'C',
      controllerMethod: 'get',
    };
    const structure = makeStructure({
      controllers: [{ name: 'C', filePath: '/c.ts', routes: [], dependencies: ['S'] }],
      services: [{ name: 'S', filePath: '/s.ts', dependencies: [], methods: [] }],
      dependencies: [{ source: 'C', target: 'S', type: 'service' }],
    });
    const result = buildRequestFlowPath(route, structure, ['S']);
    const svcStep = result.steps.find((s) => s.name === 'S');
    expect(svcStep?.resolved).toBe(true);
  });

  it('terminates on cyclic DI graph without freezing', () => {
    const route: RouteInfo = {
      path: '/x',
      method: 'GET',
      controller: 'C',
      controllerMethod: 'run',
    };
    const structure = makeStructure({
      controllers: [{ name: 'C', filePath: '/c.ts', routes: [], dependencies: ['A'] }],
      services: [
        { name: 'A', filePath: '/a.ts', dependencies: ['B'], methods: [] },
        { name: 'B', filePath: '/b.ts', dependencies: ['A'], methods: [] },
      ],
      dependencies: [
        { source: 'C', target: 'A', type: 'service' },
        { source: 'A', target: 'B', type: 'service' },
        { source: 'B', target: 'A', type: 'service' },
      ],
    });
    const start = Date.now();
    const result = buildRequestFlowPath(route, structure);
    expect(Date.now() - start).toBeLessThan(100);
    expect(result.steps.length).toBeLessThanOrEqual(30);
    expect(result.steps.find((s) => s.name === 'A')).toBeTruthy();
    expect(result.steps.find((s) => s.name === 'B')).toBeTruthy();
  });

  it('truncates at 30 steps on a long chain', () => {
    const n = 40;
    const services = Array.from({ length: n }, (_, i) => ({
      name: `S${i}`,
      filePath: `/s${i}.ts`,
      dependencies: i < n - 1 ? [`S${i + 1}`] : [],
      methods: [],
    }));
    const deps = services.slice(0, -1).map((s, i) => ({
      source: s.name,
      target: `S${i + 1}`,
      type: 'service' as const,
    }));
    deps.unshift({ source: 'C', target: 'S0', type: 'service' });

    const structure = makeStructure({
      controllers: [{ name: 'C', filePath: '/c.ts', routes: [], dependencies: ['S0'] }],
      services,
      dependencies: deps,
    });
    const route: RouteInfo = { path: '/x', method: 'GET', controller: 'C', controllerMethod: 'run' };
    const result = buildRequestFlowPath(route, structure);
    expect(result.truncated).toBe(true);
    expect(result.steps.length).toBe(30);
    expect(result.hiddenCount).toBeGreaterThan(0);
  });

  it('handles route-specific middleware from route.middleware field', () => {
    const route: RouteInfo = {
      path: '/admin',
      method: 'POST',
      controller: 'AdminCtrl',
      controllerMethod: 'create',
      middleware: ['RoleGuard'],
    };
    const structure = makeStructure({
      controllers: [{ name: 'AdminCtrl', filePath: '/c.ts', routes: [], dependencies: [] }],
      middleware: [
        { name: 'RoleGuard', filePath: '/g.ts', dependencies: [], methods: [], scope: 'route' },
      ],
    });
    const result = buildRequestFlowPath(route, structure);
    const kinds = result.steps.map((s) => s.kind);
    expect(kinds).toContain('middleware');
    const mwStep = result.steps.find((s) => s.name === 'RoleGuard');
    expect(mwStep?.middlewareScope).toBe('route');
  });
});
