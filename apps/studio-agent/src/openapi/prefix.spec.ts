import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  applyGlobalPrefix,
  normaliseGlobalPrefix,
  joinPrefixWithRoute,
} from './path-utils.js';
import { detectGlobalPrefix } from './detect-prefix.js';
import { buildOpenApiDocument } from './spec-builder.js';
import { diffOpenApiSpec } from './spec-diff.js';
import type { RouteInfo } from '../types/index.js';

const ROUTES: RouteInfo[] = [
  { path: '/', method: 'GET', controller: 'AppController', controllerMethod: 'welcome' },
  { path: '/health', method: 'GET', controller: 'AppController', controllerMethod: 'health' },
];

describe('global prefix helpers', () => {
  it('normalises prefixes the way the agent does', () => {
    expect(normaliseGlobalPrefix(undefined)).toBe('');
    expect(normaliseGlobalPrefix('/')).toBe('');
    expect(normaliseGlobalPrefix('/api')).toBe('/api');
    expect(normaliseGlobalPrefix('/api/')).toBe('/api');
  });

  it('joins prefix and route without doubling slashes', () => {
    expect(joinPrefixWithRoute('/api', '/')).toBe('/api/');
    expect(joinPrefixWithRoute('/api', 'users')).toBe('/api/users');
    expect(joinPrefixWithRoute('/api', '/users')).toBe('/api/users');
  });

  it('applies a prefix to a route list (and is a no-op when empty)', () => {
    const prefixed = applyGlobalPrefix(ROUTES, '/api');
    expect(prefixed.map((r) => r.path)).toEqual(['/api/', '/api/health']);
    // original list untouched
    expect(ROUTES[0].path).toBe('/');
    expect(applyGlobalPrefix(ROUTES, '/').map((r) => r.path)).toEqual(['/', '/health']);
  });

  it('produces prefixed OpenAPI paths', () => {
    const doc = buildOpenApiDocument(applyGlobalPrefix(ROUTES, '/api'), []);
    expect(doc.paths['/api/']).toBeDefined();
    expect(doc.paths['/api/health']).toBeDefined();
  });

  it('eliminates false-positive drift when the prefix is applied', () => {
    const committed = {
      openapi: '3.1.0',
      info: { title: 'x', version: '1' },
      paths: {
        '/api/': { get: { responses: { '200': { description: 'ok' } } } },
        '/api/health': { get: { responses: { '200': { description: 'ok' } } } },
      },
    };
    // Without the prefix every route mismatches (the reported bug)…
    const bad = diffOpenApiSpec(committed, ROUTES, []);
    expect(bad.findings.length).toBeGreaterThan(0);
    // …with it applied, no structural drift.
    const good = diffOpenApiSpec(committed, applyGlobalPrefix(ROUTES, '/api'), []);
    expect(good.findings).toHaveLength(0);
  });
});

describe('detectGlobalPrefix', () => {
  let dir: string;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'expressots-prefix-'));
    fs.mkdirSync(path.join(dir, 'nested'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'app.ts'),
      `export class App extends AppExpress {
        globalConfiguration() { this.setGlobalRoutePrefix("/api"); }
      }`,
    );
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('finds the prefix from setGlobalRoutePrefix', () => {
    expect(detectGlobalPrefix(dir)).toBe('/api');
  });

  it('returns undefined when no prefix call exists', () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'expressots-noprefix-'));
    fs.writeFileSync(path.join(empty, 'app.ts'), 'export class App {}');
    expect(detectGlobalPrefix(empty)).toBeUndefined();
    fs.rmSync(empty, { recursive: true, force: true });
  });
});
