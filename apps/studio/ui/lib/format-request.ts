/**
 * Format a recorded exchange as a cURL command, JS fetch() snippet, or
 * OpenAPI 3.1 path snippet.
 *
 * All formatters take the same input shape as `RecordedExchange.request`
 * (method/path/headers/body) plus an optional host so the result can be
 * pasted into a terminal or shared as a reproducible repro.
 */

import type { RecordedExchange } from '../types';

export type ExportFormat = 'curl' | 'fetch' | 'openapi';

interface FormatOptions {
  /** Default host when the request didn't capture one. */
  defaultHost?: string;
  /** Treat the value as already-stringified JSON body. */
  bodyIsJson?: boolean;
}

function resolveUrl(exchange: RecordedExchange, opts: FormatOptions): string {
  const headers = exchange.request.headers || {};
  const host =
    (headers['host'] as string) ||
    (headers['Host'] as string) ||
    opts.defaultHost ||
    'localhost:3000';
  const path = exchange.request.url || exchange.request.path || '/';
  if (/^https?:\/\//i.test(path)) return path;
  return `http://${host}${path.startsWith('/') ? '' : '/'}${path}`;
}

function shellEscape(value: string): string {
  // Single-quote escape works on bash/zsh/PowerShell w/ curl. Replace inner ' with '\''.
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function stringifyBody(body: unknown): string | null {
  if (body === undefined || body === null) return null;
  if (typeof body === 'string') return body;
  try {
    return JSON.stringify(body);
  } catch {
    return String(body);
  }
}

/** Headers we never replay — they're added automatically by the client. */
const STRIP_HEADERS = new Set([
  'host',
  'content-length',
  'connection',
  'origin',
  'referer',
  'sec-ch-ua',
  'sec-ch-ua-mobile',
  'sec-ch-ua-platform',
  'sec-fetch-mode',
  'sec-fetch-site',
  'sec-fetch-dest',
]);

function relevantHeaders(headers: Record<string, string>): [string, string][] {
  return Object.entries(headers).filter(
    ([k]) => !STRIP_HEADERS.has(k.toLowerCase()),
  );
}

// ────────────────────────────────────────────────────────────────────────
// cURL
// ────────────────────────────────────────────────────────────────────────

export function toCurl(
  exchange: RecordedExchange,
  opts: FormatOptions = {},
): string {
  const url = resolveUrl(exchange, opts);
  const method = exchange.request.method.toUpperCase();
  const headers = relevantHeaders(exchange.request.headers || {});
  const body = stringifyBody(exchange.request.body);

  const parts: string[] = ['curl', '-X', method, shellEscape(url)];
  for (const [k, v] of headers) {
    parts.push('-H', shellEscape(`${k}: ${v}`));
  }
  if (body) {
    parts.push('--data-raw', shellEscape(body));
  }

  return parts.join(' \\\n  ');
}

// ────────────────────────────────────────────────────────────────────────
// JS fetch()
// ────────────────────────────────────────────────────────────────────────

export function toFetch(
  exchange: RecordedExchange,
  opts: FormatOptions = {},
): string {
  const url = resolveUrl(exchange, opts);
  const method = exchange.request.method.toUpperCase();
  const headers = relevantHeaders(exchange.request.headers || {});
  const body = stringifyBody(exchange.request.body);

  const init: Record<string, unknown> = { method };
  if (headers.length > 0) {
    init.headers = Object.fromEntries(headers);
  }
  if (body && method !== 'GET' && method !== 'HEAD') {
    init.body = body;
  }

  const serializedInit = JSON.stringify(init, null, 2);
  return `await fetch(${JSON.stringify(url)}, ${serializedInit});`;
}

// ────────────────────────────────────────────────────────────────────────
// OpenAPI 3.1
// ────────────────────────────────────────────────────────────────────────

/**
 * Emits a minimal OpenAPI 3.1 paths fragment from the captured exchange.
 * Type inference is intentionally shallow — primitives only — so the
 * output is a safe starting point rather than a finished schema.
 */
export function toOpenApi(exchange: RecordedExchange): string {
  const method = exchange.request.method.toLowerCase();
  const path = exchange.request.path || '/';
  const status = exchange.response?.statusCode ?? 200;

  const requestSchema = inferSchema(exchange.request.body);
  const responseSchema = inferSchema(exchange.response?.body);

  const op: Record<string, unknown> = {
    summary: `${exchange.request.method} ${path}`,
    responses: {
      [String(status)]: {
        description: exchange.response?.statusMessage || 'Response',
        ...(responseSchema && {
          content: { 'application/json': { schema: responseSchema } },
        }),
      },
    },
  };
  if (requestSchema && method !== 'get' && method !== 'head') {
    op.requestBody = {
      required: true,
      content: { 'application/json': { schema: requestSchema } },
    };
  }

  const doc = { paths: { [path]: { [method]: op } } };
  return JSON.stringify(doc, null, 2);
}

function inferSchema(value: unknown): Record<string, unknown> | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') return { type: 'string', example: value };
  if (typeof value === 'number')
    return { type: Number.isInteger(value) ? 'integer' : 'number', example: value };
  if (typeof value === 'boolean') return { type: 'boolean', example: value };
  if (Array.isArray(value)) {
    return {
      type: 'array',
      items: value.length > 0 ? inferSchema(value[0]) || { type: 'object' } : { type: 'object' },
    };
  }
  if (typeof value === 'object') {
    const properties: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const s = inferSchema(v);
      if (s) properties[k] = s;
    }
    return { type: 'object', properties };
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────────
// Dispatcher
// ────────────────────────────────────────────────────────────────────────

export function formatExchange(
  exchange: RecordedExchange,
  format: ExportFormat,
  opts: FormatOptions = {},
): string {
  switch (format) {
    case 'curl':
      return toCurl(exchange, opts);
    case 'fetch':
      return toFetch(exchange, opts);
    case 'openapi':
      return toOpenApi(exchange);
    default:
      return '';
  }
}

export async function copyToClipboard(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    // Fallback for non-secure contexts: synthesize a textarea
    try {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}
