/**
 * Replay diff view — shows what changed between an original recorded
 * response and a freshly replayed one. The three sections are:
 *   - Top-line: status + duration with delta badges
 *   - Headers: per-header added/removed/changed
 *   - Body: JSON-aware change list when both are JSON; raw side-by-side
 *           otherwise.
 */

import { useMemo, useState } from 'react';
import { Check, X, ChevronDown, ChevronRight, Plus, Minus, Edit3, FileText, Layers, Activity } from 'lucide-react';
import { cn, formatDuration } from '../lib/utils';
import { diffJson, diffHeaders, type Change } from '../lib/diff-objects';

export interface ReplayDiffPayload {
  original: {
    statusCode: number;
    statusMessage?: string;
    headers?: Record<string, string>;
    body?: unknown;
    duration: number;
  };
  replay: {
    statusCode: number;
    statusMessage?: string;
    headers?: Record<string, string>;
    body?: unknown;
    duration: number;
  };
}

export function ReplayDiff({ payload }: { payload: ReplayDiffPayload }) {
  const headerChanges = useMemo(
    () => diffHeaders(payload.original.headers, payload.replay.headers),
    [payload.original.headers, payload.replay.headers],
  );

  const bodyDiff = useMemo(() => {
    return diffJson(payload.original.body, payload.replay.body);
  }, [payload.original.body, payload.replay.body]);

  const sameStatus = payload.original.statusCode === payload.replay.statusCode;
  const durationDeltaPct =
    payload.original.duration > 0
      ? ((payload.replay.duration - payload.original.duration) /
          payload.original.duration) *
        100
      : 0;

  return (
    <div className="space-y-4">
      {/* Top-line summary */}
      <div className="grid grid-cols-2 gap-3">
        <StatusCard
          label="Original"
          statusCode={payload.original.statusCode}
          statusMessage={payload.original.statusMessage}
          duration={payload.original.duration}
        />
        <StatusCard
          label="Replay"
          statusCode={payload.replay.statusCode}
          statusMessage={payload.replay.statusMessage}
          duration={payload.replay.duration}
          deltaPct={durationDeltaPct}
        />
      </div>

      {/* Verdict pills */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Pill
          kind={sameStatus ? 'success' : 'error'}
          icon={sameStatus ? Check : X}
          label={sameStatus ? 'Same status code' : `Status ${payload.original.statusCode} → ${payload.replay.statusCode}`}
        />
        <Pill
          kind={headerChanges.length === 0 ? 'success' : 'warn'}
          icon={Layers}
          label={
            headerChanges.length === 0
              ? 'Headers identical'
              : `${headerChanges.length} header${headerChanges.length === 1 ? '' : 's'} changed`
          }
        />
        <Pill
          kind={bodyDiff.identical ? 'success' : 'warn'}
          icon={FileText}
          label={
            bodyDiff.identical
              ? 'Body identical'
              : `Body: +${bodyDiff.added} −${bodyDiff.removed} ~${bodyDiff.changed}`
          }
        />
        <Pill
          kind={Math.abs(durationDeltaPct) < 25 ? 'neutral' : durationDeltaPct < 0 ? 'success' : 'warn'}
          icon={Activity}
          label={
            payload.original.duration === 0
              ? `${formatDuration(payload.replay.duration)}`
              : `${durationDeltaPct >= 0 ? '+' : ''}${durationDeltaPct.toFixed(0)}% duration`
          }
        />
      </div>

      {/* Headers diff */}
      {headerChanges.length > 0 && (
        <CollapsibleSection title="Response headers diff" defaultOpen>
          <div className="rounded border border-gray-800 divide-y divide-gray-800/60 font-mono text-xs">
            {headerChanges.map((h) => (
              <div key={h.name} className="px-3 py-1.5 flex items-start gap-2">
                <ChangeBadge kind={h.kind} />
                <div className="flex-1 min-w-0">
                  <div className="text-gray-200">{h.name}</div>
                  {h.kind === 'added' && (
                    <div className="text-success-400 truncate">{h.after}</div>
                  )}
                  {h.kind === 'removed' && (
                    <div className="text-error-400 line-through truncate">
                      {h.before}
                    </div>
                  )}
                  {h.kind === 'changed' && (
                    <div className="space-y-0.5">
                      <div className="text-error-400 line-through truncate">{h.before}</div>
                      <div className="text-success-400 truncate">{h.after}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Body diff */}
      {!bodyDiff.identical && bodyDiff.changes.length > 0 && (
        <CollapsibleSection title="Response body diff" defaultOpen>
          <BodyDiff changes={bodyDiff.changes} />
        </CollapsibleSection>
      )}

      {/* If diff produced no changes but bodies differ in raw form (e.g. when
          one is a string and the other isn't JSON), surface a side-by-side. */}
      {bodyDiff.identical && !sameStatus && (
        <p className="text-xs text-gray-500">
          Bodies are identical — the status code is the only difference between
          the recorded and replayed response.
        </p>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────────────

function StatusCard({
  label,
  statusCode,
  statusMessage,
  duration,
  deltaPct,
}: {
  label: string;
  statusCode: number;
  statusMessage?: string;
  duration: number;
  deltaPct?: number;
}) {
  const statusColor =
    statusCode >= 500
      ? 'text-error-400'
      : statusCode >= 400
        ? 'text-warning-500'
        : 'text-success-500';
  return (
    <div className="bg-gray-800/50 rounded-lg p-3">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-baseline justify-between gap-2">
        <span className={cn('text-lg font-semibold', statusColor)}>
          {statusCode}
          {statusMessage && (
            <span className="text-xs text-gray-500 font-normal ml-2">{statusMessage}</span>
          )}
        </span>
        <span className="text-sm text-gray-400 tabular-nums">
          {formatDuration(duration)}
          {typeof deltaPct === 'number' && Math.abs(deltaPct) >= 1 && (
            <span
              className={cn(
                'ml-1 text-[11px]',
                deltaPct < 0 ? 'text-success-500' : 'text-warning-500',
              )}
            >
              ({deltaPct >= 0 ? '+' : ''}
              {deltaPct.toFixed(0)}%)
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

function Pill({
  kind,
  icon: Icon,
  label,
}: {
  kind: 'success' | 'warn' | 'error' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  const styles: Record<typeof kind, string> = {
    success: 'bg-success-500/10 border-success-500/30 text-success-400',
    warn: 'bg-warning-500/10 border-warning-500/30 text-warning-500',
    error: 'bg-error-500/10 border-error-500/30 text-error-400',
    neutral: 'bg-gray-800 border-gray-700 text-gray-400',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded border',
        styles[kind],
      )}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function CollapsibleSection({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-white mb-2"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {title}
      </button>
      {open && children}
    </div>
  );
}

function BodyDiff({ changes }: { changes: Change[] }) {
  return (
    <div className="rounded border border-gray-800 divide-y divide-gray-800/60 font-mono text-xs max-h-96 overflow-y-auto">
      {changes.map((c, i) => (
        <div key={i} className="px-3 py-1.5 flex items-start gap-2">
          <ChangeBadge kind={c.kind} />
          <div className="flex-1 min-w-0">
            <div className="text-gray-300 truncate" title={c.path}>
              {c.path || '<root>'}
            </div>
            {c.kind === 'added' && (
              <div className="text-success-400 break-all">{formatValue(c.after)}</div>
            )}
            {c.kind === 'removed' && (
              <div className="text-error-400 line-through break-all">
                {formatValue(c.before)}
              </div>
            )}
            {c.kind === 'changed' && (
              <div className="space-y-0.5">
                <div className="text-error-400 line-through break-all">
                  {formatValue(c.before)}
                </div>
                <div className="text-success-400 break-all">
                  {formatValue(c.after)}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ChangeBadge({ kind }: { kind: 'added' | 'removed' | 'changed' | 'equal' }) {
  if (kind === 'added')
    return (
      <span className="mt-0.5 inline-flex items-center justify-center w-4 h-4 rounded bg-success-500/15 text-success-400">
        <Plus className="w-3 h-3" />
      </span>
    );
  if (kind === 'removed')
    return (
      <span className="mt-0.5 inline-flex items-center justify-center w-4 h-4 rounded bg-error-500/15 text-error-400">
        <Minus className="w-3 h-3" />
      </span>
    );
  if (kind === 'changed')
    return (
      <span className="mt-0.5 inline-flex items-center justify-center w-4 h-4 rounded bg-warning-500/15 text-warning-500">
        <Edit3 className="w-3 h-3" />
      </span>
    );
  return null;
}

function formatValue(v: unknown): string {
  if (v === undefined) return 'undefined';
  if (v === null) return 'null';
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    const s = JSON.stringify(v);
    return s.length > 200 ? s.slice(0, 200) + '…' : s;
  } catch {
    return String(v);
  }
}
