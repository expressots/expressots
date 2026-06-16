/**
 * Smoke test for the headless emit path (what `expressots openapi emit`
 * produces via the Studio bin).
 *
 * We can't depend on Spectral here (not installed, needs network), so we
 * assert the structural invariants Spectral's core `oas` ruleset checks:
 * a valid `openapi` version, a populated `info` block, and a `responses`
 * object on every operation. The document also has to round-trip through
 * JSON, mirroring the file the CLI writes.
 */

import { describe, it, expect } from 'vitest';
import { buildOpenApiDocument } from './spec-builder.js';
import type { RouteInfo } from '../types/index.js';

// A representative slice of a generated ExpressoTS template app.
const TEMPLATE_ROUTES: RouteInfo[] = [
  { path: '/', method: 'GET', controller: 'AppController', controllerMethod: 'welcome' },
  { path: '/health', method: 'GET', controller: 'HealthController', controllerMethod: 'check' },
  { path: '/users', method: 'GET', controller: 'UsersController', controllerMethod: 'list' },
  { path: '/users/:id', method: 'GET', controller: 'UsersController', controllerMethod: 'find' },
  {
    path: '/users',
    method: 'POST',
    controller: 'UsersController',
    controllerMethod: 'create',
    bodyDto: 'CreateUserDTO',
    bodySample: { name: '', email: '' },
  },
];

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

describe('openapi emit (headless) smoke test', () => {
  const doc = buildOpenApiDocument(TEMPLATE_ROUTES, [], {
    title: 'Template API',
    version: '1.0.0',
  });
  // Round-trip exactly like the CLI does before writing to disk.
  const serialized = JSON.stringify(doc, null, 2);
  const parsed = JSON.parse(serialized) as typeof doc;

  it('emits valid JSON', () => {
    expect(() => JSON.parse(serialized)).not.toThrow();
  });

  it('declares a supported OpenAPI 3.1 version', () => {
    expect(parsed.openapi).toMatch(/^3\.1\.\d+$/);
  });

  it('has a populated info block (title + version)', () => {
    expect(typeof parsed.info.title).toBe('string');
    expect(parsed.info.title.length).toBeGreaterThan(0);
    expect(typeof parsed.info.version).toBe('string');
    expect(parsed.info.version.length).toBeGreaterThan(0);
  });

  it('gives every operation a responses object (Spectral oas-operation-responses)', () => {
    for (const [path, item] of Object.entries(parsed.paths)) {
      for (const method of HTTP_METHODS) {
        const op = (item as Record<string, unknown>)[method] as
          | Record<string, unknown>
          | undefined;
        if (!op) continue;
        expect(op.responses, `${method.toUpperCase()} ${path} missing responses`).toBeDefined();
        expect(Object.keys(op.responses as object).length).toBeGreaterThan(0);
      }
    }
  });

  it('templates path parameters and declares them (Spectral path-params)', () => {
    const op = parsed.paths['/users/{id}'].get as Record<string, unknown>;
    const params = (op.parameters ?? []) as Array<Record<string, unknown>>;
    const pathParam = params.find((p) => p.in === 'path' && p.name === 'id');
    expect(pathParam).toBeDefined();
    expect(pathParam?.required).toBe(true);
  });
});
