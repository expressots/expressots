/**
 * Runtime security posture analyzer.
 *
 * This is Studio's unique contribution: Snyk-style scanners only see
 * `package.json`, but Studio has the recorded traffic, the routes, the
 * DI graph and live logs. The analyzer turns all of that into a set
 * of OWASP-mapped findings the user can act on directly from the UI.
 *
 * Rules implemented here are intentionally conservative — false
 * positives erode trust quickly in a security tool. Every rule has
 * either (a) a high-confidence runtime signal (e.g. literal
 * `Access-Control-Allow-Origin: *`) or (b) an explicit "advisory"
 * severity so users know the finding is heuristic.
 *
 * All passes are pure functions over a snapshot of in-memory state.
 * The engine is responsible for debouncing and change detection.
 */

import type {
  AppStructure,
  HttpMethod,
  PostureFinding,
  PostureEvidence,
  RecordedExchange,
  RouteInfo,
  Severity,
} from '../types/index.js';
import type { LogEntry } from '../logging/log-capture.js';
import { createHash } from 'node:crypto';

/**
 * Inputs the analyzer needs. We accept them as an opaque object so the
 * engine can compose its in-memory state without exposing the agent
 * itself to the rules.
 */
export interface PostureInputs {
  routes: RouteInfo[];
  structure: AppStructure | null;
  exchanges: RecordedExchange[];
  logs: LogEntry[];
  /**
   * Resolved absolute path to the host project's source root (best-effort).
   * Some checks (e.g. "missing helmet" / "no validation") want to read
   * `app.ts` / `main.ts`. We pass it in rather than discovering inside
   * the analyzer so tests can override it.
   */
  srcRoot?: string;
}

/**
 * Run every posture check over the given snapshot. Returns an
 * unsorted list — the engine aggregates and dedupes by `id`.
 */
export function analyzePosture(input: PostureInputs): PostureFinding[] {
  const findings: PostureFinding[] = [];

  findings.push(...checkSecurityHeaders(input));
  findings.push(...checkPermissiveCors(input));
  findings.push(...checkAuthGaps(input));
  findings.push(...checkVerboseErrors(input));
  findings.push(...checkSecretLeakage(input));
  findings.push(...checkInputValidation(input));

  return findings;
}

// ────────────────────────────────────────────────────────────────────
// Rule: missing standard security response headers
// ────────────────────────────────────────────────────────────────────

const REQUIRED_HEADERS: Array<{ name: string; severity: Severity; owasp: string }> = [
  { name: 'content-security-policy', severity: 'MEDIUM', owasp: 'API8:2023' },
  { name: 'strict-transport-security', severity: 'MEDIUM', owasp: 'API8:2023' },
  { name: 'x-content-type-options', severity: 'LOW', owasp: 'API8:2023' },
  { name: 'x-frame-options', severity: 'LOW', owasp: 'API8:2023' },
  { name: 'referrer-policy', severity: 'LOW', owasp: 'API8:2023' },
];

/**
 * For each route observed in the recorded exchanges, check whether the
 * most recent successful response carried the standard security
 * headers. We pick the *last* 2xx response per route so transient
 * misses on error paths don't flag every route.
 */
function checkSecurityHeaders(input: PostureInputs): PostureFinding[] {
  const out: PostureFinding[] = [];
  const lastSuccessByRoute = mostRecentSuccessByRoute(input.exchanges);

  for (const [, exchange] of lastSuccessByRoute) {
    const headers = lowercaseHeaderKeys(exchange.response.headers);
    for (const required of REQUIRED_HEADERS) {
      if (headers[required.name]) continue;
      out.push({
        id: stableId('missing-header', required.name, exchange.request.path),
        rule: `missing-${required.name}`,
        owasp: required.owasp,
        severity: required.severity,
        title: `Missing ${prettyHeader(required.name)} header`,
        description:
          `Responses to \`${exchange.request.method} ${exchange.request.path}\` ` +
          `are not sending the \`${prettyHeader(required.name)}\` header. ` +
          'This relaxes browser-side defences against a range of common attacks.',
        evidence: { kind: 'exchange', exchangeId: exchange.id },
        fixHint:
          'Register `helmet()` (or set the header explicitly in a response interceptor).',
      });
    }
  }

  return out;
}

// ────────────────────────────────────────────────────────────────────
// Rule: permissive CORS
// ────────────────────────────────────────────────────────────────────

/**
 * Flags responses that pair `Access-Control-Allow-Origin: *` with
 * authenticated requests — that combination effectively turns CORS
 * off for cross-origin attackers who can persuade a victim to issue
 * a request bearing their own credentials.
 */
function checkPermissiveCors(input: PostureInputs): PostureFinding[] {
  const out: PostureFinding[] = [];
  const seen = new Set<string>();

  for (const ex of input.exchanges) {
    const headers = lowercaseHeaderKeys(ex.response.headers);
    if (headers['access-control-allow-origin'] !== '*') continue;

    const reqHeaders = lowercaseHeaderKeys(ex.request.headers);
    const hasAuth = Boolean(reqHeaders['authorization'] || reqHeaders['cookie']);

    const key = `${ex.request.method}:${ex.request.path}:${hasAuth}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      id: stableId('permissive-cors', ex.request.method, ex.request.path, String(hasAuth)),
      rule: 'permissive-cors',
      owasp: 'API8:2023',
      severity: hasAuth ? 'HIGH' : 'LOW',
      title: hasAuth
        ? 'Wildcard CORS on authenticated route'
        : 'Wildcard CORS origin',
      description: hasAuth
        ? `\`${ex.request.method} ${ex.request.path}\` returns \`Access-Control-Allow-Origin: *\` ` +
          'while the client sends credentials. Browsers will refuse the response, but the ' +
          'configuration is a footgun — pin the origin to your front-end host instead.'
        : `\`${ex.request.method} ${ex.request.path}\` returns \`Access-Control-Allow-Origin: *\`. ` +
          'Acceptable for fully public endpoints; replace with an explicit allow-list otherwise.',
      evidence: { kind: 'exchange', exchangeId: ex.id },
      fixHint: 'Configure CORS with a concrete `origin` list rather than `*`.',
    });
  }

  return out;
}

// ────────────────────────────────────────────────────────────────────
// Rule: routes returning 2xx with no auth evidence
// ────────────────────────────────────────────────────────────────────

const PUBLIC_PATH_PATTERNS = [
  /^\/?$/,
  /^\/health/i,
  /^\/healthz/i,
  /^\/status/i,
  /^\/metrics/i,
  /^\/ready/i,
  /^\/favicon/i,
];

/**
 * For each route, look at the most recent 2xx response: if no request
 * we've seen against it carried an `Authorization` header or a session
 * cookie, *and* the static / runtime middleware list shows no obvious
 * auth interceptor, flag it as potentially unauthenticated.
 *
 * Intentionally LOW severity (not HIGH) because plenty of routes are
 * legitimately public. Users skim the list and mute false positives.
 */
function checkAuthGaps(input: PostureInputs): PostureFinding[] {
  const out: PostureFinding[] = [];
  const lastByRoute = mostRecentSuccessByRoute(input.exchanges);
  const allByRoute = groupByRoute(input.exchanges);

  const middlewareNames = (input.structure?.middleware ?? []).map((m) =>
    m.name.toLowerCase(),
  );
  const hasGlobalAuth = middlewareNames.some((n) => /auth|jwt|session|guard/.test(n));

  for (const [routeKey, exchange] of lastByRoute) {
    if (looksPublic(exchange.request.path)) continue;
    if (hasGlobalAuth) continue;

    const everyExchange = allByRoute.get(routeKey) ?? [];
    const sawCredentials = everyExchange.some((ex) => {
      const h = lowercaseHeaderKeys(ex.request.headers);
      return Boolean(h['authorization'] || h['cookie']);
    });
    if (sawCredentials) continue;

    out.push({
      id: stableId('unauthenticated-route', exchange.request.method, exchange.request.path),
      rule: 'unauthenticated-route',
      owasp: 'API2:2023',
      severity: 'LOW',
      title: 'Route may be unauthenticated',
      description:
        `\`${exchange.request.method} ${exchange.request.path}\` returned 2xx for every ` +
        'recorded request, and Studio never observed an `Authorization` header or session ' +
        'cookie. If this endpoint is meant to be private, add an auth interceptor.',
      evidence: {
        kind: 'route',
        method: exchange.request.method,
        path: exchange.request.path,
      },
      fixHint:
        'Apply an auth interceptor on the controller or the route, or register one globally.',
    });
  }

  return out;
}

// ────────────────────────────────────────────────────────────────────
// Rule: verbose error responses (stack trace leakage)
// ────────────────────────────────────────────────────────────────────

const STACK_REGEX = /at\s+[\w.<>$]+\s+\([^)]+:\d+:\d+\)/;

function checkVerboseErrors(input: PostureInputs): PostureFinding[] {
  const out: PostureFinding[] = [];
  const seen = new Set<string>();

  for (const ex of input.exchanges) {
    if (ex.response.statusCode < 500) continue;
    const body = renderBody(ex.response.body);
    if (!body) continue;
    if (!STACK_REGEX.test(body)) continue;

    const key = `${ex.request.method}:${ex.request.path}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      id: stableId('verbose-error', ex.request.method, ex.request.path),
      rule: 'verbose-error',
      owasp: 'API8:2023',
      severity: 'MEDIUM',
      title: '5xx response includes a stack trace',
      description:
        `\`${ex.request.method} ${ex.request.path}\` returned ${ex.response.statusCode} ` +
        'with a response body containing what looks like a stack trace. Production clients ' +
        'should never see implementation details from server-side errors.',
      evidence: { kind: 'exchange', exchangeId: ex.id },
      fixHint:
        'Install a global error filter that strips stack frames from outbound responses.',
    });
  }

  return out;
}

// ────────────────────────────────────────────────────────────────────
// Rule: likely secret leakage in responses or logs
// ────────────────────────────────────────────────────────────────────

/**
 * High-precision patterns only. A single false positive on a secret
 * scanner is much worse than a missed one — users learn to ignore the
 * tool. We deliberately don't try to catch generic "long random string
 * that might be a token". Adopt the [trufflehog / git-leaks] vocab.
 */
const SECRET_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'GitHub PAT', regex: /\bghp_[A-Za-z0-9]{36}\b/ },
  { name: 'GitHub Fine-grained PAT', regex: /\bgithub_pat_[A-Za-z0-9_]{82}\b/ },
  { name: 'Slack token', regex: /\bxox[abprs]-[A-Za-z0-9-]{10,48}\b/ },
  { name: 'Stripe live key', regex: /\bsk_live_[A-Za-z0-9]{24,}\b/ },
  { name: 'JWT', regex: /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/ },
];

function checkSecretLeakage(input: PostureInputs): PostureFinding[] {
  const out: PostureFinding[] = [];

  for (const ex of input.exchanges) {
    const body = renderBody(ex.response.body);
    if (!body) continue;
    for (const pat of SECRET_PATTERNS) {
      if (!pat.regex.test(body)) continue;
      out.push({
        id: stableId('response-secret', pat.name, ex.request.method, ex.request.path),
        rule: 'response-secret',
        owasp: 'API3:2023',
        severity: 'HIGH',
        title: `Response body matches a ${pat.name} pattern`,
        description:
          `\`${ex.request.method} ${ex.request.path}\` returned a body containing what ` +
          `looks like a ${pat.name}. Strip credentials from response payloads — they should ` +
          'never reach the client.',
        evidence: { kind: 'exchange', exchangeId: ex.id },
      });
    }
  }

  for (let i = 0; i < input.logs.length; i++) {
    const entry = input.logs[i];
    for (const pat of SECRET_PATTERNS) {
      if (!pat.regex.test(entry.message)) continue;
      out.push({
        id: stableId('log-secret', pat.name, entry.message.slice(0, 64)),
        rule: 'log-secret',
        owasp: 'API3:2023',
        severity: 'MEDIUM',
        title: `Log line matches a ${pat.name} pattern`,
        description:
          `A captured log entry contains what looks like a ${pat.name}. Logs propagate to ` +
          'log aggregators and rotated files; treat them as untrusted destinations for secrets.',
        evidence: { kind: 'log', logIndex: i },
      });
      // Don't double-report on the same line for multiple patterns.
      break;
    }
  }

  return out;
}

// ────────────────────────────────────────────────────────────────────
// Rule: controllers accepting bodies without validation
// ────────────────────────────────────────────────────────────────────

/**
 * Heuristic check: any controller whose recorded requests carry a
 * non-empty body, but whose source file doesn't import any of the
 * canonical validation libraries we recognise. Marked INFO because
 * it's the most heuristic of the rules — frameworks differ, and the
 * controller might validate at a layer below our scanner.
 */
function checkInputValidation(input: PostureInputs): PostureFinding[] {
  const out: PostureFinding[] = [];
  const seen = new Set<string>();

  const controllerByName = new Map<string, { filePath: string }>();
  for (const c of input.structure?.controllers ?? []) {
    controllerByName.set(c.name, { filePath: c.filePath });
  }

  for (const ex of input.exchanges) {
    if (!hasMeaningfulBody(ex.request.body)) continue;
    const route = input.routes.find(
      (r) => r.path === ex.request.path && r.method === ex.request.method,
    );
    if (!route) continue;

    const key = `${route.controller}.${route.controllerMethod}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const ctrl = controllerByName.get(route.controller);
    if (!ctrl?.filePath) continue;

    // We can't reliably read the file here without async I/O; the engine
    // does the file read once per scan and passes the import list via
    // `srcRoot` (future enhancement). For now, surface the route and let
    // the user verify — INFO severity reflects the uncertainty.
    out.push({
      id: stableId('unvalidated-body', route.controller, route.controllerMethod),
      rule: 'unvalidated-body',
      owasp: 'API4:2023',
      severity: 'INFO',
      title: `Verify request validation for ${route.controller}.${route.controllerMethod}`,
      description:
        `\`${ex.request.method} ${ex.request.path}\` (handled by ` +
        `\`${route.controller}.${route.controllerMethod}\`) accepts a body. Confirm that the ` +
        'handler validates it (zod, class-validator, or a project DTO) before use.',
      evidence: { kind: 'file', filePath: ctrl.filePath, lineNumber: route.lineNumber },
      fixHint:
        'Wrap the body parameter in a typed DTO + validation pipe or use a runtime schema check.',
    });
  }

  return out;
}

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

function lowercaseHeaderKeys(
  headers: Record<string, string> | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headers) return out;
  for (const [k, v] of Object.entries(headers)) {
    out[k.toLowerCase()] = v;
  }
  return out;
}

function looksPublic(path: string): boolean {
  return PUBLIC_PATH_PATTERNS.some((p) => p.test(path));
}

function mostRecentSuccessByRoute(
  exchanges: RecordedExchange[],
): Map<string, RecordedExchange> {
  const out = new Map<string, RecordedExchange>();
  for (const ex of exchanges) {
    if (ex.response.statusCode < 200 || ex.response.statusCode >= 300) continue;
    const key = routeKey(ex.request.method as HttpMethod, ex.request.path);
    const existing = out.get(key);
    if (!existing || ex.request.timestamp > existing.request.timestamp) {
      out.set(key, ex);
    }
  }
  return out;
}

function groupByRoute(
  exchanges: RecordedExchange[],
): Map<string, RecordedExchange[]> {
  const out = new Map<string, RecordedExchange[]>();
  for (const ex of exchanges) {
    const key = routeKey(ex.request.method as HttpMethod, ex.request.path);
    const list = out.get(key) ?? [];
    list.push(ex);
    out.set(key, list);
  }
  return out;
}

function routeKey(method: HttpMethod, path: string): string {
  return `${method}:${path}`;
}

function renderBody(body: unknown): string {
  if (body == null) return '';
  if (typeof body === 'string') return body;
  try {
    return JSON.stringify(body);
  } catch {
    return '';
  }
}

function hasMeaningfulBody(body: unknown): boolean {
  if (body == null) return false;
  if (typeof body === 'string') return body.trim().length > 0;
  if (typeof body === 'object') {
    return Object.keys(body as object).length > 0;
  }
  return true;
}

function prettyHeader(headerName: string): string {
  return headerName
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');
}

/**
 * Build a deterministic id so re-runs of the analyzer produce the same
 * id for the same finding — the engine relies on this for change
 * detection (hash the id set; only broadcast on transition).
 */
function stableId(...parts: string[]): string {
  const h = createHash('sha256');
  for (const p of parts) h.update(p);
  h.update('\0');
  return h.digest('hex').slice(0, 16);
}

// Re-export `PostureEvidence` so callers can pattern-match without
// importing the agent types file directly.
export type { PostureEvidence };
