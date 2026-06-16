/**
 * Snapshot bundling — packages everything Studio knows about a single
 * request into a portable artifact suitable for bug reports.
 *
 * Output formats:
 *   - JSON: machine-readable, includes the full exchange, logs, resolved
 *     bindings, matched route, and a minimal app context (Studio version,
 *     agent URL, ts).
 *   - Markdown: a human-readable summary with the same data, formatted
 *     for pasting into a GitHub issue.
 */

import type { LogEntry, RecordedExchange, RouteInfo } from '../types';
import { formatExchange } from './format-request';

export interface SnapshotInput {
  exchange: RecordedExchange;
  route?: RouteInfo;
  logs: LogEntry[];
  resolvedBindings: string[];
  agentUrl: string;
  studioVersion?: string;
}

export interface SnapshotJson {
  generatedAt: string;
  studioVersion: string;
  agentUrl: string;
  request: RecordedExchange['request'];
  response: RecordedExchange['response'];
  matchedRoute?: RouteInfo;
  resolvedBindings: string[];
  logs: LogEntry[];
  /** cURL reproduction for the request. */
  curl: string;
}

/** Build the in-memory snapshot object. */
export function buildSnapshot(input: SnapshotInput): SnapshotJson {
  return {
    generatedAt: new Date().toISOString(),
    studioVersion: input.studioVersion ?? 'dev',
    agentUrl: input.agentUrl,
    request: input.exchange.request,
    response: input.exchange.response,
    matchedRoute: input.route,
    resolvedBindings: input.resolvedBindings,
    logs: input.logs,
    curl: formatExchange(input.exchange, 'curl'),
  };
}

/** Convert the snapshot to a markdown bug-report draft. */
export function snapshotToMarkdown(snap: SnapshotJson): string {
  const lines: string[] = [];
  const { request, response, matchedRoute, resolvedBindings, logs } = snap;

  lines.push(`# Bug report — \`${request.method} ${request.path}\``);
  lines.push('');
  lines.push(`**Status:** \`${response.statusCode}${response.statusMessage ? ' ' + response.statusMessage : ''}\` · **Duration:** ${response.duration}ms`);
  lines.push(`**Generated:** ${snap.generatedAt}  ·  **Studio:** ${snap.studioVersion}`);
  lines.push('');

  if (matchedRoute) {
    lines.push('## Handler');
    lines.push(`- Controller: \`${matchedRoute.controller}.${matchedRoute.controllerMethod}()\``);
    if (matchedRoute.filePath) {
      lines.push(`- File: \`${matchedRoute.filePath}${matchedRoute.lineNumber ? ':' + matchedRoute.lineNumber : ''}\``);
    }
    lines.push('');
  }

  lines.push('## Request');
  lines.push('```http');
  lines.push(`${request.method} ${request.url ?? request.path}`);
  for (const [k, v] of Object.entries(request.headers ?? {})) {
    lines.push(`${k}: ${v}`);
  }
  lines.push('');
  if (request.body !== undefined && request.body !== null) {
    lines.push(typeof request.body === 'string' ? request.body : JSON.stringify(request.body, null, 2));
  }
  lines.push('```');
  lines.push('');

  lines.push('## Response');
  lines.push('```json');
  lines.push(JSON.stringify(response.body ?? null, null, 2));
  lines.push('```');
  lines.push('');

  if (resolvedBindings.length > 0) {
    lines.push('## Resolved DI bindings');
    for (const b of resolvedBindings) lines.push(`- \`${b}\``);
    lines.push('');
  }

  if (logs.length > 0) {
    lines.push('## Logs during this request');
    lines.push('```');
    for (const log of logs) {
      const ts = new Date(log.timestamp).toISOString().substring(11, 23);
      lines.push(`${ts} [${log.level.toUpperCase().padEnd(5)}] ${log.message}`);
    }
    lines.push('```');
    lines.push('');
  }

  lines.push('## Reproduce');
  lines.push('```bash');
  lines.push(snap.curl);
  lines.push('```');

  return lines.join('\n');
}

/** Trigger a browser download of a `Blob` with the given filename. */
export function triggerDownload(filename: string, content: string, mime = 'application/json'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so Firefox completes the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Convenience: build, then download as either format. */
export function exportSnapshot(input: SnapshotInput, format: 'json' | 'markdown'): void {
  const snap = buildSnapshot(input);
  const safePath = (input.exchange.request.path || 'request')
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 40) || 'request';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  if (format === 'json') {
    triggerDownload(
      `studio-snapshot-${safePath}-${stamp}.json`,
      JSON.stringify(snap, null, 2),
      'application/json',
    );
  } else {
    triggerDownload(
      `studio-snapshot-${safePath}-${stamp}.md`,
      snapshotToMarkdown(snap),
      'text/markdown',
    );
  }
}
