/**
 * Architecture Map — interactive, layered DI/route graph for ExpressoTS apps.
 *
 * Beyond plain visualisation this view provides:
 *   - Module-aware grouping (bounding boxes per `CreateModule(...)`)
 *   - Per-node runtime stats (req count, p95, errors) from recorded exchanges
 *   - Live request-flow pulses on each new exchange
 *   - Cycle / orphan / fan-in warnings (passive lint)
 *   - Search + 1-hop focus mode + filter chips
 *   - Node detail drawer with "Try in API Client" + "Open in editor"
 *   - Mermaid + SVG export
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
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
  GitBranch,
  Layers,
  Map as MapIcon,
  Send,
  Shield,
  Sparkles,
  X,
} from 'lucide-react';
import { useAppStore } from '../stores/app-store';
import { openInEditor } from '../lib/open-in-editor';
import { assignNodeDepths } from '../lib/architecture-layout';
import { copyToClipboard, getMethodColor } from '../lib/utils';
import type {
  AppStructure,
  ContainerSnapshot,
  RecordedExchange,
  RouteInfo,
} from '../types';

// ────────────────────────────────────────────────────────────────────────
// Helpers — safe data access bridges React Flow's loose `Record<string,
// unknown>` data shape with our strongly-typed payloads.
// ────────────────────────────────────────────────────────────────────────

function asNodeData(data: Node['data']): NodeData {
  return data as unknown as NodeData;
}

function asModuleNodeData(data: Node['data']): ModuleNodeData {
  return data as unknown as ModuleNodeData;
}

// ────────────────────────────────────────────────────────────────────────
// Constants & shared types
// ────────────────────────────────────────────────────────────────────────

const SCOPE_BADGE_CLASSES: Record<string, string> = {
  Singleton: 'text-primary-300 bg-primary-950/60 border-primary-700/50',
  Request: 'text-amber-300 bg-amber-950/50 border-amber-700/50',
  Transient: 'text-purple-300 bg-purple-950/50 border-purple-700/50',
  // Middleware-scope badges. Distinct palette from DI-scope badges
  // (above) so the same chip slot can render either kind without
  // confusing the user — middleware nodes never have a DI scope.
  Global: 'text-orange-300 bg-orange-950/50 border-orange-700/50',
  Controller: 'text-amber-300 bg-amber-950/50 border-amber-700/50',
  Route: 'text-yellow-300 bg-yellow-950/50 border-yellow-700/50',
};

/** Adds a green ring + glow to nodes that participated in the active request. */
const ACTIVE_RING =
  'ring-2 ring-primary-500 ring-offset-2 ring-offset-gray-950 shadow-[0_0_18px_rgba(61,230,120,0.35)]';

/** Per-node runtime stats aggregated from recorded exchanges. */
interface NodeStats {
  req: number;
  errors: number;
  /** Average duration in milliseconds. */
  avgMs: number;
  /** P95 duration in milliseconds. 0 when fewer than 2 samples. */
  p95Ms: number;
}

/** Node-level architectural lint hits surfaced as badges. */
interface NodeWarnings {
  cycle?: boolean;
  orphan?: boolean;
  fanIn?: number; // populated when fan-in >= FAN_IN_WARN
}

const FAN_IN_WARN = 5;

/** Layout direction toggle. */
type LayoutDirection = 'LR' | 'TB';

interface NodeData {
  label: string;
  routes?: number;
  methods?: number;
  filePath?: string;
  active?: boolean;
  scope?: string;
  stats?: NodeStats;
  warnings?: NodeWarnings;
  pulse?: boolean;
}

interface ModuleNodeData {
  label: string;
  filePath?: string;
  memberCount: number;
}

const ENTITY_HINT = /entity$/i;

// ────────────────────────────────────────────────────────────────────────
// Top-level component
// ────────────────────────────────────────────────────────────────────────

export function ArchitectureMap() {
  const {
    structure,
    selectedExchangeId,
    exchanges,
    routes,
    containerResolutionsByExchange,
    containerSnapshot,
    setCurrentView,
    setPendingApiClientRequest,
  } = useAppStore();

  // Toolbar state
  const [search, setSearch] = useState<string>('');
  const [hideEntities, setHideEntities] = useState<boolean>(false);
  const [hideOrphans, setHideOrphans] = useState<boolean>(false);
  const [hideLeaves, setHideLeaves] = useState<boolean>(false);
  const [hideMiddleware, setHideMiddleware] = useState<boolean>(false);
  const [showModules, setShowModules] = useState<boolean>(true);
  const [layoutDir, setLayoutDir] = useState<LayoutDirection>('LR');
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState<boolean>(false);
  const [copiedHint, setCopiedHint] = useState<string | null>(null);
  // Minimap is collapsed by default to keep the workspace clean —
  // expanded mode is one click away when users want a bird's-eye
  // navigator.
  const [minimapOpen, setMinimapOpen] = useState<boolean>(false);

  const reactFlowWrapper = useRef<HTMLDivElement | null>(null);

  const scopeIndex = useMemo(() => buildScopeIndex(containerSnapshot), [containerSnapshot]);

  // Per-node runtime stats from recorded exchanges. Re-computed on
  // every exchange change but bounded by the store's 100-item cap.
  const stats = useMemo(() => buildNodeStats(routes, exchanges), [routes, exchanges]);

  // Architectural warnings — pure function of the structure graph.
  const warnings = useMemo(() => (structure ? buildWarnings(structure) : new Map()), [structure]);

  // DTO labels per controller→target edge (built once per structure +
  // routes change). Keyed by the dependency graph edge id format used
  // below in `buildGraph`.
  const dtoEdgeLabels = useMemo(
    () => buildDtoEdgeLabels(routes, structure),
    [routes, structure],
  );

  // Live request-flow pulse — when a new exchange lands, briefly mark
  // the resolved nodes/edges so the diagram visibly reacts. Drained
  // after PULSE_MS so there's no permanent visual debt.
  const PULSE_MS = 1800;
  const [pulseNodes, setPulseNodes] = useState<Set<string>>(new Set());
  const [pulseEdges, setPulseEdges] = useState<Set<string>>(new Set());
  const lastSeenExchangeId = useRef<string | null>(null);

  useEffect(() => {
    if (exchanges.length === 0 || !structure) return;
    const newest = exchanges[0]; // newest-first per the store
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

  // Build the unfiltered base graph (nodes + edges + module groups).
  const baseGraph = useMemo(() => {
    if (!structure) return { nodes: [] as Node[], edges: [] as Edge[] };
    return buildGraph(structure, {
      scopeIndex,
      stats,
      warnings,
      dtoEdgeLabels,
      layoutDir,
      showModules,
    });
  }, [structure, scopeIndex, stats, warnings, dtoEdgeLabels, layoutDir, showModules]);

  // Apply the toolbar filters + the active-exchange overlay + pulses.
  const activeNodeIds = useMemo<Set<string>>(() => {
    const set = new Set<string>();
    if (!selectedExchangeId || baseGraph.nodes.length === 0) return set;
    const exchange = exchanges.find((e) => e.id === selectedExchangeId);
    if (!exchange) return set;

    const matched =
      routes.find(
        (r) => r.method === exchange.request.method && r.path === exchange.request.path,
      ) ??
      routes
        .filter((r) => r.method === exchange.request.method)
        .map((r) => ({ r, score: routeMatchScore(r.path, exchange.request.path) }))
        .filter((m) => m.score > 0)
        .sort((a, b) => b.score - a.score)[0]?.r;

    if (matched) set.add(`controller-${matched.controller}`);

    const resolved = containerResolutionsByExchange[exchange.id] ?? [];
    for (const id of resolved) {
      const name = id.replace(/^Symbol\(([^)]+)\)$/, '$1').trim();
      const ids = [`service-${name}`, `provider-${name}`, `controller-${name}`];
      for (const candidate of ids) {
        if (baseGraph.nodes.some((n) => n.id === candidate)) set.add(candidate);
      }
    }
    return set;
  }, [selectedExchangeId, exchanges, routes, containerResolutionsByExchange, baseGraph.nodes]);

  // 1-hop neighborhood of the focused node (in & out).
  const focusedNeighborhood = useMemo<Set<string>>(() => {
    if (!focusedNodeId) return new Set();
    const set = new Set<string>([focusedNodeId]);
    for (const e of baseGraph.edges) {
      if (e.source === focusedNodeId) set.add(e.target);
      if (e.target === focusedNodeId) set.add(e.source);
    }
    return set;
  }, [focusedNodeId, baseGraph.edges]);

  const filteredGraph = useMemo(() => {
    return applyFilters(baseGraph, {
      search,
      hideEntities,
      hideOrphans,
      hideLeaves,
      hideMiddleware,
      warnings,
    });
  }, [baseGraph, search, hideEntities, hideOrphans, hideLeaves, hideMiddleware, warnings]);

  const overlayed = useMemo(() => {
    return applyOverlays(filteredGraph, {
      activeNodeIds,
      focusedNeighborhood,
      pulseNodes,
      pulseEdges,
    });
  }, [filteredGraph, activeNodeIds, focusedNeighborhood, pulseNodes, pulseEdges]);

  const [nodesState, setNodes, onNodesChange] = useNodesState(overlayed.nodes);
  const [edgesState, setEdges, onEdgesChange] = useEdgesState(overlayed.edges);

  useEffect(() => setNodes(overlayed.nodes), [overlayed.nodes, setNodes]);
  useEffect(() => setEdges(overlayed.edges), [overlayed.edges, setEdges]);

  // Selected node payload for the detail drawer.
  const selected = useMemo(() => {
    if (!selectedNodeId || !structure) return null;
    return resolveSelectedNode(selectedNodeId, structure, routes, stats.get(stripPrefix(selectedNodeId)));
  }, [selectedNodeId, structure, routes, stats]);

  if (!structure) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] text-gray-500">
        <GitBranch className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-lg">No architecture data available</p>
        <p className="text-sm mt-2">Connect to the Studio Agent to view the architecture</p>
      </div>
    );
  }

  const tryInApiClient = (route: RouteInfo) => {
    setPendingApiClientRequest({
      method: route.method,
      path: route.path,
      body: route.bodySample,
    });
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
      <Toolbar
        search={search}
        onSearch={setSearch}
        hideEntities={hideEntities}
        setHideEntities={setHideEntities}
        hideOrphans={hideOrphans}
        setHideOrphans={setHideOrphans}
        hideLeaves={hideLeaves}
        setHideLeaves={setHideLeaves}
        hideMiddleware={hideMiddleware}
        setHideMiddleware={setHideMiddleware}
        showModules={showModules}
        setShowModules={setShowModules}
        layoutDir={layoutDir}
        setLayoutDir={setLayoutDir}
        exportMenuOpen={exportMenuOpen}
        setExportMenuOpen={setExportMenuOpen}
        onExport={handleExport}
        focusedNodeId={focusedNodeId}
        clearFocus={() => setFocusedNodeId(null)}
        nodeCount={overlayed.nodes.filter((n) => n.type !== 'module').length}
        warningSummary={summariseWarnings(warnings)}
      />

      <div
        ref={reactFlowWrapper}
        className="studio-card relative h-[calc(100vh-260px)]"
      >
        <ReactFlow
          nodes={nodesState}
          edges={edgesState}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          minZoom={0.1}
          maxZoom={2}
          // Hide the "React Flow" attribution badge in the bottom-right.
          // Allowed by the MIT license; we keep the credit in our docs.
          proOptions={{ hideAttribution: true }}
          onNodeClick={(_e, node) => {
            if (node.type === 'module') return;
            setSelectedNodeId(node.id);
            setFocusedNodeId(node.id);
          }}
          onEdgeClick={(_e, edge) => {
            // Clicking a DTO-labelled edge (or any edge) selects the
            // source node so the detail drawer opens with context about
            // the relationship. For middleware→controller edges, select
            // the target (the controller); otherwise the source.
            const nodeId = edge.source.startsWith('middleware-')
              ? edge.target
              : edge.source;
            setSelectedNodeId(nodeId);
            setFocusedNodeId(nodeId);
          }}
          onPaneClick={() => {
            setFocusedNodeId(null);
            setSelectedNodeId(null);
          }}
          defaultEdgeOptions={{
            type: 'smoothstep',
            style: { stroke: '#475569' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' },
          }}
        >
          <FitViewOnGraphChange
            nodeCount={overlayed.nodes.length}
            layoutDir={layoutDir}
          />
          <Background color="#374151" gap={20} />
          <Controls
            className="!bg-[#14171c] !border-white/[0.08]"
            showZoom
            showFitView
            showInteractive={false}
          />
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
                  case 'controller':
                    return '#3b82f6';
                  case 'service':
                    return '#22c55e';
                  case 'provider':
                    return '#a855f7';
                  case 'module':
                    return '#1e293b';
                  default:
                    return '#6b7280';
                }
              }}
            />
          )}
        </ReactFlow>

        {/* Minimap toggle — collapsed by default to keep the workspace
            uncluttered. Click to peek a bird's-eye navigator. */}
        <button
          onClick={() => setMinimapOpen(!minimapOpen)}
          className={`absolute bottom-4 right-4 flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] border transition-colors ${
            minimapOpen
              ? 'bg-primary-500/15 border-primary-500/40 text-primary-200'
              : 'bg-[#14171c]/80 border-white/[0.08] text-gray-400 hover:text-gray-200 hover:border-white/[0.14]'
          }`}
          title={minimapOpen ? 'Hide minimap' : 'Show minimap'}
        >
          <MapIcon className="w-3.5 h-3.5" />
          {minimapOpen ? 'Hide map' : 'Map'}
        </button>

        {/* Active-path / pulse banner */}
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
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#14171c]/95 border border-white/[0.1] px-3 py-1.5 rounded-md text-xs text-gray-200">
            {copiedHint}
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-[#14171c]/90 backdrop-blur-sm p-3 rounded-lg border border-white/[0.08]">
          <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Legend
          </h4>
          <div className="space-y-1 text-[11px] text-gray-400">
            <Legend dot="bg-blue-500" label="Controller" />
            <Legend dot="bg-green-500" label="Service / Use Case" />
            <Legend dot="bg-purple-500" label="Provider" />
            <Legend dot="bg-amber-500" label="Middleware" />
            <Legend dot="bg-orange-500" label="Warning" />
          </div>
        </div>

        {selected && (
          <NodeDetailDrawer
            node={selected}
            onClose={() => setSelectedNodeId(null)}
            onTryInApiClient={tryInApiClient}
          />
        )}
      </div>
    </div>
  );
}

/** Fit the viewport once when the graph shape changes, not on every render. */
function FitViewOnGraphChange({
  nodeCount,
  layoutDir,
}: {
  nodeCount: number;
  layoutDir: LayoutDirection;
}) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (nodeCount === 0) return;
    const frame = requestAnimationFrame(() => {
      void fitView({ padding: 0.15, duration: 150 });
    });
    return () => cancelAnimationFrame(frame);
  }, [fitView, nodeCount, layoutDir]);

  return null;
}

// ────────────────────────────────────────────────────────────────────────
// Toolbar
// ────────────────────────────────────────────────────────────────────────

function Toolbar(props: {
  search: string;
  onSearch: (v: string) => void;
  hideEntities: boolean;
  setHideEntities: (v: boolean) => void;
  hideOrphans: boolean;
  setHideOrphans: (v: boolean) => void;
  hideLeaves: boolean;
  setHideLeaves: (v: boolean) => void;
  hideMiddleware: boolean;
  setHideMiddleware: (v: boolean) => void;
  showModules: boolean;
  setShowModules: (v: boolean) => void;
  layoutDir: LayoutDirection;
  setLayoutDir: (v: LayoutDirection) => void;
  exportMenuOpen: boolean;
  setExportMenuOpen: (v: boolean) => void;
  onExport: (format: 'mermaid' | 'svg' | 'json') => void;
  focusedNodeId: string | null;
  clearFocus: () => void;
  nodeCount: number;
  warningSummary: string;
}) {
  return (
    <div className="studio-card p-2.5 flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px]">
        <input
          type="text"
          value={props.search}
          onChange={(e) => props.onSearch(e.target.value)}
          placeholder="Search nodes…"
          className="studio-input w-full pl-8 pr-2 py-1.5 text-xs"
        />
        <Filter className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
      </div>

      <ToggleChip on={props.hideEntities} onClick={() => props.setHideEntities(!props.hideEntities)}>
        Hide entities
      </ToggleChip>
      <ToggleChip on={props.hideOrphans} onClick={() => props.setHideOrphans(!props.hideOrphans)}>
        Hide orphans
      </ToggleChip>
      <ToggleChip on={props.hideLeaves} onClick={() => props.setHideLeaves(!props.hideLeaves)}>
        Hide leaves
      </ToggleChip>
      <ToggleChip
        on={props.hideMiddleware}
        onClick={() => props.setHideMiddleware(!props.hideMiddleware)}
      >
        <Shield className="w-3 h-3 mr-1" />
        Hide middleware
      </ToggleChip>
      <ToggleChip on={props.showModules} onClick={() => props.setShowModules(!props.showModules)}>
        <Layers className="w-3 h-3 mr-1" />
        Modules
      </ToggleChip>

      <div className="studio-segment">
        {(['LR', 'TB'] as LayoutDirection[]).map((d) => (
          <button
            key={d}
            onClick={() => props.setLayoutDir(d)}
            className={`px-2.5 py-1 text-[10px] font-medium tracking-wide transition-colors ${
              props.layoutDir === d
                ? 'studio-segment-btn-active'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {props.focusedNodeId && (
        <button
          onClick={props.clearFocus}
          className="text-[11px] px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
        >
          Clear focus
        </button>
      )}

      <span className="text-[11px] text-gray-500 ml-auto">
        {props.nodeCount} nodes
        {props.warningSummary ? ` · ${props.warningSummary}` : ''}
      </span>

      <div className="relative">
        <button
          onClick={() => props.setExportMenuOpen(!props.exportMenuOpen)}
          className="studio-btn"
        >
          <Download className="w-3.5 h-3.5" />
          Export
          <ChevronDown className="w-3 h-3" />
        </button>
        {props.exportMenuOpen && (
          <div className="absolute right-0 top-full mt-1 z-10 w-48 studio-card shadow-elevated">
            <ExportItem
              icon={<Copy className="w-3.5 h-3.5" />}
              label="Copy as Mermaid"
              hint="Paste into READMEs / PRs"
              onClick={() => props.onExport('mermaid')}
            />
            <ExportItem
              icon={<FileCode className="w-3.5 h-3.5" />}
              label="Download SVG"
              hint="Scalable vector for docs"
              onClick={() => props.onExport('svg')}
            />
            <ExportItem
              icon={<Code2 className="w-3.5 h-3.5" />}
              label="Copy as JSON"
              hint="Stats + warnings + structure"
              onClick={() => props.onExport('json')}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ToggleChip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
        on
          ? 'bg-primary-500/15 border-primary-500/40 text-primary-200'
          : 'bg-black/20 border-white/[0.08] text-gray-400 hover:text-gray-200 hover:border-white/[0.14]'
      }`}
    >
      {children}
    </button>
  );
}

function ExportItem({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-2 w-full px-3 py-2 text-left hover:bg-white/[0.05] transition-colors"
    >
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

// ────────────────────────────────────────────────────────────────────────
// Node detail drawer
// ────────────────────────────────────────────────────────────────────────

interface SelectedNode {
  kind: 'controller' | 'service' | 'provider' | 'middleware';
  name: string;
  filePath?: string;
  routes: RouteInfo[];
  methods: string[];
  dependencies: string[];
  stats?: NodeStats;
  /** Pipeline scope when `kind === 'middleware'`. */
  middlewareScope?: 'global' | 'controller' | 'route' | 'unknown';
}

function resolveSelectedNode(
  nodeId: string,
  structure: AppStructure,
  routes: RouteInfo[],
  stats?: NodeStats,
): SelectedNode | null {
  if (nodeId.startsWith('controller-')) {
    const name = nodeId.slice('controller-'.length);
    const c = structure.controllers.find((x) => x.name === name);
    if (!c) return null;
    return {
      kind: 'controller',
      name,
      filePath: c.filePath,
      routes: routes.filter((r) => r.controller === name),
      methods: [],
      dependencies: c.dependencies,
      stats,
    };
  }
  if (nodeId.startsWith('service-')) {
    const name = nodeId.slice('service-'.length);
    const s = structure.services.find((x) => x.name === name);
    if (!s) return null;
    return {
      kind: 'service',
      name,
      filePath: s.filePath,
      routes: [],
      methods: s.methods,
      dependencies: s.dependencies,
      stats,
    };
  }
  if (nodeId.startsWith('provider-')) {
    const name = nodeId.slice('provider-'.length);
    const p = structure.providers.find((x) => x.name === name);
    if (!p) return null;
    return {
      kind: 'provider',
      name,
      filePath: p.filePath,
      routes: [],
      methods: p.methods,
      dependencies: p.dependencies,
      stats,
    };
  }
  if (nodeId.startsWith('middleware-')) {
    const name = nodeId.slice('middleware-'.length);
    const m = structure.middleware.find((x) => x.name === name);
    if (!m) return null;
    return {
      kind: 'middleware',
      name,
      filePath: m.filePath || undefined,
      routes: [],
      methods: m.methods,
      dependencies: m.dependencies,
      stats,
      middlewareScope: m.scope,
    };
  }
  return null;
}

function NodeDetailDrawer({
  node,
  onClose,
  onTryInApiClient,
}: {
  node: SelectedNode;
  onClose: () => void;
  onTryInApiClient: (route: RouteInfo) => void;
}) {
  return (
    <div className="absolute right-0 top-0 bottom-0 w-96 bg-[#0e1014]/95 border-l border-white/[0.07] backdrop-blur-md p-4 overflow-y-auto">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-500">{node.kind}</p>
          <h3 className="text-sm font-mono font-semibold text-gray-100">{node.name}</h3>
        </div>
        <button
          onClick={onClose}
          className="studio-icon-btn"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {node.stats && node.stats.req > 0 && (
        <div className="studio-stat mb-3 !px-3 !py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Runtime</p>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-gray-300">
              <span className="text-gray-500">req:</span> {node.stats.req}
            </span>
            <span className="text-gray-300">
              <span className="text-gray-500">avg:</span> {node.stats.avgMs.toFixed(0)}ms
            </span>
            <span className="text-gray-300">
              <span className="text-gray-500">p95:</span> {node.stats.p95Ms.toFixed(0)}ms
            </span>
            <span className={node.stats.errors > 0 ? 'text-error-400' : 'text-gray-500'}>
              <span className="text-gray-500">err:</span> {node.stats.errors}
            </span>
          </div>
        </div>
      )}

      {node.routes.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
            Routes ({node.routes.length})
          </p>
          <div className="space-y-1">
            {node.routes.map((r, i) => (
              <div
                key={`${r.method}-${r.path}-${i}`}
                className="studio-card !rounded-md p-1.5"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-mono font-semibold w-12 text-center ${getMethodColor(
                      r.method,
                    )}`}
                  >
                    {r.method}
                  </span>
                  <span className="text-xs font-mono text-gray-200 flex-1 truncate">{r.path}</span>
                  <button
                    onClick={() => onTryInApiClient(r)}
                    title="Send via API Client"
                    className="text-primary-300 hover:text-primary-200 p-1 rounded hover:bg-primary-500/10"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
                {r.bodyDto && (
                  <div className="mt-1 ml-14">
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-sky-400/70">body:</span>
                      <span className="text-[10px] font-mono text-sky-300">{r.bodyDto}</span>
                    </div>
                    {r.bodySample && Object.keys(r.bodySample).length > 0 && (
                      <div className="mt-0.5 ml-2 space-y-px">
                        {Object.entries(r.bodySample).map(([field, value]) => (
                          <div key={field} className="flex items-center gap-1.5 text-[9px]">
                            <span className="font-mono text-gray-400">{field}</span>
                            <span className="text-gray-600">:</span>
                            <span className="font-mono text-gray-500">{typeof value === 'object' && value !== null ? 'object' : typeof value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {node.methods.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
            Methods ({node.methods.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {node.methods.map((m) => (
              <span
                key={m}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/20 border border-white/[0.08] text-gray-300"
              >
                {m}()
              </span>
            ))}
          </div>
        </div>
      )}

      {node.dependencies.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Depends on</p>
          <div className="flex flex-wrap gap-1">
            {node.dependencies.map((d) => (
              <span
                key={d}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/20 border border-white/[0.08] text-gray-300"
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      {node.filePath && (
        <button
          onClick={() => openInEditor({ filePath: node.filePath! })}
          className="studio-btn w-full justify-center mt-2"
        >
          <FileCode className="w-3.5 h-3.5" />
          Open in editor
        </button>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Graph builder
// ────────────────────────────────────────────────────────────────────────

const nodeTypes = {
  controller: ControllerNode,
  service: ServiceNode,
  provider: ProviderNode,
  middleware: MiddlewareNode,
  module: ModuleGroupNode,
};

interface BuildGraphOptions {
  scopeIndex: Map<string, string>;
  stats: Map<string, NodeStats>;
  warnings: Map<string, NodeWarnings>;
  dtoEdgeLabels: Map<string, string>;
  layoutDir: LayoutDirection;
  showModules: boolean;
}

function buildGraph(
  structure: AppStructure,
  opts: BuildGraphOptions,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const nodeMap = new Map<string, string>();

  type NodeKind = 'controller' | 'service' | 'provider' | 'middleware';
  interface Entry {
    name: string;
    kind: NodeKind;
    routes?: number;
    methods?: number;
    filePath?: string;
    /**
     * Pipeline scope for `kind === 'middleware'` entries. Used both as
     * the badge text on the node and as a layout hint (global lives at
     * the leftmost column, scoped middleware sits adjacent to its
     * controllers).
     */
    middlewareScope?: 'global' | 'controller' | 'route' | 'unknown';
  }

  const middlewareScopeLabel: Record<NonNullable<Entry['middlewareScope']>, string> = {
    global: 'Global',
    controller: 'Controller',
    route: 'Route',
    unknown: '',
  };

  const allEntries: Entry[] = [
    ...structure.controllers.map<Entry>((c) => ({
      name: c.name,
      kind: 'controller',
      routes: c.routes.length,
      filePath: c.filePath,
    })),
    ...structure.services.map<Entry>((s) => ({
      name: s.name,
      kind: 'service',
      methods: s.methods.length,
      filePath: s.filePath,
    })),
    ...structure.providers.map<Entry>((p) => ({
      name: p.name,
      kind: 'provider',
      methods: p.methods.length,
      filePath: p.filePath,
    })),
    ...structure.middleware.map<Entry>((m) => ({
      name: m.name,
      kind: 'middleware',
      filePath: m.filePath || undefined,
      middlewareScope: m.scope,
    })),
  ];

  for (const entry of allEntries) {
    nodeMap.set(entry.name, `${entry.kind}-${entry.name}`);
  }

  // Layered-layout depth per node. The algorithm lives in a pure,
  // React-free helper (`assignNodeDepths`) so it can be unit-tested
  // against pathological inputs — most importantly cyclic DI graphs,
  // which previously spun the relaxation forever and froze this tab.
  const depth = assignNodeDepths(allEntries, structure.dependencies);

  // Bucket per layer.
  const layers = new Map<number, Entry[]>();
  for (const entry of allEntries) {
    const d = depth.get(entry.name) ?? 0;
    const list = layers.get(d) ?? [];
    list.push(entry);
    layers.set(d, list);
  }

  const COL_WIDTH = 300;
  const ROW_HEIGHT = 150;
  const X_OFFSET = 80;
  const Y_OFFSET = 60;

  // Position every node — in LR mode depth maps to X, in TB mode to Y.
  const positions = new Map<string, { x: number; y: number }>();
  for (const [layerDepth, entries] of layers) {
    entries.sort((a, b) => {
      const order: Record<NodeKind, number> = {
        middleware: 0,
        controller: 1,
        service: 2,
        provider: 3,
      };
      if (order[a.kind] !== order[b.kind]) return order[a.kind] - order[b.kind];
      return a.name.localeCompare(b.name);
    });
    entries.forEach((entry, indexWithinLayer) => {
      const x =
        opts.layoutDir === 'LR'
          ? X_OFFSET + layerDepth * COL_WIDTH
          : X_OFFSET + indexWithinLayer * COL_WIDTH;
      const y =
        opts.layoutDir === 'LR'
          ? Y_OFFSET + indexWithinLayer * ROW_HEIGHT
          : Y_OFFSET + layerDepth * ROW_HEIGHT;
      positions.set(entry.name, { x, y });
    });
  }

  // Compute the in-graph membership of each module for the bounding boxes.
  const moduleByMember = new Map<string, string>();
  if (opts.showModules) {
    for (const m of structure.modules ?? []) {
      for (const member of m.members) {
        // First module wins to keep one box per node.
        if (!moduleByMember.has(member)) moduleByMember.set(member, m.name);
      }
    }
  }

  // Emit nodes (children first → modules computed after we know bounds).
  for (const entry of allEntries) {
    const pos = positions.get(entry.name)!;
    const moduleName = moduleByMember.get(entry.name);
    // Middleware uses the same `scope` slot as DI nodes, but the value
    // comes from the pipeline scope (Global / Controller / Route)
    // rather than from the container snapshot.
    const scope =
      entry.kind === 'middleware'
        ? entry.middlewareScope && entry.middlewareScope !== 'unknown'
          ? middlewareScopeLabel[entry.middlewareScope]
          : undefined
        : opts.scopeIndex.get(entry.name);
    nodes.push({
      id: nodeMap.get(entry.name)!,
      type: entry.kind,
      position: pos,
      ...(moduleName ? { parentId: `module-${moduleName}`, extent: 'parent' as const } : {}),
      data: {
        label: entry.name,
        routes: entry.routes,
        methods: entry.methods,
        filePath: entry.filePath,
        scope,
        stats: opts.stats.get(entry.name),
        warnings: opts.warnings.get(entry.name),
      } satisfies NodeData,
    });
  }

  // Build module group nodes — must come *before* their children in
  // React Flow's render order.
  if (opts.showModules) {
    const PADDING = 32;
    const modulesToRender: Node[] = [];
    for (const m of structure.modules ?? []) {
      const childPositions = m.members
        .map((name) => positions.get(name))
        .filter((p): p is { x: number; y: number } => Boolean(p));
      if (childPositions.length === 0) continue;
      const minX = Math.min(...childPositions.map((p) => p.x));
      const minY = Math.min(...childPositions.map((p) => p.y));
      const maxX = Math.max(...childPositions.map((p) => p.x)) + 220; // node width
      const maxY = Math.max(...childPositions.map((p) => p.y)) + 110; // node height
      modulesToRender.push({
        id: `module-${m.name}`,
        type: 'module',
        position: { x: minX - PADDING, y: minY - PADDING },
        data: {
          label: m.name,
          filePath: m.filePath,
          memberCount: m.members.length,
        } satisfies ModuleNodeData,
        style: {
          width: maxX - minX + PADDING * 2,
          height: maxY - minY + PADDING * 2,
        },
        // Modules are now draggable so users can rearrange the diagram
        // any way they like. React Flow propagates the move to every
        // child node automatically (because of `parentId` + `extent:
        // 'parent'` below), so dragging a module physically moves the
        // entire feature group as one unit.
        selectable: true,
        draggable: true,
        zIndex: -1,
      });
    }
    // Re-position children to be relative to their parent module
    // (React Flow expects children's `position` to be offsets from
    // the parent when `parentId` is set + extent='parent').
    const moduleNodeMap = new Map(modulesToRender.map((n) => [n.id, n]));
    for (const node of nodes) {
      const parentId = (node as Node & { parentId?: string }).parentId;
      if (!parentId) continue;
      const parent = moduleNodeMap.get(parentId);
      if (!parent) continue;
      node.position = {
        x: node.position.x - parent.position.x,
        y: node.position.y - parent.position.y,
      };
    }
    // Modules first (renders behind), children after.
    nodes.unshift(...modulesToRender);
  }

  // Edges. Dedup + DTO labels when available. Middleware edges are
  // styled distinctly: dashed for global pipeline (one source fanning
  // out across many controllers), solid for scoped (decorator-applied
  // to a specific controller / route). Both use an amber stroke so
  // they read as "middleware" at a glance, matching the node colour.
  const middlewareScopeByName = new Map<string, Entry['middlewareScope']>();
  for (const entry of allEntries) {
    if (entry.kind === 'middleware') {
      middlewareScopeByName.set(entry.name, entry.middlewareScope);
    }
  }

  const emittedEdges = new Set<string>();
  structure.dependencies.forEach((dep, index) => {
    const sourceId = nodeMap.get(dep.source);
    const targetId = nodeMap.get(dep.target);
    if (!sourceId || !targetId) return;
    const key = `${sourceId}->${targetId}`;
    if (emittedEdges.has(key)) return;
    emittedEdges.add(key);

    const isMiddleware = dep.type === 'middleware';
    const sourceScope = middlewareScopeByName.get(dep.source);

    let label: string;
    let stroke: string;
    let dashed = false;
    if (isMiddleware) {
      stroke = '#f59e0b'; // amber-500
      if (sourceScope === 'global') {
        label = 'global';
        dashed = true;
      } else if (sourceScope === 'route') {
        label = 'route';
      } else {
        label = 'protects';
      }
    } else {
      const dtoLabel = opts.dtoEdgeLabels.get(`${dep.source}->${dep.target}`);
      label = dtoLabel ? `↳ ${dtoLabel}` : 'depends on';
      stroke = '#475569';
    }

    edges.push({
      id: `edge-${index}-${dep.source}-${dep.target}`,
      source: sourceId,
      target: targetId,
      type: 'smoothstep',
      animated: false,
      label,
      labelStyle: {
        fill: isMiddleware ? '#fbbf24' : opts.dtoEdgeLabels.has(`${dep.source}->${dep.target}`)
          ? '#7dd3fc'
          : '#9ca3af',
        fontSize: 10,
        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
      },
      labelBgStyle: { fill: '#0f172a', fillOpacity: 0.85 },
      labelBgPadding: [4, 2],
      labelBgBorderRadius: 4,
      style: {
        stroke,
        strokeWidth: 1.5,
        ...(dashed ? { strokeDasharray: '4 4' } : {}),
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: stroke },
    });
  });

  return { nodes, edges };
}

// ────────────────────────────────────────────────────────────────────────
// Filtering + overlays
// ────────────────────────────────────────────────────────────────────────

function applyFilters(
  graph: { nodes: Node[]; edges: Edge[] },
  opts: {
    search: string;
    hideEntities: boolean;
    hideOrphans: boolean;
    hideLeaves: boolean;
    hideMiddleware: boolean;
    warnings: Map<string, NodeWarnings>;
  },
): { nodes: Node[]; edges: Edge[] } {
  const q = opts.search.trim().toLowerCase();

  // Build outgoing/incoming counts from the edges to detect leaves/orphans.
  // Middleware nodes are excluded from the leaf calculation because
  // they're naturally a "leaf" in the DI sense (no DI deps) but very
  // much active participants in the HTTP graph.
  const outDeg = new Map<string, number>();
  const inDeg = new Map<string, number>();
  for (const e of graph.edges) {
    outDeg.set(e.source, (outDeg.get(e.source) ?? 0) + 1);
    inDeg.set(e.target, (inDeg.get(e.target) ?? 0) + 1);
  }

  const keep = (n: Node): boolean => {
    if (n.type === 'module') return true; // re-evaluated below
    if (opts.hideMiddleware && n.type === 'middleware') return false;
    const label = (asNodeData(n.data)?.label ?? '').toString();
    if (q && !label.toLowerCase().includes(q)) return false;
    if (opts.hideEntities && ENTITY_HINT.test(label)) return false;
    const w = opts.warnings.get(label);
    if (opts.hideOrphans && w?.orphan) return false;
    if (
      opts.hideLeaves &&
      (outDeg.get(n.id) ?? 0) === 0 &&
      n.type !== 'controller' &&
      n.type !== 'middleware'
    )
      return false;
    return true;
  };

  const keepNodes = graph.nodes.filter(keep);

  // Drop module containers that no longer have any children visible.
  const childCount = new Map<string, number>();
  for (const n of keepNodes) {
    const parentId = (n as Node & { parentId?: string }).parentId;
    if (!parentId) continue;
    childCount.set(parentId, (childCount.get(parentId) ?? 0) + 1);
  }
  const finalNodes = keepNodes.filter((n) => {
    if (n.type !== 'module') return true;
    return (childCount.get(n.id) ?? 0) > 0;
  });
  const finalIds = new Set(finalNodes.map((n) => n.id));

  const finalEdges = graph.edges.filter((e) => finalIds.has(e.source) && finalIds.has(e.target));
  return { nodes: finalNodes, edges: finalEdges };
}

function applyOverlays(
  graph: { nodes: Node[]; edges: Edge[] },
  opts: {
    activeNodeIds: Set<string>;
    focusedNeighborhood: Set<string>;
    pulseNodes: Set<string>;
    pulseEdges: Set<string>;
  },
): { nodes: Node[]; edges: Edge[] } {
  const hasActive = opts.activeNodeIds.size > 0;
  const hasFocus = opts.focusedNeighborhood.size > 0;

  const dimNode = (id: string) => {
    if (hasActive && !opts.activeNodeIds.has(id)) return true;
    if (hasFocus && !opts.focusedNeighborhood.has(id)) return true;
    return false;
  };

  const nodes: Node[] = graph.nodes.map((n) => {
    const dimmed = n.type !== 'module' && dimNode(n.id);
    const pulse = opts.pulseNodes.has(n.id);
    return {
      ...n,
      data: {
        ...asNodeData(n.data),
        active: opts.activeNodeIds.has(n.id),
        pulse,
      },
      style: {
        ...(n.style ?? {}),
        opacity: dimmed ? 0.25 : 1,
        transition: 'opacity 200ms ease',
      },
    };
  });

  const edges: Edge[] = graph.edges.map((e) => {
    const both =
      hasActive && opts.activeNodeIds.has(e.source) && opts.activeNodeIds.has(e.target);
    const focused =
      hasFocus && opts.focusedNeighborhood.has(e.source) && opts.focusedNeighborhood.has(e.target);
    const pulsing = opts.pulseEdges.has(e.id);

    let stroke = '#475569';
    let strokeWidth = 1.5;
    let opacity = 1;
    let animated = false;

    if (hasActive && !both) opacity = 0.3;
    if (hasFocus && !focused) opacity = 0.3;
    if (both || pulsing) {
      stroke = '#22c55e';
      strokeWidth = 2.5;
      opacity = 1;
      animated = true;
    }

    return {
      ...e,
      animated,
      style: { ...(e.style ?? {}), stroke, strokeWidth, opacity },
      markerEnd: { type: MarkerType.ArrowClosed, color: stroke },
    };
  });

  return { nodes, edges };
}

// ────────────────────────────────────────────────────────────────────────
// Stats / warnings / DTO labels
// ────────────────────────────────────────────────────────────────────────

function buildScopeIndex(snapshot: ContainerSnapshot | null): Map<string, string> {
  const index = new Map<string, string>();
  if (!snapshot) return index;
  for (const binding of snapshot.bindings) {
    if (!index.has(binding.className)) index.set(binding.className, binding.scope);
    if (!index.has(binding.serviceIdentifier)) index.set(binding.serviceIdentifier, binding.scope);
  }
  return index;
}

function buildNodeStats(routes: RouteInfo[], exchanges: RecordedExchange[]): Map<string, NodeStats> {
  const out = new Map<string, NodeStats>();
  if (exchanges.length === 0) return out;

  // Group durations + status per controller. We can only attribute
  // exchanges to controllers — service-level counts would require trace
  // tagging, which is on the roadmap but out of scope here.
  const buckets = new Map<string, { durations: number[]; errors: number }>();
  for (const ex of exchanges) {
    const matched =
      routes.find((r) => r.method === ex.request.method && r.path === ex.request.path) ??
      routes
        .filter((r) => r.method === ex.request.method)
        .map((r) => ({ r, score: routeMatchScore(r.path, ex.request.path) }))
        .filter((m) => m.score > 0)
        .sort((a, b) => b.score - a.score)[0]?.r;
    if (!matched) continue;
    const b = buckets.get(matched.controller) ?? { durations: [], errors: 0 };
    b.durations.push(ex.response.duration);
    if (ex.response.statusCode >= 400) b.errors++;
    buckets.set(matched.controller, b);
  }

  for (const [name, b] of buckets) {
    const sorted = [...b.durations].sort((a, b2) => a - b2);
    const p95Index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
    const avg = sorted.reduce((s, d) => s + d, 0) / sorted.length;
    out.set(name, {
      req: sorted.length,
      errors: b.errors,
      avgMs: avg,
      p95Ms: sorted[p95Index] ?? avg,
    });
  }
  return out;
}

function buildWarnings(structure: AppStructure): Map<string, NodeWarnings> {
  const out = new Map<string, NodeWarnings>();

  const allNames = new Set<string>([
    ...structure.controllers.map((c) => c.name),
    ...structure.services.map((s) => s.name),
    ...structure.providers.map((p) => p.name),
    ...structure.middleware.map((m) => m.name),
  ]);

  // Build adjacency
  const outgoing = new Map<string, Set<string>>();
  const inDeg = new Map<string, number>();
  for (const name of allNames) {
    outgoing.set(name, new Set());
    inDeg.set(name, 0);
  }
  for (const dep of structure.dependencies) {
    if (!allNames.has(dep.source) || !allNames.has(dep.target)) continue;
    if (!outgoing.get(dep.source)!.has(dep.target)) {
      outgoing.get(dep.source)!.add(dep.target);
      inDeg.set(dep.target, (inDeg.get(dep.target) ?? 0) + 1);
    }
  }

  // Cycle detection — DFS coloring.
  const color = new Map<string, 0 | 1 | 2>(); // 0 = unseen, 1 = visiting, 2 = done
  const cycleSet = new Set<string>();
  const stack: string[] = [];
  function dfs(node: string) {
    color.set(node, 1);
    stack.push(node);
    for (const next of outgoing.get(node) ?? []) {
      const c = color.get(next) ?? 0;
      if (c === 0) dfs(next);
      else if (c === 1) {
        // Found a back-edge — every node from the back-edge target to
        // current is on a cycle.
        const startIdx = stack.indexOf(next);
        if (startIdx >= 0) {
          for (let i = startIdx; i < stack.length; i++) cycleSet.add(stack[i]);
        }
      }
    }
    stack.pop();
    color.set(node, 2);
  }
  for (const name of allNames) if ((color.get(name) ?? 0) === 0) dfs(name);

  // Orphans: providers/services nobody depends on. Controllers are
  // entry points so they're never orphans. Middleware participates in
  // the HTTP pipeline rather than the DI graph — nothing `@inject`s
  // it, so the heuristic would always misfire. Treat middleware the
  // same way as controllers and skip the orphan check entirely.
  const controllerSet = new Set(structure.controllers.map((c) => c.name));
  const middlewareSet = new Set(structure.middleware.map((m) => m.name));
  for (const name of allNames) {
    const w: NodeWarnings = {};
    if (cycleSet.has(name)) w.cycle = true;
    if (
      !controllerSet.has(name) &&
      !middlewareSet.has(name) &&
      (inDeg.get(name) ?? 0) === 0
    ) {
      w.orphan = true;
    }
    const fan = inDeg.get(name) ?? 0;
    if (fan >= FAN_IN_WARN) w.fanIn = fan;
    if (Object.keys(w).length > 0) out.set(name, w);
  }
  return out;
}

function summariseWarnings(warnings: Map<string, NodeWarnings>): string {
  let cycles = 0;
  let orphans = 0;
  let fanIn = 0;
  for (const w of warnings.values()) {
    if (w.cycle) cycles++;
    if (w.orphan) orphans++;
    if (w.fanIn) fanIn++;
  }
  const parts: string[] = [];
  if (cycles) parts.push(`${cycles} cycle`);
  if (orphans) parts.push(`${orphans} orphan${orphans === 1 ? '' : 's'}`);
  if (fanIn) parts.push(`${fanIn} hub`);
  return parts.join(' · ');
}

/**
 * Build a "controller→target" edge → DTO label map. We attribute the
 * @body() DTO declared on a controller route to the *first* dependency
 * the controller pushes data into (heuristic — works for the common
 * controller→use-case case the templates produce).
 */
function buildDtoEdgeLabels(
  routes: RouteInfo[],
  structure: AppStructure | null,
): Map<string, string> {
  const out = new Map<string, string>();
  if (!structure) return out;
  for (const c of structure.controllers) {
    if (c.dependencies.length === 0) continue;
    const target = c.dependencies[0]; // first dep — typically the use case
    const body = routes.find((r) => r.controller === c.name && r.bodyDto)?.bodyDto;
    if (body) out.set(`${c.name}->${target}`, body);
  }
  return out;
}

function computePulsePath(
  exchange: RecordedExchange,
  routes: RouteInfo[],
  resolved: string[],
): { nodeIds: Set<string>; edgeIds: Set<string> } {
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();

  const matched =
    routes.find((r) => r.method === exchange.request.method && r.path === exchange.request.path) ??
    routes
      .filter((r) => r.method === exchange.request.method)
      .map((r) => ({ r, score: routeMatchScore(r.path, exchange.request.path) }))
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score)[0]?.r;
  if (matched) nodeIds.add(`controller-${matched.controller}`);

  for (const id of resolved) {
    const name = id.replace(/^Symbol\(([^)]+)\)$/, '$1').trim();
    nodeIds.add(`service-${name}`);
    nodeIds.add(`provider-${name}`);
  }

  // We don't know the exact React Flow edge ids without the graph here,
  // so the consumer matches edges whose source+target both lie in the
  // pulse set — same shape as the existing active-path overlay.
  return { nodeIds, edgeIds };
}

// ────────────────────────────────────────────────────────────────────────
// Custom node components
// ────────────────────────────────────────────────────────────────────────

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
      <span className="text-gray-500">·</span>
      <span className="text-gray-400">p95 {stats.p95Ms.toFixed(0)}ms</span>
      {stats.errors > 0 && (
        <>
          <span className="text-gray-500">·</span>
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
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-error-500/15 border border-error-500/40 text-error-300"
          title="Part of a circular dependency"
        >
          <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
          cycle
        </span>
      )}
      {warnings.orphan && (
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-500/15 border border-amber-500/40 text-amber-300"
          title="No one depends on this — possibly dead code"
        >
          <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
          orphan
        </span>
      )}
      {warnings.fanIn && (
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-orange-500/15 border border-orange-500/40 text-orange-300"
          title={`Used by ${warnings.fanIn} components — refactor candidate`}
        >
          <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
          fan-in {warnings.fanIn}
        </span>
      )}
    </div>
  );
}

function nodeBoxClass(active: boolean | undefined, pulse: boolean | undefined, base: string) {
  return [
    base,
    active ? ACTIVE_RING : '',
    pulse ? 'ring-2 ring-emerald-400 shadow-[0_0_24px_rgba(34,197,94,0.5)]' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function ControllerNode({ data }: { data: NodeData }) {
  return (
    <div
      className={nodeBoxClass(
        data.active,
        data.pulse,
        'bg-blue-500/10 border-2 border-blue-500 rounded-lg p-3 min-w-[200px]',
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-blue-500" />
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5">
          <Box className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs font-semibold text-blue-300">Controller</span>
        </div>
        <ScopeBadge scope={data.scope} />
      </div>
      <p className="text-sm text-white font-mono truncate">{data.label}</p>
      {data.routes !== undefined && (
        <p className="text-[11px] text-gray-400 mt-0.5">
          {data.routes} route{data.routes === 1 ? '' : 's'}
        </p>
      )}
      <StatsRow stats={data.stats} />
      <WarningBadges warnings={data.warnings} />
      <Handle type="source" position={Position.Right} className="!bg-blue-500" />
    </div>
  );
}

function ServiceNode({ data }: { data: NodeData }) {
  return (
    <div
      className={nodeBoxClass(
        data.active,
        data.pulse,
        'bg-green-500/10 border-2 border-green-500 rounded-lg p-3 min-w-[200px]',
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-green-500" />
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5">
          <Cog className="w-3.5 h-3.5 text-green-400" />
          <span className="text-xs font-semibold text-green-300">Service</span>
        </div>
        <ScopeBadge scope={data.scope} />
      </div>
      <p className="text-sm text-white font-mono truncate">{data.label}</p>
      {data.methods !== undefined && (
        <p className="text-[11px] text-gray-400 mt-0.5">
          {data.methods} method{data.methods === 1 ? '' : 's'}
        </p>
      )}
      <StatsRow stats={data.stats} />
      <WarningBadges warnings={data.warnings} />
      <Handle type="source" position={Position.Right} className="!bg-green-500" />
    </div>
  );
}

function ProviderNode({ data }: { data: NodeData }) {
  return (
    <div
      className={nodeBoxClass(
        data.active,
        data.pulse,
        'bg-purple-500/10 border-2 border-purple-500 rounded-lg p-3 min-w-[200px]',
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-purple-500" />
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-semibold text-purple-300">Provider</span>
        </div>
        <ScopeBadge scope={data.scope} />
      </div>
      <p className="text-sm text-white font-mono truncate">{data.label}</p>
      {data.methods !== undefined && (
        <p className="text-[11px] text-gray-400 mt-0.5">
          {data.methods} method{data.methods === 1 ? '' : 's'}
        </p>
      )}
      <StatsRow stats={data.stats} />
      <WarningBadges warnings={data.warnings} />
      <Handle type="source" position={Position.Right} className="!bg-purple-500" />
    </div>
  );
}

/**
 * Middleware participates in the HTTP pipeline rather than the DI
 * graph, so it gets its own visual treatment: amber palette (distinct
 * from controllers/services/providers) and an HTTP-themed icon. The
 * pipeline scope ("Global" / "Controller" / "Route") rides in the
 * standard scope-badge slot — this is the same chip used by DI scopes
 * elsewhere, deliberately, because middleware never has a DI scope to
 * conflict with.
 */
function MiddlewareNode({ data }: { data: NodeData }) {
  return (
    <div
      className={nodeBoxClass(
        data.active,
        data.pulse,
        'bg-amber-500/10 border-2 border-amber-500 rounded-lg p-3 min-w-[200px]',
      )}
    >
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

function ModuleGroupNode({ data }: { data: ModuleNodeData }) {
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

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

function stripPrefix(nodeId: string): string {
  return nodeId.replace(/^(controller|service|provider|middleware|module)-/, '');
}

function routeMatchScore(routePath: string, requestPath: string): number {
  const rSegs = routePath.split('/').filter(Boolean);
  const pSegs = requestPath.split('/').filter(Boolean);
  if (rSegs.length !== pSegs.length) return 0;
  let score = 0;
  for (let i = 0; i < rSegs.length; i++) {
    const r = rSegs[i];
    const p = pSegs[i];
    if (r.startsWith(':') || r === '*') score += 1;
    else if (r === p) score += 2;
    else return 0;
  }
  return score;
}

// ────────────────────────────────────────────────────────────────────────
// Mermaid + SVG export
// ────────────────────────────────────────────────────────────────────────

function toMermaid(structure: AppStructure, layoutDir: LayoutDirection): string {
  const direction = layoutDir === 'LR' ? 'LR' : 'TB';
  const lines = [`flowchart ${direction}`];

  const safe = (s: string) => s.replace(/[^A-Za-z0-9_]/g, '_');
  const controllers = new Set(structure.controllers.map((c) => c.name));
  const services = new Set(structure.services.map((s) => s.name));
  const providers = new Set(structure.providers.map((p) => p.name));
  const middleware = new Set(structure.middleware.map((m) => m.name));

  const nameToShape = (name: string): string => {
    if (controllers.has(name)) return `${safe(name)}["${name}<br/><i>controller</i>"]`;
    if (providers.has(name)) return `${safe(name)}[(${name})]`;
    if (services.has(name)) return `${safe(name)}(["${name}"])`;
    if (middleware.has(name)) return `${safe(name)}{{"${name}<br/><i>middleware</i>"}}`;
    return `${safe(name)}["${name}"]`;
  };

  // Module subgraphs
  for (const m of structure.modules ?? []) {
    if (m.members.length === 0) continue;
    lines.push(`  subgraph ${safe(m.name)} ["${m.name}"]`);
    for (const member of m.members) lines.push(`    ${nameToShape(member)}`);
    lines.push(`  end`);
  }

  // Stand-alone nodes (in case some aren't in any module)
  const inModule = new Set<string>();
  for (const m of structure.modules ?? []) for (const member of m.members) inModule.add(member);
  for (const c of structure.controllers) {
    if (!inModule.has(c.name)) lines.push(`  ${nameToShape(c.name)}`);
  }
  for (const s of structure.services) {
    if (!inModule.has(s.name)) lines.push(`  ${nameToShape(s.name)}`);
  }
  for (const p of structure.providers) {
    if (!inModule.has(p.name)) lines.push(`  ${nameToShape(p.name)}`);
  }
  for (const m of structure.middleware) {
    if (!inModule.has(m.name)) lines.push(`  ${nameToShape(m.name)}`);
  }

  // Edges. Middleware edges read as "protects" (or "global" when the
  // middleware fans out across the pipeline) — distinct from the
  // generic "depends on" edge between DI nodes.
  const middlewareScope = new Map(structure.middleware.map((m) => [m.name, m.scope]));
  const seen = new Set<string>();
  for (const dep of structure.dependencies) {
    const key = `${dep.source}->${dep.target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (dep.type === 'middleware') {
      const scope = middlewareScope.get(dep.source);
      const arrow = scope === 'global' ? '-..->' : '-->';
      const label = scope === 'global' ? 'global' : 'protects';
      lines.push(`  ${safe(dep.source)} ${arrow}|${label}| ${safe(dep.target)}`);
    } else {
      lines.push(`  ${safe(dep.source)} --> ${safe(dep.target)}`);
    }
  }

  // Class styling
  lines.push('');
  lines.push('  classDef controller fill:#1e3a8a,stroke:#3b82f6,color:#dbeafe;');
  lines.push('  classDef service fill:#14532d,stroke:#22c55e,color:#dcfce7;');
  lines.push('  classDef provider fill:#581c87,stroke:#a855f7,color:#f3e8ff;');
  lines.push('  classDef middleware fill:#78350f,stroke:#f59e0b,color:#fef3c7;');
  for (const c of structure.controllers) lines.push(`  class ${safe(c.name)} controller;`);
  for (const s of structure.services) lines.push(`  class ${safe(s.name)} service;`);
  for (const p of structure.providers) lines.push(`  class ${safe(p.name)} provider;`);
  for (const m of structure.middleware) lines.push(`  class ${safe(m.name)} middleware;`);

  return lines.join('\n');
}

function buildSvg(
  structure: AppStructure,
  opts: { stats: Map<string, NodeStats>; warnings: Map<string, NodeWarnings>; layoutDir: LayoutDirection },
): string {
  // Reuse buildGraph for positions, then translate to SVG primitives.
  const { nodes, edges } = buildGraph(structure, {
    scopeIndex: new Map(),
    stats: opts.stats,
    warnings: opts.warnings,
    dtoEdgeLabels: new Map(),
    layoutDir: opts.layoutDir,
    showModules: true,
  });

  // Compute bounding box.
  const W = 220;
  const H = 96;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    if (n.type === 'module') continue;
    // For modules-as-parents, child positions are relative — re-resolve.
    const parent = n.parentId ? nodes.find((p) => p.id === n.parentId) : null;
    const ax = (parent?.position.x ?? 0) + n.position.x;
    const ay = (parent?.position.y ?? 0) + n.position.y;
    minX = Math.min(minX, ax);
    minY = Math.min(minY, ay);
    maxX = Math.max(maxX, ax + W);
    maxY = Math.max(maxY, ay + H);
  }
  if (!isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 800;
    maxY = 400;
  }

  const PAD = 40;
  const width = maxX - minX + PAD * 2;
  const height = maxY - minY + PAD * 2;
  const tx = -minX + PAD;
  const ty = -minY + PAD;

  const colorOf = (kind: string): { fill: string; stroke: string; text: string } => {
    switch (kind) {
      case 'controller':
        return { fill: '#1e3a8a', stroke: '#3b82f6', text: '#dbeafe' };
      case 'service':
        return { fill: '#14532d', stroke: '#22c55e', text: '#dcfce7' };
      case 'provider':
        return { fill: '#581c87', stroke: '#a855f7', text: '#f3e8ff' };
      case 'middleware':
        return { fill: '#78350f', stroke: '#f59e0b', text: '#fef3c7' };
      default:
        return { fill: '#1f2937', stroke: '#475569', text: '#cbd5e1' };
    }
  };

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" font-family="ui-monospace, SFMono-Regular, monospace" font-size="12">`,
  );
  parts.push(`<rect width="100%" height="100%" fill="#0b1220"/>`);

  // Module bounds first
  for (const n of nodes) {
    if (n.type !== 'module') continue;
    const x = n.position.x + tx;
    const y = n.position.y + ty;
    const w = (n.style?.width as number) ?? 240;
    const h = (n.style?.height as number) ?? 200;
    parts.push(
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#0f172a" stroke="#334155" stroke-dasharray="6 4" rx="14"/>`,
    );
    parts.push(
      `<text x="${x + 12}" y="${y + 18}" fill="#64748b" font-size="11">▤ ${escapeXml(
        (asModuleNodeData(n.data)?.label ?? '').toString(),
      )}</text>`,
    );
  }

  // Edges
  for (const e of edges) {
    const src = nodes.find((n) => n.id === e.source);
    const tgt = nodes.find((n) => n.id === e.target);
    if (!src || !tgt) continue;
    const srcParent = src.parentId ? nodes.find((p) => p.id === src.parentId) : null;
    const tgtParent = tgt.parentId ? nodes.find((p) => p.id === tgt.parentId) : null;
    const sx = (srcParent?.position.x ?? 0) + src.position.x + W + tx;
    const sy = (srcParent?.position.y ?? 0) + src.position.y + H / 2 + ty;
    const ex = (tgtParent?.position.x ?? 0) + tgt.position.x + tx;
    const ey = (tgtParent?.position.y ?? 0) + tgt.position.y + H / 2 + ty;
    const cx = (sx + ex) / 2;
    parts.push(
      `<path d="M ${sx} ${sy} C ${cx} ${sy}, ${cx} ${ey}, ${ex} ${ey}" stroke="#475569" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>`,
    );
    if (typeof e.label === 'string') {
      parts.push(
        `<text x="${cx}" y="${(sy + ey) / 2 - 6}" fill="#94a3b8" font-size="10" text-anchor="middle">${escapeXml(
          e.label,
        )}</text>`,
      );
    }
  }

  // Arrow marker
  parts.push(
    `<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#475569"/></marker></defs>`,
  );

  // Nodes
  for (const n of nodes) {
    if (n.type === 'module') continue;
    const c = colorOf(n.type ?? '');
    const parent = n.parentId ? nodes.find((p) => p.id === n.parentId) : null;
    const x = (parent?.position.x ?? 0) + n.position.x + tx;
    const y = (parent?.position.y ?? 0) + n.position.y + ty;
    parts.push(
      `<rect x="${x}" y="${y}" width="${W}" height="${H}" rx="8" fill="${c.fill}" stroke="${c.stroke}" stroke-width="2"/>`,
    );
    parts.push(
      `<text x="${x + 12}" y="${y + 22}" fill="${c.stroke}" font-size="11">${(n.type ?? '').toString()}</text>`,
    );
    const nd = asNodeData(n.data);
    parts.push(
      `<text x="${x + 12}" y="${y + 44}" fill="${c.text}" font-size="13" font-weight="600">${escapeXml(
        (nd?.label ?? '').toString(),
      )}</text>`,
    );
    const sub: string[] = [];
    if (nd.routes !== undefined) sub.push(`${nd.routes} routes`);
    if (nd.methods !== undefined) sub.push(`${nd.methods} methods`);
    parts.push(
      `<text x="${x + 12}" y="${y + 64}" fill="${c.text}" opacity="0.7" font-size="11">${escapeXml(
        sub.join(' · '),
      )}</text>`,
    );
    const stats = nd.stats;
    if (stats && stats.req > 0) {
      parts.push(
        `<text x="${x + 12}" y="${y + 84}" fill="${c.text}" opacity="0.7" font-size="10">${stats.req} req · p95 ${stats.p95Ms.toFixed(
          0,
        )}ms${stats.errors ? ` · ${stats.errors} err` : ''}</text>`,
      );
    }
  }

  parts.push(`</svg>`);
  return parts.join('\n');
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function downloadSvg(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
