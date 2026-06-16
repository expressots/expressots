// Regression tests for the StudioAgent's global-prefix discovery logic.
//
// The prefix is mounted by the host via `setGlobalRoutePrefix("/api")`,
// which translates to `app.use("/api", router)`. In Express 4 we used to
// recover that prefix by parsing `layer.regexp.source`; Express 5
// dropped that field in favour of opaque matcher closures, so the
// agent now leans on the explicit `globalPrefix` config the host pushes
// in via `agentOptions` / `updateRuntimeInfo`.
//
// These tests pin three properties of the new behaviour:
//   1. The boot-time scan splices the prefix onto every static route.
//   2. A later `updateRuntimeInfo({ globalPrefix })` re-prefixes
//      idempotently (no `/api/api/health` doubling).
//   3. Switching prefixes mid-session works both ways (set, change,
//      clear).

import { describe, it, expect, beforeEach } from 'vitest';
import { StudioAgent } from './agent.js';
import type { RouteInfo } from './types/index.js';

const STATIC_ROUTES: ReadonlyArray<RouteInfo> = [
  {
    path: '/',
    method: 'GET',
    controller: 'AppController',
    controllerMethod: 'welcome',
  },
  {
    path: '/health',
    method: 'GET',
    controller: 'AppController',
    controllerMethod: 'health',
  },
];

/**
 * Build a StudioAgent and stub `scanner.scan` so the spec doesn't depend
 * on a real source tree. Returns the agent plus a hook to swap the
 * static fixture mid-test.
 */
async function makeAgent(prefix?: string) {
  const agent = new StudioAgent({
    globalPrefix: prefix,
    port: 0,
    enableRecording: false,
  });

  const scanner = (agent as unknown as {
    scanner: {
      scan: () => Promise<{
        controllers: never[];
        services: never[];
        providers: never[];
        middleware: never[];
        dependencies: never[];
        modules: never[];
      }>;
      getRoutes: () => RouteInfo[];
    };
  }).scanner;
  scanner.scan = async () => ({
    controllers: [],
    services: [],
    providers: [],
    middleware: [],
    dependencies: [],
    modules: [],
  });
  scanner.getRoutes = () => STATIC_ROUTES.map((r) => ({ ...r }));

  await agent.scanRoutes();
  return agent;
}

describe('StudioAgent global-prefix discovery', () => {
  let agent: StudioAgent;

  beforeEach(async () => {
    agent = await makeAgent('/api');
  });

  it('splices the boot-time prefix onto every static route', () => {
    expect(agent.getRoutes().map((r) => r.path)).toEqual([
      '/api/',
      '/api/health',
    ]);
  });

  it('re-prefixes routes when updateRuntimeInfo changes the prefix', () => {
    agent.updateRuntimeInfo({ globalPrefix: '/v2/api' });
    expect(agent.getRoutes().map((r) => r.path)).toEqual([
      '/v2/api/',
      '/v2/api/health',
    ]);
  });

  it('is idempotent when the same prefix is pushed twice', () => {
    agent.updateRuntimeInfo({ globalPrefix: '/api' });
    expect(agent.getRoutes().map((r) => r.path)).toEqual([
      '/api/',
      '/api/health',
    ]);
  });

  it('strips the prefix when the host clears it back to "/"', () => {
    agent.updateRuntimeInfo({ globalPrefix: '/' });
    expect(agent.getRoutes().map((r) => r.path)).toEqual(['/', '/health']);
  });

  it('normalises trailing slashes on the prefix', () => {
    agent.updateRuntimeInfo({ globalPrefix: '/api/' });
    expect(agent.getRoutes().map((r) => r.path)).toEqual([
      '/api/',
      '/api/health',
    ]);
  });

  it('supports multi-segment prefixes', () => {
    agent.updateRuntimeInfo({ globalPrefix: '/internal/v3/api' });
    expect(agent.getRoutes().map((r) => r.path)).toEqual([
      '/internal/v3/api/',
      '/internal/v3/api/health',
    ]);
  });

  it('does not silently double-apply on repeated identical updates', () => {
    agent.updateRuntimeInfo({ globalPrefix: '/api' });
    agent.updateRuntimeInfo({ globalPrefix: '/api' });
    agent.updateRuntimeInfo({ globalPrefix: '/api' });
    expect(agent.getRoutes().map((r) => r.path)).toEqual([
      '/api/',
      '/api/health',
    ]);
  });

  it('survives going prefix-less from the start', async () => {
    const noPrefix = await makeAgent(undefined);
    expect(noPrefix.getRoutes().map((r) => r.path)).toEqual(['/', '/health']);
    noPrefix.updateRuntimeInfo({ globalPrefix: '/api' });
    expect(noPrefix.getRoutes().map((r) => r.path)).toEqual([
      '/api/',
      '/api/health',
    ]);
  });
});
