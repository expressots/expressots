/**
 * Architecture map component using React Flow
 */

import { useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box, Cog, Database, FileCode } from 'lucide-react';
import { useAppStore } from '../stores/app-store';
import { openInEditor } from '../lib/open-in-editor';
import type { AppStructure } from '../types';

// Custom node types
const nodeTypes = {
  controller: ControllerNode,
  service: ServiceNode,
  provider: ProviderNode,
};

export function ArchitectureMap() {
  const {
    structure,
    selectedExchangeId,
    exchanges,
    routes,
    containerResolutionsByExchange,
  } = useAppStore();

  const baseGraph = useMemo(() => {
    if (!structure) return { nodes: [] as Node[], edges: [] as Edge[] };
    return buildGraph(structure);
  }, [structure]);

  // Compute the active set whenever an exchange is selected. We highlight:
  //   - The controller that handled the request (via matchedRoute)
  //   - Every service / provider whose binding was resolved during the
  //     request (from containerResolutionsByExchange)
  const activeNodeIds = useMemo<Set<string>>(() => {
    const set = new Set<string>();
    if (!selectedExchangeId || baseGraph.nodes.length === 0) return set;
    const exchange = exchanges.find((e) => e.id === selectedExchangeId);
    if (!exchange) return set;

    // Match the request to a registered route.
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

    // Add any resolved binding whose simple-name matches a graph node.
    const resolved = containerResolutionsByExchange[exchange.id] ?? [];
    for (const id of resolved) {
      // Binding ids look like "Symbol(LoggerService)" or "AppService" —
      // extract the inner identifier first.
      const name = id.replace(/^Symbol\(([^)]+)\)$/, '$1').trim();
      const ids = [
        `service-${name}`,
        `provider-${name}`,
        `controller-${name}`,
      ];
      for (const candidate of ids) {
        if (baseGraph.nodes.some((n) => n.id === candidate)) set.add(candidate);
      }
    }
    return set;
  }, [selectedExchangeId, exchanges, routes, containerResolutionsByExchange, baseGraph.nodes]);

  // Apply the active overlay — style cascades through `data.active` on
  // each node and a style override on each edge.
  const overlayed = useMemo(() => {
    if (activeNodeIds.size === 0) return baseGraph;

    const nodes: Node[] = baseGraph.nodes.map((n) => ({
      ...n,
      data: { ...n.data, active: activeNodeIds.has(n.id) },
      style: {
        ...(n.style ?? {}),
        opacity: activeNodeIds.has(n.id) ? 1 : 0.25,
        transition: 'opacity 200ms ease',
      },
    }));

    const edges: Edge[] = baseGraph.edges.map((e) => {
      const both = activeNodeIds.has(e.source) && activeNodeIds.has(e.target);
      return {
        ...e,
        animated: both,
        style: {
          ...(e.style ?? {}),
          stroke: both ? '#3de678' : '#374151',
          strokeWidth: both ? 2 : 1,
          opacity: both ? 1 : 0.3,
        },
      };
    });

    return { nodes, edges };
  }, [baseGraph, activeNodeIds]);

  const [nodesState, setNodes, onNodesChange] = useNodesState(overlayed.nodes);
  const [edgesState, setEdges, onEdgesChange] = useEdgesState(overlayed.edges);

  // Sync graph when structure / active set changes
  useEffect(() => {
    setNodes(overlayed.nodes);
  }, [overlayed.nodes, setNodes]);

  useEffect(() => {
    setEdges(overlayed.edges);
  }, [overlayed.edges, setEdges]);

  if (!structure) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] text-gray-500">
        <GitBranch className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-lg">No architecture data available</p>
        <p className="text-sm mt-2">Connect to the Studio Agent to view the architecture</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-200px)] bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
      <ReactFlow
        nodes={nodesState}
        edges={edgesState}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#4b5563' },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#4b5563',
          },
        }}
      >
        <Background color="#374151" gap={20} />
        <Controls 
          className="!bg-gray-800 !border-gray-700"
          showZoom
          showFitView
          showInteractive={false}
        />
        <MiniMap
          className="!bg-gray-800"
          nodeColor={(node) => {
            switch (node.type) {
              case 'controller':
                return '#3b82f6';
              case 'service':
                return '#22c55e';
              case 'provider':
                return '#a855f7';
              default:
                return '#6b7280';
            }
          }}
        />
      </ReactFlow>

      {/* Active-path banner */}
      {selectedExchangeId && activeNodeIds.size > 0 && (
        <div className="absolute top-4 right-4 bg-primary-500/15 border border-primary-500/40 backdrop-blur-sm px-3 py-2 rounded-lg text-xs text-primary-200">
          Showing the {activeNodeIds.size}-node active path for the selected request.
          Other components are dimmed for context.
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-gray-900/90 backdrop-blur-sm p-4 rounded-lg border border-gray-800">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Legend</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span className="text-xs text-gray-400">Controller</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-xs text-gray-400">Service/UseCase</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-purple-500" />
            <span className="text-xs text-gray-400">Provider</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Cheap route-pattern matcher used to map a recorded URL back to its
 * declared route. Mirrors the helper in TraceDetail so both views agree
 * on which controller handled a given request.
 */
function routeMatchScore(routePath: string, requestPath: string): number {
  const rSegs = routePath.split('/').filter(Boolean);
  const pSegs = requestPath.split('/').filter(Boolean);
  if (rSegs.length !== pSegs.length) return 0;
  let score = 0;
  for (let i = 0; i < rSegs.length; i++) {
    const r = rSegs[i];
    const p = pSegs[i];
    if (r.startsWith(':') || r === '*') {
      score += 1;
    } else if (r === p) {
      score += 2;
    } else {
      return 0;
    }
  }
  return score;
}

// Build graph from structure
function buildGraph(structure: AppStructure): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const nodeMap = new Map<string, string>();

  // Layout parameters
  const CONTROLLER_X = 100;
  const SERVICE_X = 400;
  const PROVIDER_X = 700;
  const Y_SPACING = 120;

  // Add controllers
  structure.controllers.forEach((controller, index) => {
    const id = `controller-${controller.name}`;
    nodeMap.set(controller.name, id);
    
    nodes.push({
      id,
      type: 'controller',
      position: { x: CONTROLLER_X, y: index * Y_SPACING + 50 },
      data: {
        label: controller.name,
        routes: controller.routes.length,
        filePath: controller.filePath,
      },
    });
  });

  // Add services
  structure.services.forEach((service, index) => {
    const id = `service-${service.name}`;
    nodeMap.set(service.name, id);
    
    nodes.push({
      id,
      type: 'service',
      position: { x: SERVICE_X, y: index * Y_SPACING + 50 },
      data: {
        label: service.name,
        methods: service.methods.length,
        filePath: service.filePath,
      },
    });
  });

  // Add providers
  structure.providers.forEach((provider, index) => {
    const id = `provider-${provider.name}`;
    nodeMap.set(provider.name, id);
    
    nodes.push({
      id,
      type: 'provider',
      position: { x: PROVIDER_X, y: index * Y_SPACING + 50 },
      data: {
        label: provider.name,
        methods: provider.methods.length,
        filePath: provider.filePath,
      },
    });
  });

  // Add edges from dependencies
  structure.dependencies.forEach((dep, index) => {
    const sourceId = nodeMap.get(dep.source);
    const targetId = nodeMap.get(dep.target);

    if (sourceId && targetId) {
      edges.push({
        id: `edge-${index}`,
        source: sourceId,
        target: targetId,
        type: 'smoothstep',
      });
    }
  });

  return { nodes, edges };
}

// Custom node components
interface NodeData {
  label: string;
  routes?: number;
  methods?: number;
  filePath?: string;
  /** True when this node is part of the active request path. */
  active?: boolean;
}

/** Adds a green ring + glow to nodes that participated in the active request. */
const ACTIVE_RING = 'ring-2 ring-primary-500 ring-offset-2 ring-offset-gray-950 shadow-[0_0_18px_rgba(61,230,120,0.35)]';

function OpenInEditorButton({ filePath }: { filePath?: string }) {
  if (!filePath) return null;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        openInEditor({ filePath });
      }}
      className="mt-2 flex items-center gap-1 text-[10px] text-gray-400 hover:text-primary-400 transition-colors"
      title={filePath}
    >
      <FileCode className="w-3 h-3" />
      Open in editor
    </button>
  );
}

function ControllerNode({ data }: { data: NodeData }) {
  return (
    <div className={`bg-blue-500/10 border-2 border-blue-500 rounded-lg p-4 min-w-[180px] ${data.active ? ACTIVE_RING : ''}`}>
      <Handle type="target" position={Position.Left} className="!bg-blue-500" />
      <div className="flex items-center gap-2 mb-2">
        <Box className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-semibold text-blue-300">Controller</span>
      </div>
      <p className="text-sm text-white font-mono">{data.label}</p>
      {data.routes !== undefined && (
        <p className="text-xs text-gray-400 mt-1">{data.routes} routes</p>
      )}
      <OpenInEditorButton filePath={data.filePath} />
      <Handle type="source" position={Position.Right} className="!bg-blue-500" />
    </div>
  );
}

function ServiceNode({ data }: { data: NodeData }) {
  return (
    <div className={`bg-green-500/10 border-2 border-green-500 rounded-lg p-4 min-w-[180px] ${data.active ? ACTIVE_RING : ''}`}>
      <Handle type="target" position={Position.Left} className="!bg-green-500" />
      <div className="flex items-center gap-2 mb-2">
        <Cog className="w-4 h-4 text-green-400" />
        <span className="text-sm font-semibold text-green-300">Service</span>
      </div>
      <p className="text-sm text-white font-mono">{data.label}</p>
      {data.methods !== undefined && (
        <p className="text-xs text-gray-400 mt-1">{data.methods} methods</p>
      )}
      <OpenInEditorButton filePath={data.filePath} />
      <Handle type="source" position={Position.Right} className="!bg-green-500" />
    </div>
  );
}

function ProviderNode({ data }: { data: NodeData }) {
  return (
    <div className={`bg-purple-500/10 border-2 border-purple-500 rounded-lg p-4 min-w-[180px] ${data.active ? ACTIVE_RING : ''}`}>
      <Handle type="target" position={Position.Left} className="!bg-purple-500" />
      <div className="flex items-center gap-2 mb-2">
        <Database className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-semibold text-purple-300">Provider</span>
      </div>
      <p className="text-sm text-white font-mono">{data.label}</p>
      {data.methods !== undefined && (
        <p className="text-xs text-gray-400 mt-1">{data.methods} methods</p>
      )}
      <OpenInEditorButton filePath={data.filePath} />
      <Handle type="source" position={Position.Right} className="!bg-purple-500" />
    </div>
  );
}

function GitBranch({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  );
}
