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
import { Box, Cog, Database } from 'lucide-react';
import { useAppStore } from '../stores/app-store';
import type { AppStructure } from '../types';

// Custom node types
const nodeTypes = {
  controller: ControllerNode,
  service: ServiceNode,
  provider: ProviderNode,
};

export function ArchitectureMap() {
  const { structure } = useAppStore();

  const { nodes, edges } = useMemo(() => {
    if (!structure) {
      return { nodes: [], edges: [] };
    }
    return buildGraph(structure);
  }, [structure]);

  const [nodesState, setNodes, onNodesChange] = useNodesState(nodes);
  const [edgesState, setEdges, onEdgesChange] = useEdgesState(edges);

  // Sync graph when structure arrives asynchronously after mount
  useEffect(() => {
    setNodes(nodes);
  }, [nodes, setNodes]);

  useEffect(() => {
    setEdges(edges);
  }, [edges, setEdges]);

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
}

function ControllerNode({ data }: { data: NodeData }) {
  return (
    <div className="bg-blue-500/10 border-2 border-blue-500 rounded-lg p-4 min-w-[180px]">
      <Handle type="target" position={Position.Left} className="!bg-blue-500" />
      <div className="flex items-center gap-2 mb-2">
        <Box className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-semibold text-blue-300">Controller</span>
      </div>
      <p className="text-sm text-white font-mono">{data.label}</p>
      {data.routes !== undefined && (
        <p className="text-xs text-gray-400 mt-1">{data.routes} routes</p>
      )}
      <Handle type="source" position={Position.Right} className="!bg-blue-500" />
    </div>
  );
}

function ServiceNode({ data }: { data: NodeData }) {
  return (
    <div className="bg-green-500/10 border-2 border-green-500 rounded-lg p-4 min-w-[180px]">
      <Handle type="target" position={Position.Left} className="!bg-green-500" />
      <div className="flex items-center gap-2 mb-2">
        <Cog className="w-4 h-4 text-green-400" />
        <span className="text-sm font-semibold text-green-300">Service</span>
      </div>
      <p className="text-sm text-white font-mono">{data.label}</p>
      {data.methods !== undefined && (
        <p className="text-xs text-gray-400 mt-1">{data.methods} methods</p>
      )}
      <Handle type="source" position={Position.Right} className="!bg-green-500" />
    </div>
  );
}

function ProviderNode({ data }: { data: NodeData }) {
  return (
    <div className="bg-purple-500/10 border-2 border-purple-500 rounded-lg p-4 min-w-[180px]">
      <Handle type="target" position={Position.Left} className="!bg-purple-500" />
      <div className="flex items-center gap-2 mb-2">
        <Database className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-semibold text-purple-300">Provider</span>
      </div>
      <p className="text-sm text-white font-mono">{data.label}</p>
      {data.methods !== undefined && (
        <p className="text-xs text-gray-400 mt-1">{data.methods} methods</p>
      )}
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
