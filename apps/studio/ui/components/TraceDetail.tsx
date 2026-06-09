/**
 * Trace detail component showing waterfall chart
 */

import { useMemo, useState, type ReactNode } from 'react';
import { X, Copy, FileCode, Boxes, Download, FileText, ChevronDown } from 'lucide-react';
import { cn, formatDuration, formatTimestamp, copyToClipboard } from '../lib/utils';
import { useAppStore } from '../stores/app-store';
import { openInEditor } from '../lib/open-in-editor';
import { ExportMenu } from './ExportMenu';
import { ErrorInspector } from './ErrorInspector';
import { TraceLogs } from './TraceLogs';
import { exportSnapshot } from '../lib/snapshot';

export function TraceDetail() {
  const {
    exchanges,
    selectedExchangeId,
    setSelectedExchangeId,
    routes,
    containerResolutionsByExchange,
    logsByTraceId,
    agentUrl,
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
        className="studio-backdrop"
        onClick={() => setSelectedExchangeId(null)}
      />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-2xl bg-[#0e1014]/95 backdrop-blur-xl border-l border-white/[0.07] overflow-y-auto animate-slide-in-right shadow-elevated">
        {/* Header */}
        <div className="studio-panel-header">
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
            className="studio-icon-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary */}
        <div className="p-4 border-b border-white/[0.06]">
          <div className="grid grid-cols-3 gap-3">
            <div className="studio-stat">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Duration</p>
              <p className="text-lg font-semibold text-white mt-1">
                {formatDuration(response.duration)}
              </p>
            </div>
            <div className="studio-stat">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Time</p>
              <p className="text-lg font-semibold text-white mt-1">
                {formatTimestamp(request.timestamp)}
              </p>
            </div>
            <div className="studio-stat">
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
          <div className="p-4 border-b border-white/[0.06] space-y-3">
            {matchedRoute && matchedRoute.filePath && (
              <div className="studio-card flex items-center justify-between px-3 py-2">
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
                  className="studio-btn-primary ml-3"
                >
                  Open in editor
                </button>
              </div>
            )}

            {resolvedBindings.length > 0 && (
              <div className="studio-card px-3 py-2">
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

        {response.statusCode >= 400 && <ErrorInspector exchange={exchange} />}

        <TraceWaterfall trace={trace} />

        <TraceLogs traceId={exchange.request.traceId || exchange.id} />

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
        <div className="p-4 border-t border-white/[0.06] flex gap-2 items-center flex-wrap">
          <button
            onClick={() => copyToClipboard(JSON.stringify(exchange, null, 2))}
            className="studio-btn px-4 py-2 text-sm"
          >
            <Copy className="w-4 h-4" />
            Copy as JSON
          </button>
          <ExportMenu exchange={exchange} />
          <SnapshotButton
            onExport={(format) =>
              exportSnapshot(
                {
                  exchange,
                  route: matchedRoute,
                  logs:
                    logsByTraceId[exchange.request.traceId || exchange.id] ?? [],
                  resolvedBindings,
                  agentUrl,
                },
                format,
              )
            }
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Snapshot export button — dropdown with JSON and Markdown options.
 * Closes on outside click via a small effect on a parent dropdown ref.
 */
function SnapshotButton({
  onExport,
}: {
  onExport: (format: 'json' | 'markdown') => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="studio-btn px-4 py-2 text-sm"
      >
        <Download className="w-4 h-4" />
        Export snapshot
        <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute bottom-full mb-2 right-0 z-20 min-w-[200px] studio-card shadow-elevated">
            <SnapshotOption
              icon={Download}
              label="Download as JSON"
              hint="Machine-readable, full fidelity"
              onClick={() => {
                onExport('json');
                setOpen(false);
              }}
            />
            <SnapshotOption
              icon={FileText}
              label="Download as Markdown"
              hint="Bug-report draft, ready to paste"
              onClick={() => {
                onExport('markdown');
                setOpen(false);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

function SnapshotOption({
  icon: Icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
            className="w-full px-3 py-2 text-left text-sm hover:bg-white/[0.05] flex items-start gap-2"
    >
      <Icon className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" />
      <div>
        <div className="text-gray-200">{label}</div>
        {hint && <div className="text-[11px] text-gray-500">{hint}</div>}
      </div>
    </button>
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
    <div className="p-4 border-b border-white/[0.06]">
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
                <div className="flex-1 h-6 bg-black/30 rounded relative">
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
    <div className="border-b border-white/[0.06]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors"
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
    <pre className="text-sm font-mono text-gray-300 bg-black/20 border border-white/[0.08] rounded-lg p-4 overflow-x-auto">
      {formatted}
    </pre>
  );
}
