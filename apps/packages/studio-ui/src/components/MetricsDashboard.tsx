/**
 * Metrics dashboard component
 */

import type { ComponentType } from 'react';
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
import { Activity, Clock, AlertTriangle, Zap, HardDrive, Users } from 'lucide-react';
import { cn, formatDuration, formatBytes } from '../lib/utils';
import { useAppStore } from '../stores/app-store';

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
        <div className="bg-gray-900/50 rounded-lg border border-gray-800 p-6">
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
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#fff' }}
                formatter={(value: number) => [`${value.toFixed(2)}ms`, 'Duration']}
              />
              <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Memory Usage */}
        <div className="bg-gray-900/50 rounded-lg border border-gray-800 p-6">
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
                  <Cell fill="#0ea5e9" />
                  <Cell fill="#374151" />
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
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

      {/* Endpoint Stats */}
      <div className="bg-gray-900/50 rounded-lg border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Endpoint Performance</h3>
        {endpointStats.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b border-gray-800">
                  <th className="pb-3 font-medium">Endpoint</th>
                  <th className="pb-3 font-medium text-right">Requests</th>
                  <th className="pb-3 font-medium text-right">Errors</th>
                  <th className="pb-3 font-medium text-right">Avg</th>
                  <th className="pb-3 font-medium text-right">P95</th>
                  <th className="pb-3 font-medium text-right">Max</th>
                </tr>
              </thead>
              <tbody>
                {endpointStats
                  .sort((a, b) => b.requestCount - a.requestCount)
                  .slice(0, 10)
                  .map((stat) => (
                    <tr key={`${stat.method}:${stat.path}`} className="border-b border-gray-800/50">
                      <td className="py-3">
                        <span className={cn(
                          'inline-block w-16 text-xs font-mono px-2 py-0.5 rounded text-center',
                          stat.method === 'GET' ? 'bg-green-500/10 text-green-400' :
                          stat.method === 'POST' ? 'bg-blue-500/10 text-blue-400' :
                          stat.method === 'PUT' ? 'bg-yellow-500/10 text-yellow-400' :
                          stat.method === 'DELETE' ? 'bg-red-500/10 text-red-400' :
                          'bg-gray-500/10 text-gray-400'
                        )}>
                          {stat.method}
                        </span>
                        <span className="ml-2 font-mono text-gray-300">{stat.path}</span>
                      </td>
                      <td className="py-3 text-right text-gray-300">{stat.requestCount}</td>
                      <td className="py-3 text-right">
                        <span className={stat.errorCount > 0 ? 'text-error-500' : 'text-gray-500'}>
                          {stat.errorCount}
                        </span>
                      </td>
                      <td className="py-3 text-right text-gray-300">{formatDuration(stat.avgDuration)}</td>
                      <td className="py-3 text-right text-gray-300">{formatDuration(stat.p95Duration)}</td>
                      <td className="py-3 text-right text-gray-300">{formatDuration(stat.maxDuration)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No endpoint data available</p>
        )}
      </div>

      {/* System Info */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-900/50 rounded-lg border border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <HardDrive className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">RSS Memory</p>
              <p className="text-lg font-semibold text-white">{formatBytes(metrics.memoryUsage.rss)}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900/50 rounded-lg border border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">Active Connections</p>
              <p className="text-lg font-semibold text-white">{metrics.activeConnections}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900/50 rounded-lg border border-gray-800 p-4">
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

interface MetricCardProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
}

function MetricCard({ icon: Icon, label, value, color }: MetricCardProps) {
  return (
    <div className="bg-gray-900/50 rounded-lg border border-gray-800 p-6">
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
