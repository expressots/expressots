import { describe, it, expect } from 'vitest';
import {
  assignNodeDepths,
  buildAdjacency,
  type LayoutDependency,
  type LayoutEntry,
} from './architecture-layout';

describe('buildAdjacency', () => {
  it('drops edges whose endpoints are not known nodes', () => {
    const entries: LayoutEntry[] = [
      { name: 'A', kind: 'controller' },
      { name: 'B', kind: 'service' },
    ];
    const deps: LayoutDependency[] = [
      { source: 'A', target: 'B' },
      { source: 'A', target: 'Ghost' }, // target unknown → dropped
      { source: 'Ghost', target: 'B' }, // source unknown → dropped
    ];
    const { outgoing, incoming } = buildAdjacency(entries, deps);
    expect(outgoing.get('A')).toEqual(['B']);
    expect(incoming.get('B')).toEqual(['A']);
  });

  it('collapses duplicate parallel edges', () => {
    const entries: LayoutEntry[] = [
      { name: 'A', kind: 'controller' },
      { name: 'B', kind: 'service' },
    ];
    const deps: LayoutDependency[] = [
      { source: 'A', target: 'B' },
      { source: 'A', target: 'B' },
    ];
    const { outgoing } = buildAdjacency(entries, deps);
    expect(outgoing.get('A')).toEqual(['B']);
  });
});

describe('assignNodeDepths', () => {
  it('seeds middleware at 0 and controllers at 1, then relaxes a DAG chain', () => {
    const entries: LayoutEntry[] = [
      { name: 'Mw', kind: 'middleware' },
      { name: 'Ctrl', kind: 'controller' },
      { name: 'S0', kind: 'service' },
      { name: 'S1', kind: 'service' },
      { name: 'Repo', kind: 'provider' },
    ];
    const deps: LayoutDependency[] = [
      { source: 'Mw', target: 'Ctrl' },
      { source: 'Ctrl', target: 'S0' },
      { source: 'S0', target: 'S1' },
      { source: 'S1', target: 'Repo' },
    ];
    const depth = assignNodeDepths(entries, deps);
    expect(depth.get('Mw')).toBe(0);
    expect(depth.get('Ctrl')).toBe(1);
    expect(depth.get('S0')).toBe(2);
    expect(depth.get('S1')).toBe(3);
    expect(depth.get('Repo')).toBe(4);
  });

  it('assigns a depth to every node', () => {
    const entries: LayoutEntry[] = [
      { name: 'Ctrl', kind: 'controller' },
      { name: 'A', kind: 'service' },
      { name: 'B', kind: 'service' },
    ];
    const deps: LayoutDependency[] = [{ source: 'Ctrl', target: 'A' }];
    const depth = assignNodeDepths(entries, deps);
    for (const e of entries) {
      expect(depth.has(e.name)).toBe(true);
      expect(Number.isFinite(depth.get(e.name))).toBe(true);
    }
  });

  // ── Regression guard for the "Architecture tab freezes the page" bug ──
  // A cyclic dependency graph used to spin the longest-path relaxation
  // forever. These tests assert termination: an infinite loop would blow
  // the per-test timeout and fail instead of hanging the whole suite.

  it('terminates on a mutual cycle (A <-> B)', () => {
    const entries: LayoutEntry[] = [
      { name: 'Ctrl', kind: 'controller' },
      { name: 'A', kind: 'service' },
      { name: 'B', kind: 'service' },
    ];
    const deps: LayoutDependency[] = [
      { source: 'Ctrl', target: 'A' },
      { source: 'A', target: 'B' },
      { source: 'B', target: 'A' }, // back-edge → cycle
    ];
    const depth = assignNodeDepths(entries, deps);
    expect(depth.size).toBe(entries.length);
    for (const d of depth.values()) {
      expect(d).toBeLessThanOrEqual(entries.length);
    }
  });

  it('terminates on a self-edge (interface resolves to its own impl)', () => {
    const entries: LayoutEntry[] = [
      { name: 'UserCtrl', kind: 'controller' },
      { name: 'UserService', kind: 'service' },
    ];
    const deps: LayoutDependency[] = [
      { source: 'UserCtrl', target: 'UserService' },
      { source: 'UserService', target: 'UserService' }, // self-edge
    ];
    const depth = assignNodeDepths(entries, deps);
    expect(depth.get('UserCtrl')).toBe(1);
    expect(depth.get('UserService')).toBe(2);
  });

  it('terminates on a fully cyclic graph with no acyclic seed', () => {
    const entries: LayoutEntry[] = [
      { name: 'A', kind: 'service' },
      { name: 'B', kind: 'service' },
      { name: 'C', kind: 'service' },
    ];
    const deps: LayoutDependency[] = [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'C' },
      { source: 'C', target: 'A' },
    ];
    const depth = assignNodeDepths(entries, deps);
    expect(depth.size).toBe(entries.length);
  });

  it('terminates quickly on a large cycle (stress)', () => {
    const n = 500;
    const entries: LayoutEntry[] = Array.from({ length: n }, (_, i) => ({
      name: `S${i}`,
      kind: 'service' as const,
    }));
    const deps: LayoutDependency[] = entries.map((_, i) => ({
      source: `S${i}`,
      target: `S${(i + 1) % n}`, // one big ring
    }));
    const start = Date.now();
    const depth = assignNodeDepths(entries, deps);
    expect(depth.size).toBe(n);
    expect(Date.now() - start).toBeLessThan(1000);
  });

  it('never exceeds the node-count cap for a long DAG chain', () => {
    const n = 12;
    const entries: LayoutEntry[] = [{ name: 'C', kind: 'controller' }];
    const deps: LayoutDependency[] = [];
    for (let i = 0; i < n; i++) entries.push({ name: `S${i}`, kind: 'service' });
    deps.push({ source: 'C', target: 'S0' });
    for (let i = 0; i < n - 1; i++) deps.push({ source: `S${i}`, target: `S${i + 1}` });
    const depth = assignNodeDepths(entries, deps);
    for (const d of depth.values()) {
      expect(d).toBeLessThanOrEqual(entries.length);
    }
    // The chain is acyclic, so the cap must not have truncated it.
    expect(depth.get(`S${n - 1}`)).toBe(n + 1);
  });
});
