/**
 * Header component with search and filters
 */

import { Search, RefreshCw, Filter } from 'lucide-react';
import { useAppStore } from '../stores/app-store';
import { useSocket } from '../contexts/socket-context';

const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export function Header() {
  const { 
    currentView, 
    searchQuery, 
    setSearchQuery, 
    filterMethod, 
    setFilterMethod,
    filterStatus,
    setFilterStatus,
  } = useAppStore();
  const { rescan, requestMetrics, requestExchanges } = useSocket();

  const handleRefresh = () => {
    rescan();
    requestMetrics();
    requestExchanges();
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'requests':
        return 'Request Timeline';
      case 'architecture':
        return 'Architecture Map';
      case 'metrics':
        return 'Performance Metrics';
      case 'replay':
        return 'Request Replay';
      default:
        return 'Dashboard';
    }
  };

  return (
    <header className="h-16 bg-gray-900/50 backdrop-blur-sm border-b border-gray-800 flex items-center justify-between px-6">
      <h2 className="text-xl font-semibold text-white">{getViewTitle()}</h2>

      <div className="flex items-center gap-4">
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

        {/* Method Filter */}
        {(currentView === 'requests' || currentView === 'replay') && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterMethod || ''}
              onChange={(e) => setFilterMethod(e.target.value || null)}
              className="bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Methods</option>
              {methods.map((method) => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'success' | 'error')}
              className="bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="success">Success (2xx)</option>
              <option value="error">Errors (4xx/5xx)</option>
            </select>
          </div>
        )}

        {/* Refresh */}
        <button
          onClick={handleRefresh}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
