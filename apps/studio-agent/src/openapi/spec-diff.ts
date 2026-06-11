/**
 * Spec drift detection.
 *
 * Compares a committed OpenAPI document against what the running app
 * actually exposes (static routes) and actually returns (recorded
 * traffic). This is Studio's differentiator: decorator-only generators
 * can't see real responses, so they can't tell you when your published
 * contract has drifted from reality.
 *
 * Read-only and pure: callers pass the parsed committed spec plus the
 * live route inventory and exchanges.
 */

import type { RouteInfo, RecordedExchange } from '../types/index.js';
import type { BuildOpenApiOptions, OpenApiDocument } from './types.js';
import { buildOpenApiDocument } from './spec-builder.js';
import { makePathMatcher, toOpenApiPath } from './path-utils.js';

export type SpecDriftSeverity = 'info' | 'warning' | 'error';

export interface SpecDriftFinding {
  /** Stable-ish rule slug for grouping / filtering in the UI. */
  rule:
    | 'route-missing-in-spec'
    | 'route-missing-in-code'
    | 'undocumented-status'
    | 'required-field-drift';
  severity: SpecDriftSeverity;
  method: string;
  path: string;
  /** Human-readable explanation. */
  message: string;
}

export interface SpecDriftReport {
  generatedAt: number;
  /** Total routes considered after version filtering. */
  routeCount: number;
  /** Number of recorded exchanges that informed the diff. */
  exchangeCount: number;
  findings: SpecDriftFinding[];
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

/**
 * Compute drift between a committed spec and the live app.
 *
 * @param committed - the parsed `openapi.json` the team publishes.
 * @param routes - current static route inventory.
 * @param exchanges - recorded traffic used for status / field-frequency checks.
 * @param opts - generation options forwarded to `buildOpenApiDocument`
 *   (e.g. `apiVersion` to restrict the comparison to one version).
 * @returns A report listing every drift finding with rule, severity, and
 *   a human-readable message.
 */
export function diffOpenApiSpec(
  committed: OpenApiDocument | Record<string, unknown>,
  routes: RouteInfo[],
  exchanges: RecordedExchange[] = [],
  opts: BuildOpenApiOptions = {},
): SpecDriftReport {
  const generated = buildOpenApiDocument(routes, exchanges, opts);
  const findings: SpecDriftFinding[] = [];

  const committedOps = collectOperations(committed as OpenApiDocument);
  const generatedOps = collectOperations(generated);

  // (1) Routes in code but missing from the committed spec.
  for (const key of generatedOps.keys()) {
    if (!committedOps.has(key)) {
      const [method, path] = splitKey(key);
      findings.push({
        rule: 'route-missing-in-spec',
        severity: 'warning',
        method,
        path,
        message: `${method.toUpperCase()} ${path} exists in code but is not in the committed spec.`,
      });
    }
  }

  // (2) Routes in the committed spec but missing from code.
  for (const key of committedOps.keys()) {
    if (!generatedOps.has(key)) {
      const [method, path] = splitKey(key);
      findings.push({
        rule: 'route-missing-in-code',
        severity: 'error',
        method,
        path,
        message: `${method.toUpperCase()} ${path} is documented in the spec but no matching route was found in code.`,
      });
    }
  }

  // (3) Status codes observed in traffic but undocumented for a shared op.
  const observed = observedStatusesByOp(routes, exchanges);
  for (const [key, statuses] of observed) {
    if (!committedOps.has(key)) continue; // already flagged as missing route
    const committedOp = committedOps.get(key)!;
    const documented = new Set(Object.keys((committedOp.responses as Record<string, unknown>) ?? {}));
    const [method, path] = splitKey(key);
    for (const status of statuses) {
      if (!documented.has(String(status)) && !documented.has('default')) {
        findings.push({
          rule: 'undocumented-status',
          severity: 'warning',
          method,
          path,
          message: `${method.toUpperCase()} ${path} returned ${status} in recorded traffic but the spec does not document it.`,
        });
      }
    }
  }

  // (4) Required-field drift: a field the spec marks required is absent in
  //     a fraction of recorded successful responses.
  const responseBodies = responseBodiesByOpStatus(routes, exchanges);
  for (const [key, op] of committedOps) {
    const responsesObj = (op.responses as Record<string, unknown>) ?? {};
    for (const [status, resp] of Object.entries(responsesObj)) {
      const required = extractRequired(resp as Record<string, unknown>);
      if (required.length === 0) continue;
      const bodies = responseBodies.get(`${key}|${status}`) ?? [];
      if (bodies.length === 0) continue;
      const [method, path] = splitKey(key);
      for (const field of required) {
        const absent = bodies.filter(
          (b) => !(b && typeof b === 'object' && field in (b as Record<string, unknown>)),
        ).length;
        if (absent > 0) {
          const pct = Math.round((absent / bodies.length) * 100);
          findings.push({
            rule: 'required-field-drift',
            severity: pct >= 50 ? 'error' : 'warning',
            method,
            path,
            message: `${method.toUpperCase()} ${path} (${status}): required field "${field}" is absent in ${pct}% of ${bodies.length} recorded responses.`,
          });
        }
      }
    }
  }

  return {
    generatedAt: Date.now(),
    routeCount: generatedOps.size,
    exchangeCount: exchanges.length,
    findings,
  };
}

/** Flatten an OpenAPI document into a `method PATH` -> operation map. */
function collectOperations(
  doc: OpenApiDocument,
): Map<string, Record<string, unknown>> {
  const out = new Map<string, Record<string, unknown>>();
  const paths = (doc?.paths as Record<string, Record<string, unknown>>) ?? {};
  for (const [path, item] of Object.entries(paths)) {
    if (!item || typeof item !== 'object') continue;
    for (const method of HTTP_METHODS) {
      if (method in item) {
        out.set(`${method} ${normalizeTemplate(path)}`, item[method] as Record<string, unknown>);
      }
    }
  }
  return out;
}

/** Statuses observed per operation, keyed `method PATH` (openapi template). */
function observedStatusesByOp(
  routes: RouteInfo[],
  exchanges: RecordedExchange[],
): Map<string, Set<number>> {
  const out = new Map<string, Set<number>>();
  const matchers = buildMatchers(routes);
  for (const e of exchanges) {
    const method = e.request?.method;
    const path = e.request?.path;
    const status = e.response?.statusCode;
    if (!method || !path || typeof status !== 'number') continue;
    const hit = matchers.find((m) => m.method === method && m.match(path));
    if (!hit) continue;
    const set = out.get(hit.key) ?? new Set<number>();
    set.add(status);
    out.set(hit.key, set);
  }
  return out;
}

/** Recorded response bodies keyed `method PATH|status`. */
function responseBodiesByOpStatus(
  routes: RouteInfo[],
  exchanges: RecordedExchange[],
): Map<string, unknown[]> {
  const out = new Map<string, unknown[]>();
  const matchers = buildMatchers(routes);
  for (const e of exchanges) {
    const method = e.request?.method;
    const path = e.request?.path;
    const status = e.response?.statusCode;
    if (!method || !path || typeof status !== 'number') continue;
    const hit = matchers.find((m) => m.method === method && m.match(path));
    if (!hit) continue;
    const body = e.response?.body;
    if (body === undefined || body === null) continue;
    const mapKey = `${hit.key}|${status}`;
    const list = out.get(mapKey) ?? [];
    list.push(body);
    out.set(mapKey, list);
  }
  return out;
}

function buildMatchers(routes: RouteInfo[]) {
  return routes.map((r) => ({
    // Normalise the trailing slash so traffic-derived keys line up with
    // the committed/generated operation keys (which `collectOperations`
    // also normalises). Without this, a route like `/api/` never matches
    // its `/api` spec entry and status / field-drift checks silently skip.
    key: `${r.method.toLowerCase()} ${normalizeTemplate(toOpenApiPath(r.path).openApiPath)}`,
    method: r.method,
    match: makePathMatcher(r.path),
  }));
}

/** Pull `required: [...]` out of a response's JSON schema, if present. */
function extractRequired(resp: Record<string, unknown>): string[] {
  const content = resp?.content as Record<string, unknown> | undefined;
  if (!content) return [];
  const json = content['application/json'] as Record<string, unknown> | undefined;
  const schema = json?.schema as Record<string, unknown> | undefined;
  const required = schema?.required;
  return Array.isArray(required) ? (required.filter((x) => typeof x === 'string') as string[]) : [];
}

/** Normalize a path template so committed `{id}` and ours line up. */
function normalizeTemplate(path: string): string {
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path;
}

function splitKey(key: string): [string, string] {
  const idx = key.indexOf(' ');
  return [key.slice(0, idx), key.slice(idx + 1)];
}
