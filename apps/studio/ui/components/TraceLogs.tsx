/**
 * TraceLogs — shows the subset of console.* output captured during a single
 * request, embedded inside the TraceDetail panel.
 *
 * Logs are correlated by `traceId` set by the agent's AsyncLocalStorage
 * around the request handler. When the user-facing trace id matches an
 * exchange (via header or exchange.id fallback), this panel will populate.
 */

import { Terminal, AlertCircle, AlertTriangle, Info, Bug, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '../stores/app-store';
import { cn } from '../lib/utils';
import type { LogEntry, LogLevel } from '../types';

const LEVEL_STYLES: Record<LogLevel, { text: string; bg: string; label: string; Icon: typeof Info }> = {
  log: { text: 'text-gray-300', bg: 'bg-gray-700/30', label: 'LOG', Icon: ChevronRight },
  info: { text: 'text-sky-400', bg: 'bg-sky-500/10', label: 'INFO', Icon: Info },
  warn: { text: 'text-warning-500', bg: 'bg-warning-500/10', label: 'WARN', Icon: AlertTriangle },
  error: { text: 'text-error-400', bg: 'bg-error-500/15', label: 'ERROR', Icon: AlertCircle },
  debug: { text: 'text-violet-400', bg: 'bg-violet-500/10', label: 'DEBUG', Icon: Bug },
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${d.toLocaleTimeString([], { hour12: false })}.${ms}`;
}

export function TraceLogs({ traceId }: { traceId: string }) {
  const logsByTraceId = useAppStore((s) => s.logsByTraceId);
  const [open, setOpen] = useState(true);
  const entries: LogEntry[] = logsByTraceId[traceId] ?? [];

  if (entries.length === 0) return null;

  // The error level is the worst level present, used to color the header chip.
  const worst = entries.reduce<LogLevel>((acc, e) => {
    if (e.level === 'error') return 'error';
    if (e.level === 'warn' && acc !== 'error') return 'warn';
    return acc;
  }, 'log');

  return (
    <div className="border-b border-gray-800">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center gap-2 hover:bg-gray-800/30 transition-colors"
      >
        <Terminal className="w-4 h-4 text-primary-400" />
        <span className="text-sm font-semibold text-gray-300">Logs during this request</span>
        <span className="text-xs text-gray-500">
          ({entries.length} {entries.length === 1 ? 'entry' : 'entries'})
        </span>
        <span
          className={cn(
            'ml-auto inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase',
            LEVEL_STYLES[worst].bg,
            LEVEL_STYLES[worst].text,
          )}
        >
          {LEVEL_STYLES[worst].label}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4">
          <div className="bg-gray-950/60 border border-gray-800 rounded font-mono text-xs divide-y divide-gray-800/60 max-h-72 overflow-y-auto">
            {entries.map((entry, i) => {
              const style = LEVEL_STYLES[entry.level];
              const { Icon } = style;
              return (
                <div key={i} className="flex items-start gap-2 px-3 py-1.5">
                  <span className="text-gray-600 tabular-nums select-none shrink-0">
                    {formatTime(entry.timestamp)}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide',
                      style.bg,
                      style.text,
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {style.label}
                  </span>
                  <pre className="flex-1 whitespace-pre-wrap break-words text-gray-200 leading-relaxed">
                    {entry.message}
                  </pre>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
