/**
 * Trace detail component showing waterfall chart
 */

import { useMemo, useState, type ReactNode } from 'react';
import { X, Copy, FileCode, Boxes } from 'lucide-react';
import { cn, formatDuration, formatTimestamp, copyToClipboard } from '../lib/utils';
import { useAppStore } from '../stores/app-store';
import { openInEditor } from '../lib/open-in-editor';
import { ExportMenu } from './ExportMenu';

export function TraceDetail() {
  const {
    exchanges,
    selectedExchangeId,
    setSelectedExchangeId,
    routes,
    containerResolutionsByExchange,
  } = useAppStore();

  const exchange = useMemo(() => {
    return exchanges.find((e) => e.id === selectedExchangeId);
  }, [exchanges, selectedExchangeId]);

  // Match the recorded request against a registered route so we can offer
  // "Open in editor" for the controller that handled it. Tries an exact
  // path match first then falls back to the deepest matching pattern
  // (so /users/123 matches the /users/:id route).
  const matchedRoute = useMemo(() => {
    if (!exchange) return undefined;
    const exact = routes.find(
      (r) =>
        r.method === exchange.request.method && r.path === exchange.request.path,
    );
    if (exact) return exact;
    const candidates = routes.filter((r) => r.method === exchange.request.method);
    return candidates
      .map((r) => ({ r, score: routeMatchScore(r.path, exchange.request.path) }))
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score)[0]?.r;
  }, [exchange, routes]);

  const resolvedBindings = useMemo(() => {
    if (!exchange) return [];
    return containerResolutionsByExchange[exchange.id] ?? [];
  }, [exchange, containerResolutionsByExchange]);

  if (!exchange) {
    return null;
  }

  const { request, response, trace } = exchange;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setSelectedExchangeId(null)}
      />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-2xl bg-gray-900 border-l border-gray-800 overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <span className={cn(
              'px-2 py-1 rounded text-xs font-mono font-semibold',
              response.statusCode >= 400 ? 'bg-error-500/10 text-error-500' : 'bg-success-500/10 text-success-500'
            )}>
              {response.statusCode}
            </span>
            <span className="font-mono text-sm text-gray-300">{request.method} {request.path}</span>
          </div>
          <button
            onClick={() => setSelectedExchangeId(null)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary */}
        <div className="p-4 border-b border-gray-800">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Duration</p>
              <p className="text-lg font-semibold text-white mt-1">
                {formatDuration(response.duration)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Time</p>
              <p className="text-lg font-semibold text-white mt-1">
                {formatTimestamp(request.timestamp)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
              <p className={cn(
                'text-lg font-semibold mt-1',
                response.statusCode >= 400 ? 'text-error-500' : 'text-success-500'
              )}>
                {response.statusCode} {response.statusMessage}
              </p>
            </div>
          </div>
        </div>

        {/* Source / DI panel */}
        {(matchedRoute || resolvedBindings.length > 0) && (
          <div className="p-4 border-b border-gray-800 space-y-3">
            {matchedRoute && matchedRoute.filePath && (
              <div className="flex items-center justify-between bg-gray-800/40 border border-gray-700 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileCode className="w-4 h-4 text-primary-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">
                      {matchedRoute.controller}
                      <span className="text-gray-500">.</span>
                      <span className="text-primary-300">{matchedRoute.controllerMethod}()</span>
                    </div>
                    <div className="text-[11px] text-gray-500 truncate font-mono">
                      {matchedRoute.filePath}
                      {matchedRoute.lineNumber ? `:${matchedRoute.lineNumber}` : ''}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() =>
                    openInEditor({
                      filePath: matchedRoute.filePath,
                      lineNumber: matchedRoute.lineNumber,
                    })
                  }
                  className="ml-3 px-3 py-1.5 text-xs font-medium bg-primary-700 hover:bg-primary-600 text-white rounded"
                >
                  Open in editor
                </button>
              </div>
            )}

            {resolvedBindings.length > 0 && (
              <div className="bg-gray-800/40 border border-gray-700 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <Boxes className="w-4 h-4 text-primary-400" />
                  <span className="text-sm font-medium text-white">
                    Resolved bindings ({resolvedBindings.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {resolvedBindings.map((b) => (
                    <span
                      key={b}
                      className="px-2 py-0.5 text-[11px] font-mono bg-primary-950/60 border border-primary-700/40 text-primary-300 rounded"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <TraceWaterfall trace={trace} />

        <CollapsibleSection title="Request Headers" defaultOpen>
          <HeaderTable headers={request.headers} />
        </CollapsibleSection>

        {request.body ? (
          <CollapsibleSection title="Request Body">
            <JsonViewer data={request.body} />
          </CollapsibleSection>
        ) : null}

        <CollapsibleSection title="Response Headers">
          <HeaderTable headers={response.headers} />
        </CollapsibleSection>

        {response.body ? (
          <CollapsibleSection title="Response Body" defaultOpen>
            <JsonViewer data={response.body} />
          </CollapsibleSection>
        ) : null}

        {/* Actions */}
        <div className="p-4 border-t border-gray-800 flex gap-2 items-center">
          <button
            onClick={() => copyToClipboard(JSON.stringify(exchange, null, 2))}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
          >
            <Copy className="w-4 h-4" />
            Copy as JSON
          </button>
          <ExportMenu exchange={exchange} />
        </div>
      </div>
    </div>
  );
}

/**
 * Heuristic scoring of route path patterns against a recorded URL path.
 * `/users/:id` matches `/users/123` with score 2 (2 literal segments matched),
 * `/users` against `/users/123` does not match → 0.
 */
function routeMatchScore(routePath: string, requestPath: string): number {
  const rSegs = routePath.split('/').filter(Boolean);
  const pSegs = requestPath.split('/').filter(Boolean);
  if (rSegs.length !== pSegs.length) return 0;
  let score = 0;
  for (let i = 0; i < rSegs.length; i++) {
    const r = rSegs[i];
    const p = pSegs[i];
    if (r.startsWith(':') || r === '*') {
      score += 1; // wildcard match
    } else if (r === p) {
      score += 2; // literal match
    } else {
      return 0;
    }
  }
  return score;
}

interface TraceWaterfallProps {
  trace?: {
    traceId: string;
    startTime: number;
    endTime: number;
    duration: number;
    spans: Array<{
      spanId: string;
      name: string;
      startTime: number;
      duration: number;
      status: string;
    }>;
  };
}

function TraceWaterfall({ trace }: TraceWaterfallProps) {
  if (!trace || trace.spans.length === 0) {
    return null;
  }

  return (
    <div className="p-4 border-b border-gray-800">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
        Trace Waterfall
      </h3>
      <div className="space-y-2">
        {trace.spans
          .sort((a, b) => a.startTime - b.startTime)
          .map((span) => {
            const relativeStart = ((span.startTime - trace.startTime) / trace.duration) * 100;
            const width = (span.duration / trace.duration) * 100;

            return (
              <div key={span.spanId} className="flex items-center gap-2">
                <div className="w-32 text-xs text-gray-500 truncate">
                  {span.name}
                </div>
                <div className="flex-1 h-6 bg-gray-800 rounded relative">
                  <div
                    className={cn(
                      'absolute h-full rounded',
                      span.status === 'ERROR' ? 'bg-error-500' : 'bg-primary-500'
                    )}
                    style={{
                      left: `${relativeStart}%`,
                      width: `${Math.max(width, 1)}%`,
                    }}
                  />
                </div>
                <div className="w-16 text-xs text-gray-500 text-right">
                  {formatDuration(span.duration)}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

function CollapsibleSection({ title, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-800">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-800/50 transition-colors"
      >
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">{title}</h3>
        <span className="text-gray-500 text-sm">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

interface HeaderTableProps {
  headers: Record<string, string>;
}

function HeaderTable({ headers }: HeaderTableProps) {
  const entries = Object.entries(headers);

  if (entries.length === 0) {
    return <p className="text-sm text-gray-500">No headers</p>;
  }

  return (
    <div className="space-y-1">
      {entries.map(([key, value]) => (
        <div key={key} className="flex text-sm">
          <span className="text-gray-500 w-40 flex-shrink-0 font-mono">{key}:</span>
          <span className="text-gray-300 font-mono break-all">{value}</span>
        </div>
      ))}
    </div>
  );
}

interface JsonViewerProps {
  data: unknown;
}

function JsonViewer({ data }: JsonViewerProps) {
  const formatted = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  return (
    <pre className="text-sm font-mono text-gray-300 bg-gray-800/50 rounded-lg p-4 overflow-x-auto">
      {formatted}
    </pre>
  );
}
