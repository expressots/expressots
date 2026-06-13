/**
 * Header — view title + search/filters + toolbar (clear / pause / refresh).
 *
 * The toolbar surfaces the agent's `clear_recordings` and `set_recording`
 * events as user-visible controls, plus a "Live" badge that flashes
 * whenever a new request streams in from the agent.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  RefreshCw,
  Filter,
  Trash2,
  Pause,
  Play,
  Radio,
  X,
  AlertTriangle,
  Activity,
  BarChart3,
  Terminal,
} from 'lucide-react';
import { useAppStore } from '../stores/app-store';
import { useSocket } from '../contexts/socket-context';
import { cn } from '../lib/utils';

const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const viewTitles: Record<string, string> = {
  status: 'App Status',
  requests: 'Request Timeline',
  architecture: 'Architecture',
  metrics: 'Performance Metrics',
  replay: 'Request Replay',
  'api-client': 'API Client',
  container: 'DI Container',
  logs: 'Live Logs',
};

export function Header() {
  const {
    currentView,
    searchQuery,
    setSearchQuery,
    filterMethod,
    setFilterMethod,
    filterStatus,
    setFilterStatus,
    recordingEnabled,
    lastEventAt,
    exchanges,
    endpointStats,
    logs,
  } = useAppStore();
  const {
    rescan,
    requestMetrics,
    requestExchanges,
    clearRecordings,
    clearLogs,
    setRecording,
  } = useSocket();

  const [confirmClear, setConfirmClear] = useState(false);
  const [pulsing, setPulsing] = useState(false);

  // Flash the "Live" badge for ~1s every time the agent sends us a request.
  useEffect(() => {
    if (!lastEventAt) return;
    setPulsing(true);
    const t = setTimeout(() => setPulsing(false), 900);
    return () => clearTimeout(t);
  }, [lastEventAt]);

  const handleRefresh = () => {
    rescan();
    requestMetrics();
    requestExchanges();
  };

  const handleClear = () => {
    // The dialog promises a full wipe (exchanges + endpoint stats + logs),
    // so we fire both events. The agent's `clear_recordings` resets the
    // recorder + aggregates; `clear_logs` empties the log buffer.
    clearRecordings();
    clearLogs();
    setConfirmClear(false);
  };

  const togglePause = () => setRecording(!recordingEnabled);

  const showTimelineControls =
    currentView === 'requests' || currentView === 'replay';

  return (
    <header className="h-16 studio-glass border-b flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-white tracking-tight">
          {viewTitles[currentView] || 'Dashboard'}
        </h2>

        {/* Live badge: flashes green when an event arrives, dims when paused. */}
        {showTimelineControls && (
          <span
            className={cn(
              'studio-pill transition-all duration-300',
              !recordingEnabled
                ? 'bg-gray-800/60 border-gray-700/80 text-gray-400'
                : pulsing
                  ? 'bg-primary-500/15 border-primary-500/40 text-primary-300'
                  : 'bg-gray-800/40 border-gray-700/60 text-gray-400',
            )}
            title={
              recordingEnabled
                ? 'Recording — new requests stream in live'
                : 'Recording is paused'
            }
          >
            <Radio
              className={cn(
                'w-3 h-3',
                recordingEnabled && pulsing && 'text-primary-400 animate-pulse',
              )}
            />
            {recordingEnabled ? 'Live' : 'Paused'}
            <span className="text-gray-600">·</span>
            <span className="tabular-nums text-gray-400">{exchanges.length}</span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="studio-input pl-10 pr-4 py-2 w-64"
          />
        </div>

        {/* Method + Status filters (timeline views only) */}
        {showTimelineControls && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterMethod || ''}
              onChange={(e) => setFilterMethod(e.target.value || null)}
              className="studio-select"
            >
              <option value="">All Methods</option>
              {methods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as 'all' | 'success' | 'error')
              }
              className="studio-select"
            >
              <option value="all">All Status</option>
              <option value="success">Success (2xx)</option>
              <option value="error">Errors (4xx/5xx)</option>
            </select>
          </div>
        )}

        {/* Toolbar */}
        {showTimelineControls && (
          <div className="flex items-center gap-0.5 pl-2.5 border-l border-gray-800/80">
            <button
              onClick={togglePause}
              className={cn(
                'studio-icon-btn',
                !recordingEnabled && 'text-primary-400 hover:text-primary-300 hover:bg-primary-500/10',
              )}
              title={recordingEnabled ? 'Pause recording' : 'Resume recording'}
            >
              {recordingEnabled ? (
                <Pause className="w-[18px] h-[18px]" />
              ) : (
                <Play className="w-[18px] h-[18px]" />
              )}
            </button>

            <button
              onClick={() => setConfirmClear(true)}
              disabled={exchanges.length === 0}
              className="studio-icon-btn hover:text-error-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-gray-400 disabled:hover:bg-transparent"
              title="Clear all recorded requests"
            >
              <Trash2 className="w-[18px] h-[18px]" />
            </button>
          </div>
        )}

        <button
          onClick={handleRefresh}
          className="studio-icon-btn"
          title="Refresh routes, metrics, and recordings"
        >
          <RefreshCw className="w-[18px] h-[18px]" />
        </button>
      </div>

      {/* Clear confirmation dialog — portaled to <body> so that the header's
          `backdrop-filter` (which creates a containing block for position:
          fixed children) doesn't pin the modal to the 64px header strip. */}
      {confirmClear && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setConfirmClear(false)}
        >
          <div
            className="studio-card shadow-elevated max-w-md w-full overflow-hidden animate-slide-up"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="clear-dialog-title"
          >
            {/* Header strip — destructive accent */}
            <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-gray-800 bg-error-500/5">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-error-500/15 border border-error-500/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-error-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  id="clear-dialog-title"
                  className="text-base font-semibold text-white leading-tight"
                >
                  Clear all recorded data?
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  This cannot be undone.
                </p>
              </div>
              <button
                onClick={() => setConfirmClear(false)}
                className="p-1 -mt-1 -mr-1 text-gray-500 hover:text-white rounded transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Impact summary */}
            <div className="px-5 py-4">
              <p className="text-sm text-gray-300 mb-3">
                You're about to discard everything Studio has captured for
                this session:
              </p>
              <ul className="space-y-2">
                <ImpactRow
                  icon={Activity}
                  count={exchanges.length}
                  label={`captured request${exchanges.length === 1 ? '' : 's'}`}
                  detail="including bodies, headers, and timings"
                />
                <ImpactRow
                  icon={BarChart3}
                  count={endpointStats.length}
                  label={`endpoint stat row${endpointStats.length === 1 ? '' : 's'}`}
                  detail="p50 / p95 / p99 will reset to zero"
                />
                <ImpactRow
                  icon={Terminal}
                  count={logs.length}
                  label={`buffered log line${logs.length === 1 ? '' : 's'}`}
                  detail="agent log buffer will be emptied"
                />
              </ul>
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 flex items-center gap-2 justify-end border-t border-gray-800 pt-4 bg-gray-900/40">
              <button
                onClick={() => setConfirmClear(false)}
                className="px-4 py-2 text-sm font-medium bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClear}
                autoFocus
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-error-500 hover:bg-error-600 text-white rounded-lg transition-colors shadow-sm shadow-error-500/30"
              >
                <Trash2 className="w-4 h-4" />
                Clear everything
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </header>
  );
}

/** Single impact row in the clear-confirmation dialog. */
function ImpactRow({
  icon: Icon,
  count,
  label,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  label: string;
  detail: string;
}) {
  const dim = count === 0;
  return (
    <li
      className={`flex items-start gap-3 p-2.5 rounded-lg border ${
        dim
          ? 'border-gray-800/60 bg-gray-900/30 text-gray-500'
          : 'border-gray-800 bg-gray-800/40 text-gray-200'
      }`}
    >
      <Icon className={`w-4 h-4 mt-0.5 ${dim ? 'text-gray-600' : 'text-error-400'}`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm">
          <span className="font-mono font-semibold tabular-nums">{count}</span>{' '}
          <span>{label}</span>
        </div>
        <div className="text-[11px] text-gray-500">{detail}</div>
      </div>
    </li>
  );
}
