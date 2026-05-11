/**
 * Request list component showing recent requests
 */

import { useMemo } from 'react';
import { Clock, ExternalLink } from 'lucide-react';
import { cn, formatDuration, formatTimestamp, getMethodColor, getMethodBgColor, getStatusColor, getStatusBgColor, getDurationColor } from '../lib/utils';
import { useAppStore } from '../stores/app-store';
import type { RecordedExchange } from '../types';

export function RequestList() {
  const { 
    exchanges, 
    searchQuery, 
    filterMethod, 
    filterStatus,
    selectedExchangeId,
    setSelectedExchangeId,
  } = useAppStore();

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
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Clock className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-lg">No requests recorded yet</p>
        <p className="text-sm mt-2">Requests will appear here as they happen</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filteredExchanges.map((exchange) => (
        <RequestRow
          key={exchange.id}
          exchange={exchange}
          isSelected={selectedExchangeId === exchange.id}
          onSelect={() => setSelectedExchangeId(exchange.id)}
        />
      ))}
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

      {/* Expand Icon */}
      <ExternalLink className="w-4 h-4 ml-4 text-gray-600" />
    </div>
  );
}
