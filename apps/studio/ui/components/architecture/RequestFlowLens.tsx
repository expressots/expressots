import { useMemo, useRef, useState, useEffect } from 'react';
import { Box, Cog, Database, Globe, FileCode, Search, Send, Shield, Sparkles } from 'lucide-react';
import { useAppStore } from '../../stores/app-store';
import { buildRequestFlowPath, type FlowStep } from '../../lib/architecture/flow-path';
import { buildNodeStats } from '../../lib/architecture/stats';
import { getMethodColor } from '../../lib/utils';
import { openInEditor } from '../../lib/open-in-editor';
import type { RouteInfo } from '../../types';
import type { NodeStats } from '../../lib/architecture/types';

export function RequestFlowLens() {
  const structure = useAppStore((s) => s.structure);
  const routes = useAppStore((s) => s.routes);
  const exchanges = useAppStore((s) => s.exchanges);
  const selectedExchangeId = useAppStore((s) => s.selectedExchangeId);
  const containerResolutionsByExchange = useAppStore((s) => s.containerResolutionsByExchange);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const setPendingApiClientRequest = useAppStore((s) => s.setPendingApiClientRequest);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoute, setSelectedRoute] = useState<RouteInfo | null>(null);

  const [pulseActive, setPulseActive] = useState(false);
  const lastSeenExchangeId = useRef<string | null>(null);

  const stats = useMemo(() => buildNodeStats(routes, exchanges), [routes, exchanges]);

  useEffect(() => {
    if (!selectedExchangeId || selectedRoute) return;
    const exchange = exchanges.find((e) => e.id === selectedExchangeId);
    if (!exchange) return;
    const matched = routes.find(
      (r) => r.method === exchange.request.method && r.path === exchange.request.path,
    );
    if (matched) setSelectedRoute(matched);
  }, [selectedExchangeId, selectedRoute, exchanges, routes]);

  useEffect(() => {
    if (!selectedRoute || exchanges.length === 0) return;
    const newest = exchanges[0];
    if (lastSeenExchangeId.current === newest.id) return;
    lastSeenExchangeId.current = newest.id;
    if (
      newest.request.method === selectedRoute.method &&
      newest.request.path === selectedRoute.path
    ) {
      setPulseActive(true);
      const t = setTimeout(() => setPulseActive(false), 1800);
      return () => clearTimeout(t);
    }
  }, [exchanges, selectedRoute]);

  const resolvedIds = useMemo(() => {
    if (!selectedExchangeId) return undefined;
    return containerResolutionsByExchange[selectedExchangeId];
  }, [selectedExchangeId, containerResolutionsByExchange]);

  const flowResult = useMemo(() => {
    if (!selectedRoute || !structure) return null;
    return buildRequestFlowPath(selectedRoute, structure, resolvedIds);
  }, [selectedRoute, structure, resolvedIds]);

  const filteredRoutes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return routes;
    return routes.filter(
      (r) =>
        r.path.toLowerCase().includes(q) ||
        r.controller.toLowerCase().includes(q) ||
        r.method.toLowerCase().includes(q),
    );
  }, [routes, searchQuery]);

  const groupedRoutes = useMemo(() => {
    const groups = new Map<string, RouteInfo[]>();
    for (const r of filteredRoutes) {
      const list = groups.get(r.controller) ?? [];
      list.push(r);
      groups.set(r.controller, list);
    }
    return groups;
  }, [filteredRoutes]);

  if (!structure) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-gray-500">
        <p className="text-lg">No architecture data available</p>
        <p className="text-sm mt-2">Connect to the Studio Agent to view the architecture</p>
      </div>
    );
  }

  const tryInApiClient = (route: RouteInfo) => {
    setPendingApiClientRequest({ method: route.method, path: route.path, body: route.bodySample });
    setCurrentView('api-client');
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-260px)]">
      {/* Route picker sidebar */}
      <div className="w-80 shrink-0 studio-card flex flex-col overflow-hidden">
        <div className="p-2.5 border-b border-white/[0.06]">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search routes..."
              className="studio-input w-full pl-8 pr-2 py-1.5 text-xs"
            />
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-1.5 space-y-2">
          {[...groupedRoutes.entries()].map(([controller, controllerRoutes]) => (
            <div key={controller}>
              <p className="text-[11px] uppercase tracking-wide text-gray-600 px-1.5 py-1">{controller}</p>
              {controllerRoutes.map((r, i) => {
                const isSelected = selectedRoute?.method === r.method && selectedRoute?.path === r.path && selectedRoute?.controller === r.controller;
                return (
                  <button
                    key={`${r.method}-${r.path}-${i}`}
                    onClick={() => setSelectedRoute(r)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${
                      isSelected ? 'bg-primary-500/10 border border-primary-500/30' : 'hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    <span className={`text-[10px] font-mono font-bold w-10 text-center shrink-0 ${getMethodColor(r.method)}`}>{r.method}</span>
                    <span className="text-xs font-mono text-gray-300 truncate">{r.path}</span>
                  </button>
                );
              })}
            </div>
          ))}
          {filteredRoutes.length === 0 && (
            <p className="text-xs text-gray-600 text-center py-4">No routes found</p>
          )}
        </div>
      </div>

      {/* Flow visualization */}
      <div className="flex-1 studio-card p-6 overflow-y-auto relative">
        {!selectedRoute ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Globe className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">Select a route to see its request flow</p>
          </div>
        ) : flowResult ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-mono font-semibold text-gray-100">
                  <span className={getMethodColor(selectedRoute.method)}>{selectedRoute.method}</span>{' '}
                  {selectedRoute.path}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {flowResult.steps.length} step{flowResult.steps.length === 1 ? '' : 's'} in pipeline
                  {flowResult.truncated && ` (${flowResult.hiddenCount} more hidden)`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {pulseActive && (
                  <span className="flex items-center gap-1 text-xs text-emerald-300">
                    <Sparkles className="w-3.5 h-3.5" /> Live
                  </span>
                )}
                <button onClick={() => tryInApiClient(selectedRoute)} className="studio-btn text-xs">
                  <Send className="w-3.5 h-3.5" /> Try in API Client
                </button>
              </div>
            </div>

            <div className="space-y-0">
              {flowResult.steps.map((step, i) => (
                <FlowStepRow
                  key={`${step.kind}-${step.name}-${i}`}
                  step={step}
                  isLast={i === flowResult.steps.length - 1}
                  stats={step.kind === 'controller' ? stats.get(step.name) : undefined}
                  pulseActive={pulseActive && step.resolved}
                />
              ))}
            </div>

            {flowResult.truncated && (
              <div className="mt-4 text-xs text-gray-600 text-center">
                {flowResult.hiddenCount} additional step{flowResult.hiddenCount === 1 ? '' : 's'} truncated
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

const stepColors: Record<string, { dot: string; border: string; bg: string; text: string; icon: React.ReactNode }> = {
  http: { dot: 'bg-gray-500', border: 'border-gray-700', bg: 'bg-gray-500/5', text: 'text-gray-300', icon: <Globe className="w-4 h-4" /> },
  middleware: { dot: 'bg-amber-500', border: 'border-amber-700/40', bg: 'bg-amber-500/5', text: 'text-amber-300', icon: <Shield className="w-4 h-4" /> },
  controller: { dot: 'bg-blue-500', border: 'border-blue-700/40', bg: 'bg-blue-500/5', text: 'text-blue-300', icon: <Box className="w-4 h-4" /> },
  service: { dot: 'bg-green-500', border: 'border-green-700/40', bg: 'bg-green-500/5', text: 'text-green-300', icon: <Cog className="w-4 h-4" /> },
  provider: { dot: 'bg-purple-500', border: 'border-purple-700/40', bg: 'bg-purple-500/5', text: 'text-purple-300', icon: <Database className="w-4 h-4" /> },
};

function FlowStepRow({
  step,
  isLast,
  stats,
  pulseActive,
}: {
  step: FlowStep;
  isLast: boolean;
  stats?: NodeStats;
  pulseActive?: boolean;
}) {
  const colors = stepColors[step.kind] ?? stepColors.http;
  const pulse = pulseActive ? 'ring-1 ring-emerald-500/40 shadow-[0_0_12px_rgba(34,197,94,0.2)]' : '';

  return (
    <div className="flex">
      {/* Connector line */}
      <div className="flex flex-col items-center w-7 shrink-0">
        <div className={`w-3 h-3 rounded-full ${colors.dot} mt-3.5 shrink-0 ${pulseActive ? 'ring-2 ring-emerald-400 animate-pulse' : ''}`} />
        {!isLast && <div className="w-px flex-1 bg-gray-800 my-0.5" />}
      </div>

      {/* Step card */}
      <div className={`flex-1 ml-2 mb-2 p-3.5 rounded-lg border ${colors.border} ${colors.bg} ${pulse} transition-shadow`}>
        <div className="flex items-center gap-2">
          <span className={colors.text}>{colors.icon}</span>
          <span className="text-[11px] uppercase tracking-wide text-gray-500">{step.kind}</span>
          {step.middlewareScope && step.middlewareScope !== 'unknown' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">{step.middlewareScope}</span>
          )}
          {step.resolved && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">resolved</span>
          )}
        </div>
        <p className="text-sm font-mono text-gray-100 mt-1.5">
          {step.name}
          {step.controllerMethod && <span className="text-gray-500">.{step.controllerMethod}()</span>}
        </p>
        {stats && stats.req > 0 && (
          <div className="mt-2 flex items-center gap-2 text-xs font-mono text-gray-500">
            <span>{stats.req} req</span>
            <span>&middot;</span>
            <span>p95 {stats.p95Ms.toFixed(0)}ms</span>
            {stats.errors > 0 && (
              <>
                <span>&middot;</span>
                <span className="text-error-400">{stats.errors} err</span>
              </>
            )}
          </div>
        )}
        {step.filePath && step.kind !== 'http' && (
          <button
            onClick={() => openInEditor({ filePath: step.filePath! })}
            className="mt-2 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <FileCode className="w-3.5 h-3.5" /> Open in editor
          </button>
        )}
      </div>
    </div>
  );
}
