import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Box, Cog, Database, FileCode, Search, Shield } from 'lucide-react';
import { useAppStore } from '../../stores/app-store';
import { buildNeighborhood, type NeighborhoodNode } from '../../lib/architecture/neighborhood';
import { buildWarnings } from '../../lib/architecture/warnings';
import { resolveSelectedNode, stripPrefix } from '../../lib/architecture/resolve-node';
import { buildNodeStats } from '../../lib/architecture/stats';
import { openInEditor } from '../../lib/open-in-editor';
import { NodeDetailDrawer } from './NodeDetailDrawer';
import type { SelectedNode, NodeWarnings } from '../../lib/architecture/types';
import type { RouteInfo } from '../../types';
import type { WarningFilter } from './ArchitectureHealthStrip';

type Direction = 'both' | 'upstream' | 'downstream';

interface Props {
  initialNodeId?: string;
  initialWarningFilter?: WarningFilter;
}

export function ExploreLens({ initialNodeId, initialWarningFilter }: Props) {
  const structure = useAppStore((s) => s.structure);
  const routes = useAppStore((s) => s.routes);
  const exchanges = useAppStore((s) => s.exchanges);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const setPendingApiClientRequest = useAppStore((s) => s.setPendingApiClientRequest);

  const [searchQuery, setSearchQuery] = useState('');
  const [focusNodeId, setFocusNodeId] = useState<string | null>(initialNodeId ?? null);
  const [direction, setDirection] = useState<Direction>('both');
  const [warningFilter, setWarningFilter] = useState<WarningFilter | undefined>(initialWarningFilter);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const stats = useMemo(() => buildNodeStats(routes, exchanges), [routes, exchanges]);
  const warnings = useMemo(() => (structure ? buildWarnings(structure) : new Map<string, NodeWarnings>()), [structure]);

  const allArtifacts = useMemo(() => {
    if (!structure) return [];
    return [
      ...structure.controllers.map((c) => ({ name: c.name, kind: 'controller' as const, filePath: c.filePath })),
      ...structure.services.map((s) => ({ name: s.name, kind: 'service' as const, filePath: s.filePath })),
      ...structure.providers.map((p) => ({ name: p.name, kind: 'provider' as const, filePath: p.filePath })),
      ...structure.middleware.map((m) => ({ name: m.name, kind: 'middleware' as const, filePath: m.filePath })),
    ];
  }, [structure]);

  const filteredArtifacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allArtifacts;
    return allArtifacts.filter((a) => a.name.toLowerCase().includes(q));
  }, [allArtifacts, searchQuery]);

  const neighborhood = useMemo(() => {
    if (!focusNodeId || !structure) return null;
    return buildNeighborhood(focusNodeId, structure, 2, { warningFilter, warnings });
  }, [focusNodeId, structure, warningFilter, warnings]);

  const displayNodes = useMemo(() => {
    if (!neighborhood) return [];
    if (direction === 'both') return neighborhood.nodes;
    return neighborhood.nodes.filter(
      (n) => n.direction === 'focus' || n.direction === direction,
    );
  }, [neighborhood, direction]);

  const selected: SelectedNode | null = useMemo(() => {
    if (!selectedNodeId || !structure) return null;
    const name = stripPrefix(selectedNodeId);
    return resolveSelectedNode(selectedNodeId, structure, routes, stats.get(name), warnings.get(name));
  }, [selectedNodeId, structure, routes, stats, warnings]);

  if (!structure) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-gray-500">
        <p className="text-lg">No architecture data available</p>
      </div>
    );
  }

  const tryInApiClient = (route: RouteInfo) => {
    setPendingApiClientRequest({ method: route.method, path: route.path, body: route.bodySample });
    setCurrentView('api-client');
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-260px)]">
      {/* Artifact picker */}
      <div className="w-72 shrink-0 studio-card flex flex-col overflow-hidden">
        <div className="p-2.5 border-b border-white/[0.06]">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search artifacts..."
              className="studio-input w-full pl-8 pr-2 py-1.5 text-xs"
            />
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-1.5">
          {filteredArtifacts.map((a) => {
            const isSelected = focusNodeId === `${a.kind}-${a.name}`;
            const w = warnings.get(a.name);
            return (
              <button
                key={`${a.kind}-${a.name}`}
                onClick={() => setFocusNodeId(`${a.kind}-${a.name}`)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${
                  isSelected ? 'bg-primary-500/10 border border-primary-500/30' : 'hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <KindDot kind={a.kind} />
                <span className="text-xs font-mono text-gray-300 truncate flex-1">{a.name}</span>
                {w?.cycle && <AlertTriangle className="w-3.5 h-3.5 text-error-400 shrink-0" />}
                {w?.fanIn && <span className="text-[10px] text-orange-400 shrink-0">hub</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Neighborhood view */}
      <div className="flex-1 studio-card p-6 overflow-y-auto relative">
        {!focusNodeId ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Search className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">Select an artifact to explore its dependencies</p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-mono font-semibold text-gray-100">
                {stripPrefix(focusNodeId)}
              </h3>
              <div className="flex items-center gap-1.5">
                {(['both', 'upstream', 'downstream'] as Direction[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDirection(d)}
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                      direction === d
                        ? 'bg-primary-500/15 border border-primary-500/40 text-primary-200'
                        : 'text-gray-500 hover:text-gray-300 border border-transparent'
                    }`}
                  >
                    {d === 'both' ? 'Both' : d === 'upstream' ? 'Depended on by' : 'Depends on'}
                  </button>
                ))}
                {warningFilter && (
                  <button
                    onClick={() => setWarningFilter(undefined)}
                    className="ml-2 text-xs px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
                  >
                    Clear {warningFilter} filter
                  </button>
                )}
              </div>
            </div>

            {displayNodes.length <= 1 && (
              <p className="text-xs text-gray-600 text-center py-8">No {direction === 'both' ? '' : direction + ' '}dependencies found</p>
            )}

            {neighborhood && neighborhood.upstream.length > 0 && (direction === 'both' || direction === 'upstream') && (
              <div className="mb-4">
                <p className="text-[11px] uppercase tracking-wide text-gray-600 mb-2 flex items-center gap-1.5">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Depended on by ({neighborhood.upstream.length})
                </p>
                <div className="space-y-1">
                  {displayNodes
                    .filter((n) => n.direction === 'upstream')
                    .map((n) => (
                      <NeighborhoodRow
                        key={n.name}
                        node={n}
                        warning={warnings.get(n.name)}
                        onClick={() => setSelectedNodeId(`${n.kind}-${n.name}`)}
                        onFocus={() => setFocusNodeId(`${n.kind}-${n.name}`)}
                      />
                    ))}
                </div>
              </div>
            )}

            {neighborhood && neighborhood.downstream.length > 0 && (direction === 'both' || direction === 'downstream') && (
              <div className="mb-4">
                <p className="text-[11px] uppercase tracking-wide text-gray-600 mb-2 flex items-center gap-1.5">
                  <ArrowDownRight className="w-3.5 h-3.5" /> Depends on ({neighborhood.downstream.length})
                </p>
                <div className="space-y-1">
                  {displayNodes
                    .filter((n) => n.direction === 'downstream')
                    .map((n) => (
                      <NeighborhoodRow
                        key={n.name}
                        node={n}
                        warning={warnings.get(n.name)}
                        onClick={() => setSelectedNodeId(`${n.kind}-${n.name}`)}
                        onFocus={() => setFocusNodeId(`${n.kind}-${n.name}`)}
                      />
                    ))}
                </div>
              </div>
            )}

            {neighborhood?.truncated && (
              <p className="text-xs text-gray-600 text-center mt-2">Neighborhood capped at 40 nodes</p>
            )}
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
    </div>
  );
}

function KindDot({ kind }: { kind: string }) {
  const color =
    kind === 'controller' ? 'bg-blue-500'
    : kind === 'service' ? 'bg-green-500'
    : kind === 'provider' ? 'bg-purple-500'
    : 'bg-amber-500';
  return <span className={`w-2 h-2 rounded-full shrink-0 ${color}`} />;
}

const kindIcons: Record<string, React.ReactNode> = {
  controller: <Box className="w-4 h-4 text-blue-400" />,
  service: <Cog className="w-4 h-4 text-green-400" />,
  provider: <Database className="w-4 h-4 text-purple-400" />,
  middleware: <Shield className="w-4 h-4 text-amber-400" />,
};

function NeighborhoodRow({
  node,
  warning,
  onClick,
  onFocus,
}: {
  node: NeighborhoodNode;
  warning?: NodeWarnings;
  onClick: () => void;
  onFocus: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-white/[0.04] transition-colors group">
      {kindIcons[node.kind] ?? kindIcons.service}
      <button onClick={onClick} className="flex-1 text-left">
        <span className="text-xs font-mono text-gray-300 group-hover:text-gray-100">{node.name}</span>
        <span className="ml-2 text-[10px] text-gray-600">hop {node.hop}</span>
      </button>
      {warning?.cycle && <AlertTriangle className="w-3.5 h-3.5 text-error-400" />}
      {warning?.fanIn && <span className="text-[10px] text-orange-400">fan-in {warning.fanIn}</span>}
      {node.filePath && (
        <button onClick={() => openInEditor({ filePath: node.filePath! })} className="opacity-0 group-hover:opacity-100 transition-opacity" title="Open in editor">
          <FileCode className="w-3.5 h-3.5 text-gray-500 hover:text-gray-300" />
        </button>
      )}
      <button onClick={onFocus} className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-primary-400 hover:text-primary-300" title="Focus this node">
        Focus
      </button>
    </div>
  );
}
