import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// Keep the test light: the agent package boots OpenTelemetry on import and
// none of the units under test need it.
vi.mock('@expressots/studio-agent', () => ({
  StudioAgent: class StudioAgentStub {},
}));

import { Studio } from './studio.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Studio configuration', () => {
  it('applies documented defaults when constructed with no config', () => {
    const studio = new Studio();

    expect(studio.getConfig()).toEqual({
      uiPort: 3333,
      agentPort: 3334,
      dbPath: '.studio/studio.db',
      srcPath: './src',
      serviceName: 'expressots-app',
      standalone: false,
    });
  });

  it('merges partial overrides with defaults', () => {
    const studio = new Studio({ uiPort: 4000, standalone: true });
    const config = studio.getConfig();

    expect(config.uiPort).toBe(4000);
    expect(config.standalone).toBe(true);
    expect(config.agentPort).toBe(3334);
  });

  it('returns a copy from getConfig so callers cannot mutate internal state', () => {
    const studio = new Studio();
    const config = studio.getConfig();
    config.uiPort = 9999;

    expect(studio.getConfig().uiPort).toBe(3333);
  });

  it('reports no agent before start', () => {
    const studio = new Studio();

    expect(studio.isAgentConnected()).toBe(false);
    expect(studio.getAgent()).toBeNull();
  });
});

describe('Studio.findUIDistPath', () => {
  // Private method, exercised directly: it is the fallback logic that decides
  // whether the bundled UI or the dev-mode placeholder page is served.
  type WithPrivates = { findUIDistPath(): string | null };

  it('returns the ui directory next to the compiled module when it exists', () => {
    const existsSync = vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    const studio = new Studio() as unknown as WithPrivates;

    const result = studio.findUIDistPath();

    expect(result).not.toBeNull();
    expect(path.basename(result!)).toBe('ui');
    expect(existsSync).toHaveBeenCalledWith(result);
  });

  it('returns null when the bundled ui directory is missing', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    const studio = new Studio() as unknown as WithPrivates;

    expect(studio.findUIDistPath()).toBeNull();
  });
});

describe('Studio rate limiter', () => {
  type WithPrivates = {
    createRateLimiter(
      maxHits: number,
      windowMs: number,
    ): (req: unknown, res: unknown, next: () => void) => void;
  };

  function makeRes() {
    return {
      statusCode: 0,
      body: '',
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      send(body: string) {
        this.body = body;
        return this;
      },
    };
  }

  it('passes requests through until the limit, then responds 429', () => {
    const studio = new Studio() as unknown as WithPrivates;
    const limiter = studio.createRateLimiter(3, 60_000);
    const req = { ip: '127.0.0.1', socket: {} };

    let passed = 0;
    for (let i = 0; i < 3; i++) {
      limiter(req, makeRes(), () => passed++);
    }
    expect(passed).toBe(3);

    const res = makeRes();
    let blockedNext = false;
    limiter(req, res, () => (blockedNext = true));

    expect(blockedNext).toBe(false);
    expect(res.statusCode).toBe(429);
  });

  it('tracks clients independently by ip', () => {
    const studio = new Studio() as unknown as WithPrivates;
    const limiter = studio.createRateLimiter(1, 60_000);

    let firstPassed = 0;
    limiter({ ip: '10.0.0.1', socket: {} }, makeRes(), () => firstPassed++);
    limiter({ ip: '10.0.0.1', socket: {} }, makeRes(), () => firstPassed++);

    let secondPassed = 0;
    limiter({ ip: '10.0.0.2', socket: {} }, makeRes(), () => secondPassed++);

    expect(firstPassed).toBe(1);
    expect(secondPassed).toBe(1);
  });

  it('resets the bucket after the window elapses', () => {
    vi.useFakeTimers();
    try {
      const studio = new Studio() as unknown as WithPrivates;
      const limiter = studio.createRateLimiter(1, 1_000);
      const req = { ip: '127.0.0.1', socket: {} };

      let passed = 0;
      limiter(req, makeRes(), () => passed++);
      limiter(req, makeRes(), () => passed++);
      expect(passed).toBe(1);

      vi.advanceTimersByTime(1_001);
      limiter(req, makeRes(), () => passed++);
      expect(passed).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
