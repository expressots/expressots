/**
 * Full-app OpenAPI 3.1 builder.
 *
 * Assembles a single OpenAPI document from two complementary sources:
 *
 *   1. The static route inventory (`RouteInfo[]`) discovered by
 *      `RouteScanner` — paths, methods, controllers, `@Body()` DTO shapes.
 *   2. Real recorded traffic (`RecordedExchange[]`) — used to backfill
 *      response schemas / examples and request examples that static
 *      analysis can't know.
 *
 * Precise schemas from a validation adapter's `extractSchema()` (passed via
 * `opts.schemaOverrides`) take precedence over inferred shapes.
 *
 * The builder is a pure function so it can run both inside the agent
 * (live) and headlessly from the CLI (static-only).
 */

import type { RouteInfo, RecordedExchange, HttpMethod } from '../types/index.js';
import type { BuildOpenApiOptions, JsonSchema, OpenApiDocument, GenerationProvenance } from './types.js';
import { inferSchema, unionSchema } from './schema-infer.js';
import { detectVersionSegment, makePathMatcher, toOpenApiPath } from './path-utils.js';
import { deriveResourceTagMap, routeKey } from './resource-tags.js';

const BODY_METHODS = new Set<HttpMethod>(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Build a complete OpenAPI 3.1 document for the application.
 *
 * Routes are deduplicated by method + path, recorded exchanges are
 * attributed to their route templates to backfill parameters, request
 * examples, and response schemas, and the resulting document carries an
 * `x-expressots-generated` provenance marker.
 *
 * @param routes - Static route inventory from `RouteScanner`.
 * @param exchanges - Recorded traffic used to enrich the document.
 * @param opts - Document metadata, version filtering, and schema overrides.
 * @returns The assembled OpenAPI 3.1 document.
 */
export function buildOpenApiDocument(
  routes: RouteInfo[],
  exchanges: RecordedExchange[] = [],
  opts: BuildOpenApiOptions = {},
): OpenApiDocument {
  const apiVersion = opts.apiVersion !== undefined ? String(opts.apiVersion) : undefined;

  const selected = apiVersion
    ? routes.filter((r) => detectVersionSegment(r.path) === apiVersion)
    : routes;

  // Dedupe routes by (method + path); the merged runtime+static list can
  // legitimately contain the same endpoint twice.
  const seen = new Set<string>();
  const uniqueRoutes = selected.filter((r) => {
    const key = `${r.method} ${r.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const exchangesByRoute = attributeExchanges(uniqueRoutes, exchanges);

  // Group operations by a path-derived resource tag (e.g. `users`,
  // `azure-devops`) so the document mirrors the Studio API Client sidebar
  // instead of one tag per controller class.
  const resourceTags = deriveResourceTagMap(uniqueRoutes);

  const paths: Record<string, Record<string, unknown>> = {};
  const tags = new Set<string>();
  let usedOverride = false;
  let usedInference = false;

  for (const route of uniqueRoutes) {
    const { openApiPath, params: pathParams } = toOpenApiPath(route.path);
    const method = route.method.toLowerCase();
    const routeExchanges = exchangesByRoute.get(`${route.method} ${route.path}`) ?? [];

    const operation: Record<string, unknown> = {};

    // Tag from the path-derived resource group; operationId from the
    // controller, when known.
    const resourceTag = resourceTags.get(routeKey(route));
    if (resourceTag) {
      tags.add(resourceTag);
      operation.tags = [resourceTag];
    }
    operation.summary = route.controllerMethod && route.controllerMethod !== 'Unknown'
      ? `${route.controllerMethod}()`
      : `${route.method} ${route.path}`;
    if (route.controller && route.controllerMethod && route.controllerMethod !== 'Unknown') {
      operation.operationId = sanitizeOperationId(`${route.controller}_${route.controllerMethod}`);
    }

    // Parameters: path params (always required) + query/header params from
    // both the scanner (`route.parameters`) and observed traffic.
    const parameters = buildParameters(route, pathParams, routeExchanges);
    if (parameters.length > 0) operation.parameters = parameters;

    // Request body for body-bearing verbs.
    if (BODY_METHODS.has(route.method)) {
      const { schema, fromOverride } = resolveRequestSchema(route, opts, routeExchanges);
      if (schema) {
        if (fromOverride) usedOverride = true;
        else usedInference = true;
        const example = pickRequestExample(routeExchanges);
        operation.requestBody = {
          required: true,
          content: {
            'application/json': {
              schema,
              ...(example !== undefined ? { example } : {}),
            },
          },
        };
      }
    }

    // Responses: synthesized from recorded traffic, falling back to a
    // placeholder when nothing has hit this route yet.
    const responses = buildResponses(routeExchanges);
    if (Object.keys(responses).length > 0) usedInference = true;
    operation.responses = Object.keys(responses).length > 0 ? responses : {
      default: { description: 'No recorded response yet' },
    };

    paths[openApiPath] = paths[openApiPath] ?? {};
    paths[openApiPath][method] = operation;
  }

  const provenance: GenerationProvenance =
    usedOverride && usedInference ? 'mixed' : usedOverride ? 'extracted' : 'inferred';

  const doc: OpenApiDocument = {
    openapi: '3.1.0',
    info: {
      title: opts.title ?? 'ExpressoTS API',
      version: opts.version ?? '0.0.0',
      ...(opts.description ? { description: opts.description } : {}),
      'x-expressots-generated': provenance,
    },
    paths,
  };

  if (tags.size > 0) {
    doc.tags = [...tags].sort().map((name) => ({ name }));
  }

  return doc;
}

/**
 * Group recorded exchanges by the route template they belong to. An
 * exchange is attributed to the first route whose method matches and
 * whose path template matches the concrete request path.
 */
function attributeExchanges(
  routes: RouteInfo[],
  exchanges: RecordedExchange[],
): Map<string, RecordedExchange[]> {
  const matchers = routes.map((r) => ({
    key: `${r.method} ${r.path}`,
    method: r.method,
    match: makePathMatcher(r.path),
  }));

  const out = new Map<string, RecordedExchange[]>();
  for (const exchange of exchanges) {
    const reqMethod = exchange.request?.method;
    const reqPath = exchange.request?.path;
    if (!reqMethod || !reqPath) continue;
    const hit = matchers.find((m) => m.method === reqMethod && m.match(reqPath));
    if (!hit) continue;
    const list = out.get(hit.key) ?? [];
    list.push(exchange);
    out.set(hit.key, list);
  }
  return out;
}

/** Build OpenAPI `parameters` for a route (path + query + header). */
function buildParameters(
  route: RouteInfo,
  pathParams: string[],
  routeExchanges: RecordedExchange[],
): Array<Record<string, unknown>> {
  const params: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();

  for (const name of pathParams) {
    if (seen.has(`path:${name}`)) continue;
    seen.add(`path:${name}`);
    params.push({
      name,
      in: 'path',
      required: true,
      schema: { type: 'string' },
    });
  }

  // Scanner-provided parameters (query/header), when present.
  for (const p of route.parameters ?? []) {
    if (p.type === 'path' || p.type === 'body') continue;
    const location = p.type === 'header' ? 'header' : 'query';
    const dedupeKey = `${location}:${p.name}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    params.push({
      name: p.name,
      in: location,
      required: p.required,
      schema: { type: jsonSchemaType(p.dataType) },
    });
  }

  // Query params observed in real traffic (best-effort, optional).
  for (const exchange of routeExchanges) {
    const query = exchange.request?.query;
    if (!query) continue;
    for (const name of Object.keys(query)) {
      const dedupeKey = `query:${name}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      params.push({
        name,
        in: 'query',
        required: false,
        schema: { type: 'string' },
        example: query[name],
      });
    }
  }

  return params;
}

/**
 * Resolve the request-body schema for a route. Prefers a precise schema
 * override (keyed by the `@Body()` DTO name) over the inferred sample.
 */
function resolveRequestSchema(
  route: RouteInfo,
  opts: BuildOpenApiOptions,
  routeExchanges: RecordedExchange[],
): { schema: JsonSchema | null; fromOverride: boolean } {
  if (route.bodyDto && opts.schemaOverrides) {
    const override =
      opts.schemaOverrides[route.bodyDto] ??
      (route.bodyDto.startsWith('I')
        ? opts.schemaOverrides[route.bodyDto.slice(1)]
        : undefined);
    if (override) return { schema: override, fromOverride: true };
  }

  if (route.bodySample) {
    const inferred = inferSchema(route.bodySample);
    if (inferred) return { schema: inferred, fromOverride: false };
  }

  // Last resort: union the request bodies seen in traffic.
  const bodies = routeExchanges
    .map((e) => e.request?.body)
    .filter((b) => b !== undefined && b !== null);
  if (bodies.length > 0) {
    let merged: JsonSchema | null = null;
    for (const b of bodies) merged = unionSchema(merged, inferSchema(b, false));
    if (merged) return { schema: merged, fromOverride: false };
  }

  return { schema: null, fromOverride: false };
}

/** Choose a representative request body example from recorded traffic. */
function pickRequestExample(routeExchanges: RecordedExchange[]): unknown {
  for (const e of [...routeExchanges].reverse()) {
    const body = e.request?.body;
    if (body !== undefined && body !== null) return body;
  }
  return undefined;
}

/**
 * Synthesize the `responses` object for a route by grouping recorded
 * exchanges by status code, unioning their body shapes, and attaching the
 * most recent body as an example.
 */
function buildResponses(
  routeExchanges: RecordedExchange[],
): Record<string, unknown> {
  const byStatus = new Map<number, RecordedExchange[]>();
  for (const e of routeExchanges) {
    const status = e.response?.statusCode;
    if (typeof status !== 'number') continue;
    const list = byStatus.get(status) ?? [];
    list.push(e);
    byStatus.set(status, list);
  }

  const responses: Record<string, unknown> = {};
  for (const [status, group] of byStatus) {
    // Union schema across all bodies; pick the newest non-empty body as
    // the example.
    let schema: JsonSchema | null = null;
    let example: unknown;
    let exampleTs = -Infinity;
    for (const e of group) {
      const body = e.response?.body;
      if (body === undefined || body === null) continue;
      schema = unionSchema(schema, inferSchema(body, false));
      const ts = e.response?.timestamp ?? 0;
      if (ts >= exampleTs) {
        exampleTs = ts;
        example = body;
      }
    }

    const description =
      group.find((e) => e.response?.statusMessage)?.response?.statusMessage ||
      'Response';

    responses[String(status)] = {
      description,
      ...(schema
        ? {
            content: {
              'application/json': {
                schema,
                ...(example !== undefined ? { example } : {}),
              },
            },
          }
        : {}),
    };
  }

  return responses;
}

/** Map a loosely-typed scanner `dataType` to a JSON Schema scalar type. */
function jsonSchemaType(dataType?: string): string {
  switch ((dataType ?? '').toLowerCase()) {
    case 'number':
    case 'bigint':
      return 'number';
    case 'boolean':
      return 'boolean';
    default:
      return 'string';
  }
}

/** OpenAPI operationIds must be unique tokens; keep them identifier-safe. */
function sanitizeOperationId(raw: string): string {
  return raw.replace(/[^A-Za-z0-9_]/g, '_');
}
