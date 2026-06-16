import { useMemo, useState } from 'react';
import { Box, Cog, Database, Shield, AlertTriangle, ArrowRight } from 'lucide-react';
import { useAppStore } from '../../stores/app-store';
import { buildModuleSummaries, type ModuleSummary } from '../../lib/architecture/modules';
import { buildNodeStats } from '../../lib/architecture/stats';
import { buildWarnings } from '../../lib/architecture/warnings';
import { resolveSelectedNode, stripPrefix } from '../../lib/architecture/resolve-node';
import { NodeDetailDrawer } from './NodeDetailDrawer';
import type { SelectedNode } from '../../lib/architecture/types';
import type { RouteInfo } from '../../types';

interface Props {
  onSwitchToFlow?: (controllerFilter?: string) => void;
}

export function ModuleOverviewLens({ onSwitchToFlow }: Props) {
  const structure = useAppStore((s) => s.structure);
  const routes = useAppStore((s) => s.routes);
  const exchanges = useAppStore((s) => s.exchanges);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const setPendingApiClientRequest = useAppStore((s) => s.setPendingApiClientRequest);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const stats = useMemo(() => buildNodeStats(routes, exchanges), [routes, exchanges]);
  const warnings = useMemo(() => (structure ? buildWarnings(structure) : new Map()), [structure]);
  const summaries = useMemo(
    () => (structure ? buildModuleSummaries(structure, routes, stats, warnings) : []),
    [structure, routes, stats, warnings],
  );

  const selected: SelectedNode | null = useMemo(() => {
    if (!selectedNodeId || !structure) return null;
    const name = stripPrefix(selectedNodeId);
    return resolveSelectedNode(selectedNodeId, structure, routes, stats.get(name), warnings.get(name));
  }, [selectedNodeId, structure, routes, stats, warnings]);

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
    <div className="relative">
      {summaries.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[400px] text-gray-500">
          <p className="text-sm">No modules or artifacts discovered yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {summaries.map((mod) => (
            <ModuleCard
              key={mod.name}
              module={mod}
              onMemberClick={(name, kind) => setSelectedNodeId(`${kind}-${name}`)}
              onViewRoutes={() => onSwitchToFlow?.(mod.controllers[0])}
            />
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0" onClick={() => setSelectedNodeId(null)} />
          <div className="absolute right-0 top-0 bottom-0 w-96">
            <NodeDetailDrawer node={selected} onClose={() => setSelectedNodeId(null)} onTryInApiClient={tryInApiClient} />
          </div>
        </div>
      )}
    </div>
  );
}

function ModuleCard({
  module: mod,
  onMemberClick,
  onViewRoutes,
}: {
  module: ModuleSummary;
  onMemberClick: (name: string, kind: string) => void;
  onViewRoutes: () => void;
}) {
  const totalWarnings = mod.warningCounts.cycles + mod.warningCounts.orphans + mod.warningCounts.hubs;
  const hasTraffic = mod.reqTotal > 0;

  return (
    <div className="studio-card group">
      {/* Header */}
      <div className="studio-card-header flex-col items-start gap-0.5">
        <div className="flex items-center justify-between w-full">
          <h3 className="text-sm font-semibold text-white">{mod.name}</h3>
          {hasTraffic && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {mod.reqTotal} req
            </span>
          )}
        </div>
        {mod.filePath && (
          <p className="text-[11px] text-gray-600 font-mono w-full" title={mod.filePath}>{mod.filePath}</p>
        )}
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Layer strip */}
        <div className="flex items-center gap-2 flex-wrap">
          {mod.controllers.length > 0 && (
            <LayerPill icon={<Box className="w-3.5 h-3.5" />} count={mod.controllers.length} label="ctrl" color="blue" />
          )}
          {mod.services.length > 0 && (
            <LayerPill icon={<Cog className="w-3.5 h-3.5" />} count={mod.services.length} label="svc" color="green" />
          )}
          {mod.providers.length > 0 && (
            <LayerPill icon={<Database className="w-3.5 h-3.5" />} count={mod.providers.length} label="prov" color="purple" />
          )}
          {mod.middleware.length > 0 && (
            <LayerPill icon={<Shield className="w-3.5 h-3.5" />} count={mod.middleware.length} label="mw" color="amber" />
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{mod.routeCount} route{mod.routeCount === 1 ? '' : 's'}</span>
          <span>{mod.members.length} artifact{mod.members.length === 1 ? '' : 's'}</span>
        </div>

        {/* Warnings */}
        {totalWarnings > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {mod.warningCounts.cycles > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-error-500/15 border border-error-500/40 text-error-300">
                <AlertTriangle className="w-3 h-3" />{mod.warningCounts.cycles} cycle{mod.warningCounts.cycles === 1 ? '' : 's'}
              </span>
            )}
            {mod.warningCounts.orphans > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/15 border border-amber-500/40 text-amber-300">
                <AlertTriangle className="w-3 h-3" />{mod.warningCounts.orphans} orphan{mod.warningCounts.orphans === 1 ? '' : 's'}
              </span>
            )}
            {mod.warningCounts.hubs > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-orange-500/15 border border-orange-500/40 text-orange-300">
                <AlertTriangle className="w-3 h-3" />{mod.warningCounts.hubs} hub{mod.warningCounts.hubs === 1 ? '' : 's'}
              </span>
            )}
          </div>
        )}

        {/* Members list */}
        <div className="space-y-0.5 max-h-[180px] overflow-y-auto">
          {mod.members.slice(0, 12).map((name) => {
            const kind = mod.controllers.includes(name) ? 'controller'
              : mod.services.includes(name) ? 'service'
              : mod.providers.includes(name) ? 'provider'
              : 'middleware';
            return (
              <button
                key={name}
                onClick={() => onMemberClick(name, kind)}
                className="w-full text-left px-2 py-1.5 rounded text-xs font-mono text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] transition-colors truncate"
              >
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                  kind === 'controller' ? 'bg-blue-500' : kind === 'service' ? 'bg-green-500' : kind === 'provider' ? 'bg-purple-500' : 'bg-amber-500'
                }`} />
                {name}
              </button>
            );
          })}
          {mod.members.length > 12 && (
            <p className="text-[11px] text-gray-600 px-2 py-0.5">+{mod.members.length - 12} more</p>
          )}
        </div>

        {/* Actions */}
        {mod.routeCount > 0 && (
          <button onClick={onViewRoutes} className="w-full flex items-center justify-center gap-1.5 text-xs text-primary-300 hover:text-primary-200 py-2 rounded-md border border-primary-500/20 hover:border-primary-500/40 transition-colors">
            View routes <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

const colorMap: Record<string, string> = {
  blue: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  green: 'text-green-400 bg-green-500/10 border-green-500/30',
  purple: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  amber: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
};

function LayerPill({ icon, count, label, color }: { icon: React.ReactNode; count: number; label: string; color: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${colorMap[color]}`}>
      {icon} {count} {label}
    </span>
  );
}
