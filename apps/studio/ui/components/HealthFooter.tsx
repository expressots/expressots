/**
 * Compact connection-health footer pinned to the bottom of the layout.
 *
 * Surfaces just enough numbers ("is the agent alive? is it slow?") for the
 * user to know whether Studio is showing stale data without having to
 * open browser devtools.
 */

import { Wifi, WifiOff, Gauge, MemoryStick, Activity, ArrowDown } from 'lucide-react';
import { useAppStore } from '../stores/app-store';
import { cn, formatBytes } from '../lib/utils';

export function HealthFooter() {
  const {
    connected,
    agentLatencyMs,
    eventsReceived,
    metrics,
    exchanges,
    logs,
  } = useAppStore();

  const latencyClass =
    agentLatencyMs == null
      ? 'text-gray-500'
      : agentLatencyMs < 30
        ? 'text-success-500'
        : agentLatencyMs < 150
          ? 'text-warning-500'
          : 'text-error-400';

  return (
    <footer className="studio-glass border-t px-4 py-2 flex items-center gap-4 text-[11px] font-mono text-gray-500">
      {/* Connection */}
      <span className="inline-flex items-center gap-1.5">
        {connected ? (
          <Wifi className="w-3 h-3 text-success-500" />
        ) : (
          <WifiOff className="w-3 h-3 text-error-500" />
        )}
        <span className={connected ? 'text-success-500/90' : 'text-error-500/90'}>
          {connected ? 'connected' : 'offline'}
        </span>
      </span>

      <Separator />

      {/* Latency */}
      <span className="inline-flex items-center gap-1.5" title="Round-trip latency to the Studio Agent">
        <Gauge className={cn('w-3 h-3', latencyClass)} />
        <span className={latencyClass}>
          {agentLatencyMs == null ? '—' : `${agentLatencyMs}ms`}
        </span>
      </span>

      <Separator />

      {/* Events */}
      <span className="inline-flex items-center gap-1.5" title="Total messages received from the agent since page load">
        <ArrowDown className="w-3 h-3 text-gray-600" />
        <span>{eventsReceived.toLocaleString()} ev</span>
      </span>

      <Separator />

      {/* Memory (from the most recent metrics broadcast) */}
      {metrics && (
        <span className="inline-flex items-center gap-1.5" title="Agent process memory: heapUsed / heapTotal">
          <MemoryStick className="w-3 h-3 text-gray-600" />
          <span>
            {formatBytes(metrics.memoryUsage.heapUsed)} /{' '}
            {formatBytes(metrics.memoryUsage.heapTotal)}
          </span>
        </span>
      )}

      {/* Buffer occupancy */}
      <span className="ml-auto inline-flex items-center gap-3 text-gray-600">
        <span className="inline-flex items-center gap-1.5" title="Recorded exchanges currently held in memory">
          <Activity className="w-3 h-3" />
          {exchanges.length} req
        </span>
        <span title="Buffered log entries">{logs.length} log</span>
      </span>
    </footer>
  );
}

function Separator() {
  return <span className="text-gray-800 select-none">·</span>;
}
