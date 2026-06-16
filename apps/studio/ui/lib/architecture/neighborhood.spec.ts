import { describe, it, expect } from 'vitest';
import { buildNeighborhood } from './neighborhood';
import type { AppStructure } from '../../types';

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

describe('buildNeighborhood', () => {
  it('returns upstream and downstream within 2 hops', () => {
    const structure = makeStructure({
      controllers: [{ name: 'C', filePath: '/c.ts', routes: [], dependencies: ['S'] }],
      services: [{ name: 'S', filePath: '/s.ts', dependencies: ['P'], methods: [] }],
      providers: [{ name: 'P', filePath: '/p.ts', dependencies: [], methods: [] }],
      dependencies: [
        { source: 'C', target: 'S', type: 'service' },
        { source: 'S', target: 'P', type: 'provider' },
      ],
    });
    const result = buildNeighborhood('service-S', structure, 2);
    expect(result.upstream).toContain('C');
    expect(result.downstream).toContain('P');
    expect(result.nodes.find((n) => n.name === 'S')?.direction).toBe('focus');
  });

  it('is cycle-safe on mutual dependency', () => {
    const structure = makeStructure({
      services: [
        { name: 'A', filePath: '/a.ts', dependencies: ['B'], methods: [] },
        { name: 'B', filePath: '/b.ts', dependencies: ['A'], methods: [] },
      ],
      dependencies: [
        { source: 'A', target: 'B', type: 'service' },
        { source: 'B', target: 'A', type: 'service' },
      ],
    });
    const start = Date.now();
    const result = buildNeighborhood('service-A', structure, 2);
    expect(Date.now() - start).toBeLessThan(100);
    expect(result.nodes.length).toBe(2);
  });

  it('caps at MAX_NODES on large fan-out', () => {
    const n = 60;
    const services = Array.from({ length: n }, (_, i) => ({
      name: `S${i}`,
      filePath: `/s${i}.ts`,
      dependencies: [],
      methods: [],
    }));
    const deps = services.map((s) => ({
      source: 'Hub',
      target: s.name,
      type: 'service' as const,
    }));
    const structure = makeStructure({
      services: [
        { name: 'Hub', filePath: '/hub.ts', dependencies: services.map((s) => s.name), methods: [] },
        ...services,
      ],
      dependencies: deps,
    });
    const result = buildNeighborhood('service-Hub', structure, 2);
    expect(result.nodes.length).toBeLessThanOrEqual(41);
  });

  it('returns empty for unknown node', () => {
    const result = buildNeighborhood('service-Unknown', makeStructure(), 2);
    expect(result.nodes).toEqual([]);
  });
});
