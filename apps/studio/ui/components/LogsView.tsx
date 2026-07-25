/**
 * Logs view — full-screen, live-streaming console.* output from the host app.
 *
 * Capabilities:
 *   - Auto-scrolling viewport that pauses when the user scrolls up
 *   - Per-level filtering (log/info/warn/error/debug)
 *   - Free-text search across message contents
 *   - Click a log line tagged with a traceId to jump to that request
 *   - Clear button to wipe the buffer on both UI and agent
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Terminal,
  Trash2,
  Search as SearchIcon,
  ArrowDownToLine,
  AlertCircle,
  AlertTriangle,
  Info,
  Bug,
  ChevronRight,
} from 'lucide-react';
import { useAppStore } from '../stores/app-store';
import { useSocket } from '../contexts/socket-context';
import { cn } from '../lib/utils';
import type { LogEntry, LogLevel } from '../types';

const LEVELS: LogLevel[] = ['log', 'info', 'warn', 'error', 'debug'];

const LEVEL_STYLES: Record<LogLevel, { text: string; bg: string; label: string; Icon: typeof Info }> = {
  log: { text: 'text-gray-300', bg: 'bg-gray-700/30', label: 'LOG', Icon: ChevronRight },
  info: { text: 'text-sky-400', bg: 'bg-sky-500/10', label: 'INFO', Icon: Info },
  warn: { text: 'text-warning-500', bg: 'bg-warning-500/10', label: 'WARN', Icon: AlertTriangle },
  error: { text: 'text-error-400', bg: 'bg-error-500/15', label: 'ERROR', Icon: AlertCircle },
  debug: { text: 'text-violet-400', bg: 'bg-violet-500/10', label: 'DEBUG', Icon: Bug },
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

export function LogsView() {
  const { logs, logLevelFilter, setLogLevelFilter, exchanges, setSelectedExchangeId, setCurrentView } = useAppStore();
  const { clearLogs } = useSocket();

  const [search, setSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (!logLevelFilter.has(l.level)) return false;
      if (q && !l.message.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [logs, logLevelFilter, search]);

  // The viewport renders newest-first (column-reverse), so the newest entry
  // sits at scrollTop = 0. Auto-scroll just means "snap back to top".
  useEffect(() => {
    if (!autoScroll || !listRef.current) return;
    listRef.current.scrollTop = 0;
  }, [filtered, autoScroll]);

  function toggleLevel(level: LogLevel) {
    const next = new Set(logLevelFilter);
    if (next.has(level)) {
      next.delete(level);
    } else {
      next.add(level);
    }
    setLogLevelFilter(next);
  }

  function jumpToRequest(traceId: string | undefined) {
    if (!traceId) return;
    // Match by either the exchange id (anonymous requests) or the trace id
    // header carried through the request.
    const match = exchanges.find(
      (e) => e.id === traceId || e.trace?.traceId === traceId || e.request.traceId === traceId,
    );
    if (!match) return;
    setSelectedExchangeId(match.id);
    setCurrentView('requests');
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="border-b border-white/[0.06] px-4 py-3 space-y-3 bg-white/[0.02]">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 mr-auto">
            <Terminal className="w-4 h-4 text-primary-400" />
            <h2 className="text-base font-semibold text-white">Logs</h2>
            <span className="text-xs text-gray-500">
              {filtered.length} of {logs.length}
            </span>
          </div>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={cn(
              'studio-btn',
              autoScroll &&
                'bg-primary-500/15 border-primary-500/40 text-primary-300 hover:bg-primary-500/20',
            )}
          >
            <ArrowDownToLine className="w-3 h-3" />
            Auto-scroll
          </button>

          <button
            onClick={() => clearLogs()}
            className="studio-btn hover:text-error-400 hover:border-error-500/50"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter messages…"
              className="studio-input w-full pl-8 pr-3 py-1.5"
            />
          </div>

          <div className="flex items-center gap-1">
            {LEVELS.map((level) => {
              const active = logLevelFilter.has(level);
              const style = LEVEL_STYLES[level];
              return (
                <button
                  key={level}
                  onClick={() => toggleLevel(level)}
                  className={cn(
                    'px-2 py-1 text-[11px] font-mono rounded border transition-colors',
                    active
                      ? `${style.bg} ${style.text} border-current/30`
                      : 'border-white/[0.08] text-gray-600 hover:text-gray-400 hover:border-white/[0.14]',
                  )}
                >
                  {style.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stream */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center max-w-md">
            <Terminal className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium text-gray-400">
              {logs.length === 0
                ? 'No logs captured yet'
                : 'No logs match the current filter'}
            </p>
            <p className="text-xs mt-2 text-gray-500">
              {logs.length === 0
                ? 'Studio captures every console.* call from your app. Trigger a request or restart the server to see output here.'
                : 'Adjust the level filter or clear the search to see more.'}
            </p>
          </div>
        </div>
      ) : (
        <div
          ref={listRef}
          // column-reverse keeps the newest log pinned at the top while
          // letting the user scroll back through history naturally.
          className="flex-1 overflow-y-auto flex flex-col-reverse font-mono text-xs"
        >
          {[...filtered].reverse().map((entry, i) => (
            <LogRow key={i} entry={entry} onJump={jumpToRequest} />
          ))}
        </div>
      )}
    </div>
  );
}

interface LogRowProps {
  entry: LogEntry;
  onJump: (traceId: string | undefined) => void;
}

function LogRow({ entry, onJump }: LogRowProps) {
  const style = LEVEL_STYLES[entry.level];
  const { Icon } = style;
  return (
    <div className="group flex items-start gap-2 px-4 py-1.5 border-b border-gray-900 hover:bg-gray-800/40">
      <span className="text-gray-600 tabular-nums select-none w-[88px] shrink-0">
        {formatTime(entry.timestamp)}
      </span>
      <span
        className={cn(
          'inline-flex items-center gap-1 w-[60px] shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide justify-center',
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
      {entry.traceId && (
        <button
          onClick={() => onJump(entry.traceId)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-primary-400 hover:text-primary-300 px-2 py-0.5 border border-primary-500/30 rounded"
          title={`Jump to request ${entry.traceId.slice(0, 8)}`}
        >
          → request
        </button>
      )}
    </div>
  );
}
