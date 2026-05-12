/**
 * Request list component showing recent requests
 */

import { useEffect, useMemo, useRef } from 'react';
import { Clock, ExternalLink, ArrowDownToLine } from 'lucide-react';
import { cn, formatDuration, formatTimestamp, getMethodColor, getMethodBgColor, getStatusColor, getStatusBgColor, getDurationColor } from '../lib/utils';
import { useAppStore } from '../stores/app-store';
import type { RecordedExchange } from '../types';
import { ExportMenu } from './ExportMenu';

export function RequestList() {
  const {
    exchanges,
    searchQuery,
    filterMethod,
    filterStatus,
    selectedExchangeId,
    setSelectedExchangeId,
    autoScroll,
    setAutoScroll,
  } = useAppStore();

  const topSentinelRef = useRef<HTMLDivElement>(null);
  const newestId = exchanges[0]?.id;

  // Auto-scroll keeps the newest entry visible. We anchor on the very top
  // of the list (entries are prepended) and scroll into view whenever the
  // newest id changes and the user has the toggle enabled.
  useEffect(() => {
    if (!autoScroll || !newestId) return;
    topSentinelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [newestId, autoScroll]);

  const filteredExchanges = useMemo(() => {
    return exchanges.filter((exchange) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!exchange.request.path.toLowerCase().includes(query) &&
            !exchange.request.url.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Method filter
      if (filterMethod && exchange.request.method !== filterMethod) {
        return false;
      }

      // Status filter
      if (filterStatus === 'success' && exchange.response.statusCode >= 400) {
        return false;
      }
      if (filterStatus === 'error' && exchange.response.statusCode < 400) {
        return false;
      }

      return true;
    });
  }, [exchanges, searchQuery, filterMethod, filterStatus]);

  if (exchanges.length === 0) {
    return <EmptyState />;
  }

  return (
    <div>
      {/* Per-list toolbar — auto-scroll + filtered count. */}
      <div className="flex items-center justify-between mb-3 text-xs text-gray-500">
        <span>
          Showing {filteredExchanges.length} of {exchanges.length}
          {filteredExchanges.length !== exchanges.length && (
            <span className="text-gray-600"> (filtered)</span>
          )}
        </span>
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded border transition-colors',
            autoScroll
              ? 'bg-primary-500/10 border-primary-500/30 text-primary-300'
              : 'bg-gray-800/60 border-gray-700 text-gray-400 hover:text-gray-200',
          )}
          title={autoScroll ? 'Auto-scroll on' : 'Auto-scroll off'}
        >
          <ArrowDownToLine className="w-3 h-3" />
          Auto-scroll
        </button>
      </div>

      <div ref={topSentinelRef} />
      <div className="space-y-2">
        {filteredExchanges.map((exchange) => (
          <RequestRow
            key={exchange.id}
            exchange={exchange}
            isSelected={selectedExchangeId === exchange.id}
            onSelect={() => setSelectedExchangeId(exchange.id)}
          />
        ))}
        {filteredExchanges.length === 0 && (
          <div className="text-center py-12 text-gray-500 text-sm">
            No requests match the current filters.
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <div className="w-16 h-16 mb-4 rounded-full bg-primary-500/10 flex items-center justify-center">
        <Clock className="w-8 h-8 text-primary-400 opacity-70" />
      </div>
      <p className="text-lg text-white font-medium">No requests recorded yet</p>
      <p className="text-sm mt-2 text-center max-w-md">
        Send a request to your running app (default{' '}
        <code className="px-1.5 py-0.5 bg-gray-800 rounded text-primary-300 text-xs">
          localhost:3000
        </code>
        ) and it will stream in here in real time.
      </p>
      <p className="text-xs mt-4 text-gray-500">
        Tip: use the{' '}
        <span className="text-primary-300 font-medium">API Client</span> tab to
        send one from inside Studio.
      </p>
    </div>
  );
}

interface RequestRowProps {
  exchange: RecordedExchange;
  isSelected: boolean;
  onSelect: () => void;
}

function RequestRow({ exchange, isSelected, onSelect }: RequestRowProps) {
  const { request, response } = exchange;

  return (
    <div
      onClick={onSelect}
      className={cn(
        'flex items-center p-4 rounded-lg border cursor-pointer transition-all',
        isSelected
          ? 'bg-gray-800/80 border-primary-500/50'
          : 'bg-gray-900/50 border-gray-800 hover:bg-gray-800/50 hover:border-gray-700'
      )}
    >
      {/* Method Badge */}
      <div className={cn(
        'px-2 py-1 rounded text-xs font-mono font-semibold',
        getMethodBgColor(request.method),
        getMethodColor(request.method)
      )}>
        {request.method}
      </div>

      {/* Path */}
      <div className="flex-1 ml-4 min-w-0">
        <p className="text-sm font-mono text-gray-200 truncate">{request.path}</p>
        <p className="text-xs text-gray-500 mt-1">{formatTimestamp(request.timestamp)}</p>
      </div>

      {/* Status */}
      <div className={cn(
        'px-2 py-1 rounded text-xs font-semibold ml-4',
        getStatusBgColor(response.statusCode),
        getStatusColor(response.statusCode)
      )}>
        {response.statusCode}
      </div>

      {/* Duration */}
      <div className={cn(
        'text-sm font-mono ml-4 min-w-[80px] text-right',
        getDurationColor(response.duration)
      )}>
        {formatDuration(response.duration)}
      </div>

      {/* Export */}
      <div className="ml-3" onClick={(e) => e.stopPropagation()}>
        <ExportMenu exchange={exchange} compact />
      </div>

      {/* Expand Icon */}
      <ExternalLink className="w-4 h-4 ml-3 text-gray-600" />
    </div>
  );
}
