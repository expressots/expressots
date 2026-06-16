import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  type Node,
  type Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  MarkerType,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  AlertTriangle,
  Box,
  ChevronDown,
  Code2,
  Cog,
  Copy,
  Database,
  Download,
  FileCode,
  Filter,
  Layers,
  Map as MapIcon,
  Shield,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '../../stores/app-store';
import { copyToClipboard } from '../../lib/utils';
import {
  buildGraph,
  applyFilters,
  applyOverlays,
  buildDtoEdgeLabels,
} from '../../lib/architecture/graph';
import { buildWarnings, summariseWarnings } from '../../lib/architecture/warnings';
import { buildNodeStats, routeMatchScore } from '../../lib/architecture/stats';
import { buildScopeIndex } from '../../lib/architecture/scope';
import { computePulsePath } from '../../lib/architecture/pulse';
import { resolveSelectedNode, stripPrefix } from '../../lib/architecture/resolve-node';
import { toMermaid, buildSvg, downloadSvg } from '../../lib/architecture/export';
import type {
  LayoutDirection,
  NodeData,
  NodeStats,
  NodeWarnings,
} from '../../lib/architecture/types';
import { SCOPE_BADGE_CLASSES, ACTIVE_RING } from '../../lib/architecture/types';
import { NodeDetailDrawer } from './NodeDetailDrawer';
import type { RouteInfo } from '../../types';

// Custom node components defined OUTSIDE the component to prevent React
// Flow from re-registering them on every render.
function ScopeBadge({ scope }: { scope?: string }) {
  if (!scope) return null;
  const cls = SCOPE_BADGE_CLASSES[scope] ?? 'text-gray-300 bg-gray-800 border-gray-700';
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border ${cls}`}
      title={`Binding scope: ${scope}`}
    >
      {scope}
    </span>
  );
}

function StatsRow({ stats }: { stats?: NodeStats }) {
  if (!stats || stats.req === 0) return null;
  const errClass = stats.errors > 0 ? 'text-error-400' : 'text-gray-500';
  return (
    <div className="mt-1 flex items-center gap-2 text-[10px] font-mono">
      <span className="text-gray-400">{stats.req} req</span>
      <span className="text-gray-500">&middot;</span>
      <span className="text-gray-400">p95 {stats.p95Ms.toFixed(0)}ms</span>
      {stats.errors > 0 && (
        <>
          <span className="text-gray-500">&middot;</span>
          <span className={errClass}>{stats.errors} err</span>
        </>
      )}
    </div>
  );
}

function WarningBadges({ warnings }: { warnings?: NodeWarnings }) {
  if (!warnings || (!warnings.cycle && !warnings.orphan && !warnings.fanIn)) return null;
  return (
    <div className="mt-1 flex items-center gap-1">
      {warnings.cycle && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-error-500/15 border border-error-500/40 text-error-300" title="Part of a circular dependency">
          <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
          cycle
        </span>
      )}
      {warnings.orphan && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-500/15 border border-amber-500/40 text-amber-300" title="No one depends on this">
          <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
          orphan
        </span>
      )}
      {warnings.fanIn && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-orange-500/15 border border-orange-500/40 text-orange-300" title={`Used by ${warnings.fanIn} components`}>
          <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
          fan-in {warnings.fanIn}
        </span>
      )}
    </div>
  );
}

function nodeBoxClass(active: boolean | undefined, pulse: boolean | undefined, base: string) {
  return [base, active ? ACTIVE_RING : '', pulse ? 'ring-2 ring-emerald-400 shadow-[0_0_24px_rgba(34,197,94,0.5)]' : ''].filter(Boolean).join(' ');
}

function ControllerNode({ data }: { data: NodeData }) {
  return (
    <div className={nodeBoxClass(data.active, data.pulse, 'bg-blue-500/10 border-2 border-blue-500 rounded-lg p-3 min-w-[200px]')}>
      <Handle type="target" position={Position.Left} className="!bg-blue-500" />
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5">
          <Box className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs font-semibold text-blue-300">Controller</span>
        </div>
        <ScopeBadge scope={data.scope} />
      </div>
      <p className="text-sm text-white font-mono truncate">{data.label}</p>
      {data.routes !== undefined && <p className="text-[11px] text-gray-400 mt-0.5">{data.routes} route{data.routes === 1 ? '' : 's'}</p>}
      <StatsRow stats={data.stats} />
      <WarningBadges warnings={data.warnings} />
      <Handle type="source" position={Position.Right} className="!bg-blue-500" />
    </div>
  );
}

function ServiceNode({ data }: { data: NodeData }) {
  return (
    <div className={nodeBoxClass(data.active, data.pulse, 'bg-green-500/10 border-2 border-green-500 rounded-lg p-3 min-w-[200px]')}>
      <Handle type="target" position={Position.Left} className="!bg-green-500" />
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5">
          <Cog className="w-3.5 h-3.5 text-green-400" />
          <span className="text-xs font-semibold text-green-300">Service</span>
        </div>
        <ScopeBadge scope={data.scope} />
      </div>
      <p className="text-sm text-white font-mono truncate">{data.label}</p>
      {data.methods !== undefined && <p className="text-[11px] text-gray-400 mt-0.5">{data.methods} method{data.methods === 1 ? '' : 's'}</p>}
      <StatsRow stats={data.stats} />
      <WarningBadges warnings={data.warnings} />
      <Handle type="source" position={Position.Right} className="!bg-green-500" />
    </div>
  );
}

function ProviderNode({ data }: { data: NodeData }) {
  return (
    <div className={nodeBoxClass(data.active, data.pulse, 'bg-purple-500/10 border-2 border-purple-500 rounded-lg p-3 min-w-[200px]')}>
      <Handle type="target" position={Position.Left} className="!bg-purple-500" />
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-semibold text-purple-300">Provider</span>
        </div>
        <ScopeBadge scope={data.scope} />
      </div>
      <p className="text-sm text-white font-mono truncate">{data.label}</p>
      {data.methods !== undefined && <p className="text-[11px] text-gray-400 mt-0.5">{data.methods} method{data.methods === 1 ? '' : 's'}</p>}
      <StatsRow stats={data.stats} />
      <WarningBadges warnings={data.warnings} />
      <Handle type="source" position={Position.Right} className="!bg-purple-500" />
    </div>
  );
}

function MiddlewareNode({ data }: { data: NodeData }) {
  return (
    <div className={nodeBoxClass(data.active, data.pulse, 'bg-amber-500/10 border-2 border-amber-500 rounded-lg p-3 min-w-[200px]')}>
      <Handle type="target" position={Position.Left} className="!bg-amber-500" />
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-semibold text-amber-300">Middleware</span>
        </div>
        <ScopeBadge scope={data.scope} />
      </div>
      <p className="text-sm text-white font-mono truncate">{data.label}</p>
      <StatsRow stats={data.stats} />
      <WarningBadges warnings={data.warnings} />
      <Handle type="source" position={Position.Right} className="!bg-amber-500" />
    </div>
  );
}

function ModuleGroupNode({ data }: { data: { label: string; memberCount: number } }) {
  return (
    <div className="w-full h-full rounded-xl border-2 border-dashed border-gray-700 bg-gray-900/20">
      <div className="px-2 py-1 text-[10px] font-mono text-gray-500 uppercase tracking-wide">
        <Layers className="inline w-3 h-3 mr-1" />
        {data.label}
        <span className="ml-2 text-gray-600">({data.memberCount})</span>
      </div>
    </div>
  );
}

// Stable reference; defined outside so React Flow doesn't re-register node renderers.
const nodeTypes = {
  controller: ControllerNode,
  service: ServiceNode,
  provider: ProviderNode,
  middleware: MiddlewareNode,
  module: ModuleGroupNode,
};

function FitViewOnGraphChange({ structuralNodeCount, layoutDir }: { structuralNodeCount: number; layoutDir: LayoutDirection }) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    if (structuralNodeCount === 0) return;
    const frame = requestAnimationFrame(() => {
      void fitView({ padding: 0.15, duration: 150 });
    });
    return () => cancelAnimationFrame(frame);
  }, [fitView, structuralNodeCount, layoutDir]);
  return null;
}

function ToggleChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
        on ? 'bg-primary-500/15 border-primary-500/40 text-primary-200' : 'bg-black/20 border-white/[0.08] text-gray-400 hover:text-gray-200 hover:border-white/[0.14]'
      }`}
    >
      {children}
    </button>
  );
}

function ExportItem({ icon, label, hint, onClick }: { icon: React.ReactNode; label: string; hint: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-start gap-2 w-full px-3 py-2 text-left hover:bg-white/[0.05] transition-colors">
      <span className="text-gray-400 mt-0.5">{icon}</span>
      <span className="flex-1">
        <span className="block text-xs text-gray-200">{label}</span>
        <span className="block text-[10px] text-gray-500">{hint}</span>
      </span>
    </button>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded ${dot}`} />
      <span>{label}</span>
    </div>
  );
}

export function FullGraphLens() {
  const structure = useAppStore((s) => s.structure);
  const selectedExchangeId = useAppStore((s) => s.selectedExchangeId);
  const exchanges = useAppStore((s) => s.exchanges);
  const routes = useAppStore((s) => s.routes);
  const containerResolutionsByExchange = useAppStore((s) => s.containerResolutionsByExchange);
  const containerSnapshot = useAppStore((s) => s.containerSnapshot);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const setPendingApiClientRequest = useAppStore((s) => s.setPendingApiClientRequest);

  const [search, setSearch] = useState('');
  const [hideEntities, setHideEntities] = useState(false);
  const [hideOrphans, setHideOrphans] = useState(false);
  const [hideLeaves, setHideLeaves] = useState(false);
  const [hideMiddleware, setHideMiddleware] = useState(false);
  const [showModules, setShowModules] = useState(true);
  const [layoutDir, setLayoutDir] = useState<LayoutDirection>('LR');
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [copiedHint, setCopiedHint] = useState<string | null>(null);
  const [minimapOpen, setMinimapOpen] = useState(false);

  const reactFlowWrapper = useRef<HTMLDivElement | null>(null);

  const scopeIndex = useMemo(() => buildScopeIndex(containerSnapshot), [containerSnapshot]);
  const stats = useMemo(() => buildNodeStats(routes, exchanges), [routes, exchanges]);
  const warnings = useMemo(() => (structure ? buildWarnings(structure) : new Map<string, NodeWarnings>()), [structure]);
  const dtoEdgeLabels = useMemo(() => buildDtoEdgeLabels(routes, structure), [routes, structure]);

  // Live pulse.
  const PULSE_MS = 1800;
  const [pulseNodes, setPulseNodes] = useState<Set<string>>(new Set());
  const [pulseEdges, setPulseEdges] = useState<Set<string>>(new Set());
  const lastSeenExchangeId = useRef<string | null>(null);

  useEffect(() => {
    if (exchanges.length === 0 || !structure) return;
    const newest = exchanges[0];
    if (lastSeenExchangeId.current === newest.id) return;
    lastSeenExchangeId.current = newest.id;
    const path = computePulsePath(newest, routes, containerResolutionsByExchange[newest.id] ?? []);
    if (path.nodeIds.size === 0) return;
    setPulseNodes(new Set(path.nodeIds));
    setPulseEdges(new Set(path.edgeIds));
    const t = setTimeout(() => {
      setPulseNodes(new Set());
      setPulseEdges(new Set());
    }, PULSE_MS);
    return () => clearTimeout(t);
  }, [exchanges, structure, routes, containerResolutionsByExchange]);

  // Structural graph (filters/layout). Does NOT depend on pulse/active overlays.
  const structuralGraph = useMemo(() => {
    if (!structure) return { nodes: [] as Node[], edges: [] as Edge[] };
    const base = buildGraph(structure, { scopeIndex, stats, warnings, dtoEdgeLabels, layoutDir, showModules });
    return applyFilters(base, { search, hideEntities, hideOrphans, hideLeaves, hideMiddleware, warnings });
  }, [structure, scopeIndex, stats, warnings, dtoEdgeLabels, layoutDir, showModules, search, hideEntities, hideOrphans, hideLeaves, hideMiddleware]);

  // Stable structural node count for FitViewOnGraphChange.
  const structuralNodeCount = structuralGraph.nodes.filter((n) => n.type !== 'module').length;

  // Stable set of node ids for the active-path lookup (avoids depending on the full array).
  const structuralNodeIds = useMemo(
    () => new Set(structuralGraph.nodes.map((n) => n.id)),
    [structuralGraph.nodes],
  );

  const activeNodeIds = useMemo<Set<string>>(() => {
    const set = new Set<string>();
    if (!selectedExchangeId || structuralNodeIds.size === 0) return set;
    const exchange = exchanges.find((e) => e.id === selectedExchangeId);
    if (!exchange) return set;
    const matched =
      routes.find((r) => r.method === exchange.request.method && r.path === exchange.request.path) ??
      routes
        .filter((r) => r.method === exchange.request.method)
        .map((r) => ({ r, score: routeMatchScore(r.path, exchange.request.path) }))
        .filter((m) => m.score > 0)
        .sort((a, b) => b.score - a.score)[0]?.r;
    if (matched) set.add(`controller-${matched.controller}`);
    const resolved = containerResolutionsByExchange[exchange.id] ?? [];
    for (const id of resolved) {
      const name = id.replace(/^Symbol\(([^)]+)\)$/, '$1').trim();
      for (const candidate of [`service-${name}`, `provider-${name}`, `controller-${name}`]) {
        if (structuralNodeIds.has(candidate)) set.add(candidate);
      }
    }
    return set;
  }, [selectedExchangeId, exchanges, routes, containerResolutionsByExchange, structuralNodeIds]);

  const focusedNeighborhood = useMemo<Set<string>>(() => {
    if (!focusedNodeId) return new Set();
    const set = new Set<string>([focusedNodeId]);
    for (const e of structuralGraph.edges) {
      if (e.source === focusedNodeId) set.add(e.target);
      if (e.target === focusedNodeId) set.add(e.source);
    }
    return set;
  }, [focusedNodeId, structuralGraph.edges]);

  // Overlay (pulse/active/focus) applied on top of the structural graph.
  const overlayed = useMemo(
    () => applyOverlays(structuralGraph, { activeNodeIds, focusedNeighborhood, pulseNodes, pulseEdges }),
    [structuralGraph, activeNodeIds, focusedNeighborhood, pulseNodes, pulseEdges],
  );

  const [nodesState, setNodes, onNodesChange] = useNodesState(overlayed.nodes);
  const [edgesState, setEdges, onEdgesChange] = useEdgesState(overlayed.edges);

  // Sync React Flow state with computed overlay. Use a ref to skip
  // updates when the node id set hasn't changed (pulse-only changes
  // modify data but keep the same structure).
  const prevNodeIdsRef = useRef<string>('');
  useEffect(() => {
    const key = overlayed.nodes.map((n) => n.id).join(',');
    if (key !== prevNodeIdsRef.current) {
      prevNodeIdsRef.current = key;
    }
    setNodes(overlayed.nodes);
  }, [overlayed.nodes, setNodes]);
  useEffect(() => setEdges(overlayed.edges), [overlayed.edges, setEdges]);

  const selected = useMemo(() => {
    if (!selectedNodeId || !structure) return null;
    return resolveSelectedNode(selectedNodeId, structure, routes, stats.get(stripPrefix(selectedNodeId)));
  }, [selectedNodeId, structure, routes, stats]);

  if (!structure) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] text-gray-500">
        <p className="text-lg">No architecture data available</p>
        <p className="text-sm mt-2">Connect to the Studio Agent to view the architecture</p>
      </div>
    );
  }

  const tryInApiClient = (route: RouteInfo) => {
    setPendingApiClientRequest({ method: route.method, path: route.path, body: route.bodySample });
    setCurrentView('api-client');
  };

  const handleExport = async (format: 'mermaid' | 'svg' | 'json') => {
    setExportMenuOpen(false);
    if (!structure) return;
    if (format === 'mermaid') {
      const mermaid = toMermaid(structure, layoutDir);
      const ok = await copyToClipboard(mermaid);
      if (ok) flashHint('Mermaid diagram copied to clipboard');
    } else if (format === 'svg') {
      downloadSvg(buildSvg(structure, { stats, warnings, layoutDir }), 'architecture.svg');
      flashHint('Saved architecture.svg');
    } else {
      const json = JSON.stringify(
        { structure, stats: Object.fromEntries(stats), warnings: Object.fromEntries(warnings) },
        null,
        2,
      );
      const ok = await copyToClipboard(json);
      if (ok) flashHint('Architecture JSON copied to clipboard');
    }
  };

  function flashHint(text: string) {
    setCopiedHint(text);
    setTimeout(() => setCopiedHint(null), 2000);
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="studio-card p-2.5 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search nodes..." className="studio-input w-full pl-8 pr-2 py-1.5 text-xs" />
          <Filter className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>
        <ToggleChip on={hideEntities} onClick={() => setHideEntities(!hideEntities)}>Hide entities</ToggleChip>
        <ToggleChip on={hideOrphans} onClick={() => setHideOrphans(!hideOrphans)}>Hide orphans</ToggleChip>
        <ToggleChip on={hideLeaves} onClick={() => setHideLeaves(!hideLeaves)}>Hide leaves</ToggleChip>
        <ToggleChip on={hideMiddleware} onClick={() => setHideMiddleware(!hideMiddleware)}>
          <Shield className="w-3 h-3 mr-1" />Hide middleware
        </ToggleChip>
        <ToggleChip on={showModules} onClick={() => setShowModules(!showModules)}>
          <Layers className="w-3 h-3 mr-1" />Modules
        </ToggleChip>
        <div className="studio-segment">
          {(['LR', 'TB'] as LayoutDirection[]).map((d) => (
            <button key={d} onClick={() => setLayoutDir(d)} className={`px-2.5 py-1 text-[10px] font-medium tracking-wide transition-colors ${layoutDir === d ? 'studio-segment-btn-active' : 'text-gray-500 hover:text-gray-300'}`}>{d}</button>
          ))}
        </div>
        {focusedNodeId && (
          <button onClick={() => setFocusedNodeId(null)} className="text-[11px] px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20">Clear focus</button>
        )}
        <span className="text-[11px] text-gray-500 ml-auto">
          {structuralNodeCount} nodes{summariseWarnings(warnings) ? ` \u00b7 ${summariseWarnings(warnings)}` : ''}
        </span>
        <div className="relative">
          <button onClick={() => setExportMenuOpen(!exportMenuOpen)} className="studio-btn"><Download className="w-3.5 h-3.5" />Export<ChevronDown className="w-3 h-3" /></button>
          {exportMenuOpen && (
            <div className="absolute right-0 top-full mt-1 z-10 w-48 studio-card shadow-elevated">
              <ExportItem icon={<Copy className="w-3.5 h-3.5" />} label="Copy as Mermaid" hint="Paste into READMEs / PRs" onClick={() => handleExport('mermaid')} />
              <ExportItem icon={<FileCode className="w-3.5 h-3.5" />} label="Download SVG" hint="Scalable vector for docs" onClick={() => handleExport('svg')} />
              <ExportItem icon={<Code2 className="w-3.5 h-3.5" />} label="Copy as JSON" hint="Stats + warnings + structure" onClick={() => handleExport('json')} />
            </div>
          )}
        </div>
      </div>

      {/* Graph canvas */}
      <div ref={reactFlowWrapper} className="studio-card relative h-[calc(100vh-260px)]">
        <ReactFlow
          nodes={nodesState}
          edges={edgesState}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          onNodeClick={(_e, node) => {
            if (node.type === 'module') return;
            setSelectedNodeId(node.id);
            setFocusedNodeId(node.id);
          }}
          onEdgeClick={(_e, edge) => {
            const nodeId = edge.source.startsWith('middleware-') ? edge.target : edge.source;
            setSelectedNodeId(nodeId);
            setFocusedNodeId(nodeId);
          }}
          onPaneClick={() => { setFocusedNodeId(null); setSelectedNodeId(null); }}
          defaultEdgeOptions={{
            type: 'smoothstep',
            style: { stroke: '#475569' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' },
          }}
        >
          <FitViewOnGraphChange structuralNodeCount={structuralNodeCount} layoutDir={layoutDir} />
          <Background color="#374151" gap={20} />
          <Controls className="!bg-[#14171c] !border-white/[0.08]" showZoom showFitView showInteractive={false} />
          {minimapOpen && (
            <MiniMap
              className="!bg-gray-900 !border !border-gray-800 !rounded-md"
              style={{ width: 160, height: 100 }}
              pannable
              zoomable
              maskColor="rgba(15, 23, 42, 0.7)"
              nodeStrokeWidth={2}
              nodeColor={(node) => {
                switch (node.type) {
                  case 'controller': return '#3b82f6';
                  case 'service': return '#22c55e';
                  case 'provider': return '#a855f7';
                  case 'module': return '#1e293b';
                  default: return '#6b7280';
                }
              }}
            />
          )}
        </ReactFlow>

        <button
          onClick={() => setMinimapOpen(!minimapOpen)}
          className={`absolute bottom-4 right-4 flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] border transition-colors ${
            minimapOpen ? 'bg-primary-500/15 border-primary-500/40 text-primary-200' : 'bg-[#14171c]/80 border-white/[0.08] text-gray-400 hover:text-gray-200 hover:border-white/[0.14]'
          }`}
          title={minimapOpen ? 'Hide minimap' : 'Show minimap'}
        >
          <MapIcon className="w-3.5 h-3.5" />
          {minimapOpen ? 'Hide map' : 'Map'}
        </button>

        {selectedExchangeId && activeNodeIds.size > 0 && (
          <div className="absolute top-4 right-4 bg-primary-500/15 border border-primary-500/40 backdrop-blur-sm px-3 py-2 rounded-lg text-xs text-primary-200">
            Showing the {activeNodeIds.size}-node active path for the selected request.
          </div>
        )}

        {pulseEdges.size > 0 && !selectedExchangeId && (
          <div className="absolute top-4 right-4 bg-emerald-500/15 border border-emerald-500/40 backdrop-blur-sm px-3 py-2 rounded-lg text-xs text-emerald-200 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            Live request flowing
          </div>
        )}

        {copiedHint && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#14171c]/95 border border-white/[0.1] px-3 py-1.5 rounded-md text-xs text-gray-200">{copiedHint}</div>
        )}

        <div className="absolute bottom-4 left-4 bg-[#14171c]/90 backdrop-blur-sm p-3 rounded-lg border border-white/[0.08]">
          <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Legend</h4>
          <div className="space-y-1 text-[11px] text-gray-400">
            <Legend dot="bg-blue-500" label="Controller" />
            <Legend dot="bg-green-500" label="Service / Use Case" />
            <Legend dot="bg-purple-500" label="Provider" />
            <Legend dot="bg-amber-500" label="Middleware" />
            <Legend dot="bg-orange-500" label="Warning" />
          </div>
        </div>

        {selected && (
          <NodeDetailDrawer node={selected} onClose={() => setSelectedNodeId(null)} onTryInApiClient={tryInApiClient} />
        )}
      </div>
    </div>
  );
}
