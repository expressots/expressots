/**
 * Metrics dashboard component
 */

import { useMemo, useState, type ComponentType } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Activity, Clock, AlertTriangle, Zap, HardDrive, Users, ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react';
import { cn, formatDuration, formatBytes } from '../lib/utils';
import { useAppStore } from '../stores/app-store';
import type { EndpointStats } from '../types';

export function MetricsDashboard() {
  const { metrics, endpointStats } = useAppStore();

  if (!metrics) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Activity className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-lg">No metrics available</p>
        <p className="text-sm mt-2">Connect to the Studio Agent to view metrics</p>
      </div>
    );
  }

  const errorRate = metrics.requestCount > 0
    ? ((metrics.errorCount / metrics.requestCount) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          icon={Activity}
          label="Total Requests"
          value={metrics.requestCount.toLocaleString()}
          color="text-primary-400"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Error Rate"
          value={`${errorRate}%`}
          color={parseFloat(errorRate) > 5 ? 'text-error-500' : 'text-success-500'}
        />
        <MetricCard
          icon={Clock}
          label="Avg Response"
          value={formatDuration(metrics.avgResponseTime)}
          color="text-warning-500"
        />
        <MetricCard
          icon={Zap}
          label="P95 Latency"
          value={formatDuration(metrics.p95ResponseTime)}
          color="text-accent-400"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Latency Distribution */}
        <div className="studio-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Response Time Percentiles</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={[
                { name: 'P50', value: metrics.p50ResponseTime },
                { name: 'P95', value: metrics.p95ResponseTime },
                { name: 'P99', value: metrics.p99ResponseTime },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" tickFormatter={(v) => `${v}ms`} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                contentStyle={{
                  backgroundColor: '#14171c',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}
                labelStyle={{ color: '#fff' }}
                formatter={(value: number) => [`${value.toFixed(2)}ms`, 'Duration']}
              />
              <Bar dataKey="value" fill="#3de678" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Memory Usage */}
        <div className="studio-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Memory Usage</h3>
          <div className="flex items-center justify-center h-[250px]">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Heap Used', value: metrics.memoryUsage.heapUsed },
                    { name: 'Heap Free', value: metrics.memoryUsage.heapTotal - metrics.memoryUsage.heapUsed },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#3de678" />
                  <Cell fill="#374151" />
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#14171c',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                  formatter={(value: number) => formatBytes(value)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-primary-500" />
              <span className="text-gray-400">Used: {formatBytes(metrics.memoryUsage.heapUsed)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-gray-600" />
              <span className="text-gray-400">Total: {formatBytes(metrics.memoryUsage.heapTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Per-route performance */}
      <RoutePerformanceTable endpointStats={endpointStats} />

      {/* System Info */}
      <div className="grid grid-cols-3 gap-4">
        <div className="studio-stat">
          <div className="flex items-center gap-3">
            <HardDrive className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">RSS Memory</p>
              <p className="text-lg font-semibold text-white">{formatBytes(metrics.memoryUsage.rss)}</p>
            </div>
          </div>
        </div>
        <div className="studio-stat">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">Active Connections</p>
              <p className="text-lg font-semibold text-white">{metrics.activeConnections}</p>
            </div>
          </div>
        </div>
        <div className="studio-stat">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">Uptime</p>
              <p className="text-lg font-semibold text-white">{formatDuration(metrics.uptime)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Per-route performance table
// ────────────────────────────────────────────────────────────────────────

type SortKey =
  | 'method'
  | 'path'
  | 'requestCount'
  | 'errorRate'
  | 'p50Duration'
  | 'p95Duration'
  | 'p99Duration'
  | 'maxDuration';

const SORT_LABELS: Record<SortKey, string> = {
  method: 'Method',
  path: 'Route',
  requestCount: 'Reqs',
  errorRate: 'Err %',
  p50Duration: 'p50',
  p95Duration: 'p95',
  p99Duration: 'p99',
  maxDuration: 'Max',
};

function errorRate(stat: EndpointStats): number {
  if (stat.requestCount === 0) return 0;
  return (stat.errorCount / stat.requestCount) * 100;
}

/** Color-code latency cells so slow routes stand out at a glance. */
function latencyClass(ms: number): string {
  if (ms >= 500) return 'text-error-400';
  if (ms >= 200) return 'text-warning-500';
  return 'text-gray-300';
}

/** Color-code error rate the same way. */
function errorRateClass(rate: number): string {
  if (rate >= 5) return 'text-error-400';
  if (rate >= 1) return 'text-warning-500';
  if (rate > 0) return 'text-yellow-500';
  return 'text-gray-500';
}

function methodBadgeClass(method: string): string {
  switch (method) {
    case 'GET':
      return 'bg-green-500/10 text-green-400';
    case 'POST':
      return 'bg-blue-500/10 text-blue-400';
    case 'PUT':
    case 'PATCH':
      return 'bg-yellow-500/10 text-yellow-400';
    case 'DELETE':
      return 'bg-red-500/10 text-red-400';
    default:
      return 'bg-gray-500/10 text-gray-400';
  }
}

function RoutePerformanceTable({ endpointStats }: { endpointStats: EndpointStats[] }) {
  const [sortBy, setSortBy] = useState<SortKey>('p95Duration');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const filtered = search
      ? endpointStats.filter((s) =>
          `${s.method} ${s.path}`.toLowerCase().includes(search.toLowerCase()),
        )
      : endpointStats;

    const getValue = (s: EndpointStats): number | string => {
      switch (sortBy) {
        case 'method':
          return s.method;
        case 'path':
          return s.path;
        case 'errorRate':
          return errorRate(s);
        default:
          return s[sortBy] as number;
      }
    };

    return [...filtered].sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === 'asc'
        ? Number(av) - Number(bv)
        : Number(bv) - Number(av);
    });
  }, [endpointStats, sortBy, sortDir, search]);

  function toggleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      // Numeric columns make more sense desc by default; text asc.
      setSortDir(key === 'method' || key === 'path' ? 'asc' : 'desc');
    }
  }

  return (
    <div className="studio-card p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold text-white">Per-route performance</h3>
          <p className="text-xs text-gray-500 mt-1">
            Latency percentiles and error rate per endpoint, computed from the
            last 100 requests per route.
          </p>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter routes…"
          className="studio-input px-3 py-2 w-48"
        />
      </div>

      {endpointStats.length === 0 ? (
        <p className="text-gray-500 text-center py-8 text-sm">
          No requests recorded yet — endpoint stats will populate as traffic flows.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-gray-800">
                <SortHeader
                  label={SORT_LABELS.method}
                  active={sortBy === 'method'}
                  dir={sortDir}
                  onClick={() => toggleSort('method')}
                  className="w-20"
                />
                <SortHeader
                  label={SORT_LABELS.path}
                  active={sortBy === 'path'}
                  dir={sortDir}
                  onClick={() => toggleSort('path')}
                />
                <SortHeader
                  label={SORT_LABELS.requestCount}
                  active={sortBy === 'requestCount'}
                  dir={sortDir}
                  onClick={() => toggleSort('requestCount')}
                  align="right"
                />
                <SortHeader
                  label={SORT_LABELS.errorRate}
                  active={sortBy === 'errorRate'}
                  dir={sortDir}
                  onClick={() => toggleSort('errorRate')}
                  align="right"
                />
                <SortHeader
                  label={SORT_LABELS.p50Duration}
                  active={sortBy === 'p50Duration'}
                  dir={sortDir}
                  onClick={() => toggleSort('p50Duration')}
                  align="right"
                />
                <SortHeader
                  label={SORT_LABELS.p95Duration}
                  active={sortBy === 'p95Duration'}
                  dir={sortDir}
                  onClick={() => toggleSort('p95Duration')}
                  align="right"
                />
                <SortHeader
                  label={SORT_LABELS.p99Duration}
                  active={sortBy === 'p99Duration'}
                  dir={sortDir}
                  onClick={() => toggleSort('p99Duration')}
                  align="right"
                />
                <SortHeader
                  label={SORT_LABELS.maxDuration}
                  active={sortBy === 'maxDuration'}
                  dir={sortDir}
                  onClick={() => toggleSort('maxDuration')}
                  align="right"
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {rows.map((stat) => {
                const rate = errorRate(stat);
                return (
                  <tr
                    key={`${stat.method}:${stat.path}`}
                    className="hover:bg-gray-800/30"
                  >
                    <td className="py-2.5">
                      <span
                        className={cn(
                          'inline-block w-14 text-[11px] font-mono px-2 py-0.5 rounded text-center font-semibold',
                          methodBadgeClass(stat.method),
                        )}
                      >
                        {stat.method}
                      </span>
                    </td>
                    <td className="py-2.5 font-mono text-gray-300 truncate max-w-[300px]">
                      {stat.path}
                    </td>
                    <td className="py-2.5 text-right text-gray-300 tabular-nums">
                      {stat.requestCount.toLocaleString()}
                    </td>
                    <td className={cn('py-2.5 text-right tabular-nums', errorRateClass(rate))}>
                      {rate === 0 ? '—' : `${rate.toFixed(1)}%`}
                      {stat.errorCount > 0 && (
                        <span className="text-gray-500 ml-1 text-xs">
                          ({stat.errorCount})
                        </span>
                      )}
                    </td>
                    <td className={cn('py-2.5 text-right tabular-nums', latencyClass(stat.p50Duration))}>
                      {formatDuration(stat.p50Duration)}
                    </td>
                    <td className={cn('py-2.5 text-right tabular-nums font-medium', latencyClass(stat.p95Duration))}>
                      {formatDuration(stat.p95Duration)}
                    </td>
                    <td className={cn('py-2.5 text-right tabular-nums', latencyClass(stat.p99Duration))}>
                      {formatDuration(stat.p99Duration)}
                    </td>
                    <td className={cn('py-2.5 text-right tabular-nums', latencyClass(stat.maxDuration))}>
                      {formatDuration(stat.maxDuration)}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500 text-sm">
                    No routes match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface SortHeaderProps {
  label: string;
  active: boolean;
  dir: 'asc' | 'desc';
  onClick: () => void;
  align?: 'left' | 'right';
  className?: string;
}

function SortHeader({ label, active, dir, onClick, align = 'left', className }: SortHeaderProps) {
  return (
    <th className={cn('pb-2 font-medium', className)}>
      <button
        onClick={onClick}
        className={cn(
          'flex items-center gap-1 hover:text-white transition-colors',
          align === 'right' && 'ml-auto',
          active ? 'text-primary-300' : 'text-gray-500',
        )}
      >
        <span>{label}</span>
        {active ? (
          dir === 'asc' ? (
            <ArrowUp className="w-3 h-3" />
          ) : (
            <ArrowDown className="w-3 h-3" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-50" />
        )}
      </button>
    </th>
  );
}

interface MetricCardProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
}

function MetricCard({ icon: Icon, label, value, color }: MetricCardProps) {
  return (
    <div className="studio-stat p-6">
      <div className="flex items-center gap-3">
        <Icon className={cn('w-8 h-8', color)} />
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
          <p className={cn('text-2xl font-bold', color)}>{value}</p>
        </div>
      </div>
    </div>
  );
}
