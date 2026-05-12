/**
 * Header — view title + search/filters + toolbar (clear / pause / refresh).
 *
 * The toolbar surfaces the agent's `clear_recordings` and `set_recording`
 * events as user-visible controls, plus a "Live" badge that flashes
 * whenever a new request streams in from the agent.
 */

import { useEffect, useState } from 'react';
import {
  Search,
  RefreshCw,
  Filter,
  Trash2,
  Pause,
  Play,
  Radio,
  X,
} from 'lucide-react';
import { useAppStore } from '../stores/app-store';
import { useSocket } from '../contexts/socket-context';

const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const viewTitles: Record<string, string> = {
  requests: 'Request Timeline',
  architecture: 'Architecture Map',
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
  } = useAppStore();
  const {
    rescan,
    requestMetrics,
    requestExchanges,
    clearRecordings,
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
    clearRecordings();
    setConfirmClear(false);
  };

  const togglePause = () => setRecording(!recordingEnabled);

  const showTimelineControls =
    currentView === 'requests' || currentView === 'replay';

  return (
    <header className="h-16 bg-gray-900/50 backdrop-blur-sm border-b border-gray-800 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold text-white">
          {viewTitles[currentView] || 'Dashboard'}
        </h2>

        {/* Live badge: flashes green when an event arrives, dims when paused. */}
        {showTimelineControls && (
          <span
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
              !recordingEnabled
                ? 'bg-gray-800 border-gray-700 text-gray-400'
                : pulsing
                  ? 'bg-primary-500/15 border-primary-500/40 text-primary-300'
                  : 'bg-gray-800/60 border-gray-700 text-gray-400'
            }`}
            title={
              recordingEnabled
                ? 'Recording — new requests stream in live'
                : 'Recording is paused'
            }
          >
            <Radio
              className={`w-3 h-3 ${
                recordingEnabled && pulsing ? 'text-primary-400 animate-pulse' : ''
              }`}
            />
            {recordingEnabled ? 'Live' : 'Paused'}
            <span className="text-gray-500">·</span>
            <span className="tabular-nums text-gray-400">{exchanges.length}</span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-64"
          />
        </div>

        {/* Method + Status filters (timeline views only) */}
        {showTimelineControls && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterMethod || ''}
              onChange={(e) => setFilterMethod(e.target.value || null)}
              className="bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
              className="bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="success">Success (2xx)</option>
              <option value="error">Errors (4xx/5xx)</option>
            </select>
          </div>
        )}

        {/* Toolbar */}
        {showTimelineControls && (
          <div className="flex items-center gap-1 pl-2 border-l border-gray-800">
            <button
              onClick={togglePause}
              className={`p-2 rounded-lg transition-colors ${
                recordingEnabled
                  ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                  : 'text-primary-400 hover:text-primary-300 hover:bg-primary-500/10'
              }`}
              title={recordingEnabled ? 'Pause recording' : 'Resume recording'}
            >
              {recordingEnabled ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={() => setConfirmClear(true)}
              disabled={exchanges.length === 0}
              className="p-2 text-gray-400 hover:text-error-400 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-gray-400 disabled:hover:bg-transparent"
              title="Clear all recorded requests"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        )}

        <button
          onClick={handleRefresh}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          title="Refresh routes, metrics, and recordings"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Clear confirmation dialog */}
      {confirmClear && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setConfirmClear(false)}
        >
          <div
            className="bg-gray-900 border border-gray-800 rounded-lg shadow-2xl max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">
                Clear all recorded requests?
              </h3>
              <button
                onClick={() => setConfirmClear(false)}
                className="p-1 text-gray-500 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-gray-400 mb-6">
              This deletes the {exchanges.length} captured request
              {exchanges.length === 1 ? '' : 's'} and resets endpoint
              statistics. The action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmClear(false)}
                className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleClear}
                className="px-4 py-2 text-sm bg-error-500/20 hover:bg-error-500/30 border border-error-500/40 text-error-300 rounded-lg"
              >
                Clear everything
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
