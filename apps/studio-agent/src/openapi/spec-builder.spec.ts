import { describe, it, expect } from 'vitest';
import { buildOpenApiDocument } from './spec-builder.js';
import type { RouteInfo, RecordedExchange } from '../types/index.js';

const ROUTES: RouteInfo[] = [
  {
    path: '/users',
    method: 'GET',
    controller: 'UsersController',
    controllerMethod: 'list',
  },
  {
    path: '/users/:id',
    method: 'GET',
    controller: 'UsersController',
    controllerMethod: 'find',
  },
  {
    path: '/users',
    method: 'POST',
    controller: 'UsersController',
    controllerMethod: 'create',
    bodyDto: 'CreateUserDTO',
    bodySample: { name: '', age: 0 },
  },
  {
    path: '/v2/users',
    method: 'GET',
    controller: 'UsersV2Controller',
    controllerMethod: 'list',
  },
];

function exchange(
  partial: {
    method: RecordedExchange['request']['method'];
    path: string;
    status: number;
    reqBody?: unknown;
    resBody?: unknown;
    query?: Record<string, string>;
  },
): RecordedExchange {
  return {
    id: `${partial.method}-${partial.path}-${partial.status}-${Math.random()}`,
    request: {
      id: 'req',
      traceId: 't',
      timestamp: Date.now(),
      method: partial.method,
      path: partial.path,
      url: partial.path,
      headers: {},
      query: partial.query ?? {},
      body: partial.reqBody,
    },
    response: {
      id: 'res',
      requestId: 'req',
      traceId: 't',
      timestamp: Date.now(),
      statusCode: partial.status,
      statusMessage: partial.status < 400 ? 'OK' : 'Error',
      headers: {},
      body: partial.resBody,
      duration: 1,
    },
  };
}

describe('buildOpenApiDocument', () => {
  it('produces a valid OpenAPI 3.1 skeleton from static routes', () => {
    const doc = buildOpenApiDocument(ROUTES, []);
    expect(doc.openapi).toBe('3.1.0');
    expect(doc.info['x-expressots-generated']).toBe('inferred');
    // Express `:id` becomes OpenAPI `{id}`.
    expect(doc.paths['/users/{id}']).toBeDefined();
    expect(doc.paths['/users']?.get).toBeDefined();
    expect(doc.paths['/users']?.post).toBeDefined();
  });

  it('adds path parameters as required', () => {
    const doc = buildOpenApiDocument(ROUTES, []);
    const op = doc.paths['/users/{id}'].get as Record<string, unknown>;
    const params = op.parameters as Array<Record<string, unknown>>;
    expect(params).toContainEqual(
      expect.objectContaining({ name: 'id', in: 'path', required: true }),
    );
  });

  it('builds a request body schema from bodySample', () => {
    const doc = buildOpenApiDocument(ROUTES, []);
    const post = doc.paths['/users'].post as Record<string, unknown>;
    const body = post.requestBody as Record<string, unknown>;
    const schema = (body.content as Record<string, { schema: Record<string, unknown> }>)[
      'application/json'
    ].schema;
    expect(schema.type).toBe('object');
    expect((schema.properties as Record<string, unknown>).name).toBeDefined();
  });

  it('prefers a precise schema override over the inferred sample', () => {
    const override = {
      type: 'object',
      properties: { name: { type: 'string' }, age: { type: 'integer' } },
      required: ['name'],
    };
    const doc = buildOpenApiDocument(ROUTES, [], {
      schemaOverrides: { CreateUserDTO: override },
    });
    const post = doc.paths['/users'].post as Record<string, unknown>;
    const schema = (
      (post.requestBody as Record<string, unknown>).content as Record<
        string,
        { schema: Record<string, unknown> }
      >
    )['application/json'].schema;
    expect(schema.required).toEqual(['name']);
    expect(doc.info['x-expressots-generated']).toBe('extracted');
  });

  it('reports mixed provenance when overrides and traffic are combined', () => {
    const override = {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    };
    const exchanges = [
      exchange({ method: 'GET', path: '/users', status: 200, resBody: [{ id: 1 }] }),
    ];
    const doc = buildOpenApiDocument(ROUTES, exchanges, {
      schemaOverrides: { CreateUserDTO: override },
    });
    expect(doc.info['x-expressots-generated']).toBe('mixed');
  });

  it('synthesizes response schemas and examples from recorded traffic', () => {
    const exchanges = [
      exchange({ method: 'GET', path: '/users', status: 200, resBody: [{ id: 1, name: 'Ada' }] }),
      exchange({ method: 'GET', path: '/users/42', status: 200, resBody: { id: 42, name: 'Ada' } }),
      exchange({ method: 'GET', path: '/users/99', status: 404, resBody: { error: 'not found' } }),
    ];
    const doc = buildOpenApiDocument(ROUTES, exchanges);

    const listGet = doc.paths['/users'].get as Record<string, unknown>;
    const responses = listGet.responses as Record<string, Record<string, unknown>>;
    expect(responses['200']).toBeDefined();
    expect(responses['200'].content).toBeDefined();

    const findGet = doc.paths['/users/{id}'].get as Record<string, unknown>;
    const findResponses = findGet.responses as Record<string, unknown>;
    expect(findResponses['200']).toBeDefined();
    expect(findResponses['404']).toBeDefined();
  });

  it('filters by API version when apiVersion is set', () => {
    const doc = buildOpenApiDocument(ROUTES, [], { apiVersion: '2' });
    expect(doc.paths['/v2/users']).toBeDefined();
    expect(doc.paths['/users']).toBeUndefined();
  });

  it('emits a placeholder response when no traffic exists', () => {
    const doc = buildOpenApiDocument([ROUTES[0]], []);
    const op = doc.paths['/users'].get as Record<string, unknown>;
    expect(op.responses).toHaveProperty('default');
  });
});
