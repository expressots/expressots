import { describe, it, expect } from 'vitest';
import { diffOpenApiSpec } from './spec-diff.js';
import type { RouteInfo, RecordedExchange } from '../types/index.js';

const ROUTES: RouteInfo[] = [
  { path: '/users', method: 'GET', controller: 'UsersController', controllerMethod: 'list' },
  { path: '/users/:id', method: 'GET', controller: 'UsersController', controllerMethod: 'find' },
];

function res(path: string, status: number, body: unknown): RecordedExchange {
  return {
    id: `${path}-${status}-${Math.random()}`,
    request: {
      id: 'req',
      traceId: 't',
      timestamp: Date.now(),
      method: 'GET',
      path,
      url: path,
      headers: {},
      query: {},
    },
    response: {
      id: 'res',
      requestId: 'req',
      traceId: 't',
      timestamp: Date.now(),
      statusCode: status,
      statusMessage: 'OK',
      headers: {},
      body,
      duration: 1,
    },
  };
}

describe('diffOpenApiSpec', () => {
  it('flags a route present in code but missing from the spec', () => {
    const committed = {
      openapi: '3.1.0',
      info: { title: 'x', version: '1' },
      paths: {
        '/users': { get: { responses: { '200': { description: 'ok' } } } },
        // /users/{id} intentionally absent
      },
    };
    const report = diffOpenApiSpec(committed, ROUTES, []);
    expect(
      report.findings.some(
        (f) => f.rule === 'route-missing-in-spec' && f.path === '/users/{id}',
      ),
    ).toBe(true);
  });

  it('flags a route documented in the spec but missing from code', () => {
    const committed = {
      openapi: '3.1.0',
      info: { title: 'x', version: '1' },
      paths: {
        '/users': { get: { responses: { '200': { description: 'ok' } } } },
        '/users/{id}': { get: { responses: { '200': { description: 'ok' } } } },
        '/legacy': { get: { responses: { '200': { description: 'ok' } } } },
      },
    };
    const report = diffOpenApiSpec(committed, ROUTES, []);
    expect(
      report.findings.some(
        (f) => f.rule === 'route-missing-in-code' && f.path === '/legacy',
      ),
    ).toBe(true);
  });

  it('flags an undocumented status observed in traffic', () => {
    const committed = {
      openapi: '3.1.0',
      info: { title: 'x', version: '1' },
      paths: {
        '/users': { get: { responses: { '200': { description: 'ok' } } } },
        '/users/{id}': { get: { responses: { '200': { description: 'ok' } } } },
      },
    };
    const exchanges = [res('/users/5', 404, { error: 'nope' })];
    const report = diffOpenApiSpec(committed, ROUTES, exchanges);
    expect(
      report.findings.some(
        (f) => f.rule === 'undocumented-status' && f.path === '/users/{id}',
      ),
    ).toBe(true);
  });

  it('flags required-field drift with an observed percentage', () => {
    const committed = {
      openapi: '3.1.0',
      info: { title: 'x', version: '1' },
      paths: {
        '/users': {
          get: {
            responses: {
              '200': {
                description: 'ok',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['email'],
                      properties: { email: { type: 'string' } },
                    },
                  },
                },
              },
            },
          },
        },
        '/users/{id}': { get: { responses: { '200': { description: 'ok' } } } },
      },
    };
    const exchanges = [
      res('/users', 200, { email: 'a@b.com' }),
      res('/users', 200, { name: 'no email here' }),
    ];
    const report = diffOpenApiSpec(committed, ROUTES, exchanges);
    const drift = report.findings.find((f) => f.rule === 'required-field-drift');
    expect(drift).toBeDefined();
    expect(drift?.message).toContain('email');
    expect(drift?.message).toContain('%');
  });

  it('correlates traffic on trailing-slash routes (e.g. /api/) with the spec', () => {
    const rootRoute: RouteInfo[] = [
      { path: '/api/', method: 'GET', controller: 'AppController', controllerMethod: 'welcome' },
    ];
    const committed = {
      openapi: '3.1.0',
      info: { title: 'x', version: '1' },
      paths: {
        '/api/': { get: { responses: { '200': { description: 'ok' } } } },
      },
    };
    const exchanges = [res('/api/', 418, { teapot: true })];
    const report = diffOpenApiSpec(committed, rootRoute, exchanges);
    // Paths are normalised (trailing slash stripped) so traffic on `/api/`
    // correlates with the `/api` spec entry instead of being skipped.
    expect(
      report.findings.some(
        (f) => f.rule === 'undocumented-status' && f.path === '/api',
      ),
    ).toBe(true);
  });

  it('reports no findings when the spec matches code and traffic', () => {
    const committed = {
      openapi: '3.1.0',
      info: { title: 'x', version: '1' },
      paths: {
        '/users': { get: { responses: { '200': { description: 'ok' } } } },
        '/users/{id}': { get: { responses: { '200': { description: 'ok' } } } },
      },
    };
    const report = diffOpenApiSpec(committed, ROUTES, [res('/users', 200, { ok: true })]);
    expect(report.findings).toHaveLength(0);
  });
});
