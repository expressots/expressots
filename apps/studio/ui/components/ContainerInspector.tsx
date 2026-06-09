/**
 * Container Inspector
 *
 * Displays the DI container snapshot captured by the Studio Agent at startup:
 *   - Summary stats (total bindings, by-scope counts)
 *   - Filterable bindings table
 *   - Interactive dependency graph (React Flow)
 *
 * When a recorded exchange is selected, the resolved bindings for that
 * request are highlighted in the table and graph.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Boxes, Search, List as ListIcon, Network, FileSearch } from 'lucide-react';
import { useAppStore } from '../stores/app-store';
import { cn } from '../lib/utils';
import type { ContainerBindingNode } from '../types';

type Tab = 'list' | 'graph';

const scopeColors: Record<string, string> = {
  Singleton: 'text-primary-400 bg-primary-950/40 border-primary-700/40',
  Request: 'text-amber-300 bg-amber-950/40 border-amber-700/40',
  Transient: 'text-purple-300 bg-purple-950/40 border-purple-700/40',
};

function ScopeBadge({ scope }: { scope: string }) {
  const cls = scopeColors[scope] || 'text-gray-300 bg-gray-800 border-gray-700';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${cls}`}
    >
      {scope}
    </span>
  );
}

export function ContainerInspector() {
  const containerSnapshot = useAppStore((s) => s.containerSnapshot);
  const selectedExchangeId = useAppStore((s) => s.selectedExchangeId);
  const containerResolutionsByExchange = useAppStore(
    (s) => s.containerResolutionsByExchange,
  );

  const [tab, setTab] = useState<Tab>('list');
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState<string>('all');

  const resolved = useMemo(() => {
    if (!selectedExchangeId) return new Set<string>();
    return new Set(containerResolutionsByExchange[selectedExchangeId] ?? []);
  }, [selectedExchangeId, containerResolutionsByExchange]);

  if (!containerSnapshot || containerSnapshot.bindings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
        <Boxes className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-lg">No container snapshot</p>
        <p className="text-sm mt-2 max-w-md text-center">
          The Studio Agent could not introspect the DI container. Make sure
          your application is running and the agent is connected.
        </p>
      </div>
    );
  }

  const filteredBindings = containerSnapshot.bindings.filter((b) => {
    if (scopeFilter !== 'all' && b.scope !== scopeFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.className.toLowerCase().includes(q) ||
      b.serviceIdentifier.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label="Bindings" value={containerSnapshot.summary.total} />
        <SummaryCard
          label="Singletons"
          value={containerSnapshot.summary.byScope['Singleton'] ?? 0}
        />
        <SummaryCard
          label="Request-scoped"
          value={containerSnapshot.summary.byScope['Request'] ?? 0}
        />
        <SummaryCard
          label="Transient"
          value={containerSnapshot.summary.byScope['Transient'] ?? 0}
        />
        <SummaryCard label="Cached" value={containerSnapshot.summary.cached} />
      </div>

      {/* Per-request banner */}
      {resolved.size > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary-950/30 border border-primary-700/40 rounded-lg text-sm">
          <FileSearch className="w-4 h-4 text-primary-400" />
          <span className="text-primary-300">
            Showing {resolved.size} binding{resolved.size === 1 ? '' : 's'} resolved by the selected request.
          </span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bindings…"
            className="studio-input w-full pl-9 pr-3 py-2"
          />
        </div>

        <select
          value={scopeFilter}
          onChange={(e) => setScopeFilter(e.target.value)}
          className="studio-select"
        >
          <option value="all">All scopes</option>
          {Object.keys(containerSnapshot.summary.byScope).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <div className="studio-segment">
          <button
            onClick={() => setTab('list')}
            className={cn(
              'studio-segment-btn',
              tab === 'list' && 'studio-segment-btn-active',
            )}
          >
            <ListIcon className="w-4 h-4" />
            List
          </button>
          <button
            onClick={() => setTab('graph')}
            className={cn(
              'studio-segment-btn',
              tab === 'graph' && 'studio-segment-btn-active',
            )}
          >
            <Network className="w-4 h-4" />
            Graph
          </button>
        </div>
      </div>

      {tab === 'list' ? (
        <BindingsTable bindings={filteredBindings} resolved={resolved} />
      ) : (
        <DependencyGraph
          bindings={filteredBindings}
          allBindings={containerSnapshot.bindings}
          edges={containerSnapshot.edges}
          resolved={resolved}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="studio-stat px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

function BindingsTable({
  bindings,
  resolved,
}: {
  bindings: ContainerBindingNode[];
  resolved: Set<string>;
}) {
  return (
    <div className="studio-card">
      <div className="overflow-x-auto max-h-[60vh]">
        <table className="w-full text-sm">
          <thead className="bg-[#101319] sticky top-0">
            <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-white/[0.06]">
              <th className="px-4 py-2 font-medium">Class</th>
              <th className="px-4 py-2 font-medium">Service Identifier</th>
              <th className="px-4 py-2 font-medium">Scope</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Cached</th>
              <th className="px-4 py-2 font-medium">Activated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {bindings.map((b) => {
              const isResolved =
                resolved.has(b.serviceIdentifier) || resolved.has(b.className);
              return (
                <tr
                  key={b.id}
                  className={
                    isResolved
                      ? 'bg-primary-950/30 hover:bg-primary-950/50'
                      : 'hover:bg-white/[0.04]'
                  }
                >
                  <td className="px-4 py-2 font-mono text-white">{b.className}</td>
                  <td className="px-4 py-2 font-mono text-gray-400 text-xs">
                    {b.serviceIdentifier}
                  </td>
                  <td className="px-4 py-2">
                    <ScopeBadge scope={b.scope} />
                  </td>
                  <td className="px-4 py-2 text-gray-400">{b.type}</td>
                  <td className="px-4 py-2">
                    {b.cached ? (
                      <span className="text-primary-400">✓</span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {b.activated ? (
                      <span className="text-primary-400">✓</span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {bindings.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No bindings match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DependencyGraph({
  bindings,
  allBindings,
  edges,
  resolved,
}: {
  bindings: ContainerBindingNode[];
  allBindings: ContainerBindingNode[];
  edges: { source: string; target: string }[];
  resolved: Set<string>;
}) {
  // Map id → binding for quick lookup
  const allById = useMemo(() => {
    const m = new Map<string, ContainerBindingNode>();
    for (const b of allBindings) m.set(b.id, b);
    return m;
  }, [allBindings]);

  const visibleIds = useMemo(
    () => new Set(bindings.map((b) => b.id)),
    [bindings],
  );

  const { graphNodes, graphEdges } = useMemo(() => {
    // Simple layered layout: group by scope
    const buckets: Record<string, ContainerBindingNode[]> = {
      Singleton: [],
      Request: [],
      Transient: [],
    };
    for (const b of bindings) {
      (buckets[b.scope] ?? (buckets[b.scope] = [])).push(b);
    }

    const NODE_W = 180;
    const NODE_H = 60;
    const COL_GAP = 60;
    const ROW_GAP = 24;

    const columns = Object.keys(buckets);
    const nodes: Node[] = [];
    columns.forEach((scope, colIdx) => {
      const items = buckets[scope];
      items.forEach((b, rowIdx) => {
        const isResolved =
          resolved.has(b.serviceIdentifier) || resolved.has(b.className);
        nodes.push({
          id: b.id,
          position: {
            x: colIdx * (NODE_W + COL_GAP),
            y: rowIdx * (NODE_H + ROW_GAP),
          },
          data: { label: nodeLabel(b, isResolved) },
          style: nodeStyle(b, isResolved),
          sourcePosition: 'right' as any,
          targetPosition: 'left' as any,
        });
      });
    });

    const eds: Edge[] = edges
      .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
      .map((e, idx) => ({
        id: `e-${idx}`,
        source: e.source,
        target: e.target,
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#3de678', strokeOpacity: 0.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#3de678' },
      }));

    return { graphNodes: nodes, graphEdges: eds };
  }, [bindings, edges, visibleIds, resolved, allById]);

  const [nodesState, setNodes, onNodesChange] = useNodesState(graphNodes);
  const [edgesState, setEdges, onEdgesChange] = useEdgesState(graphEdges);

  useEffect(() => setNodes(graphNodes), [graphNodes, setNodes]);
  useEffect(() => setEdges(graphEdges), [graphEdges, setEdges]);

  return (
    <div className="studio-card h-[60vh]">
      <ReactFlow
        nodes={nodesState}
        edges={edgesState}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        minZoom={0.1}
        maxZoom={2}
      >
        <Background color="#1f2937" gap={16} />
        <Controls className="!bg-[#14171c] !border-white/[0.08]" />
        <MiniMap
          className="!bg-[#14171c]"
          nodeColor={(n) => (n.style as any)?.borderColor || '#374151'}
        />
      </ReactFlow>
    </div>
  );
}

function nodeLabel(b: ContainerBindingNode, isResolved: boolean) {
  return (
    <div className="text-xs">
      <div className="font-semibold truncate" title={b.className}>
        {isResolved ? '● ' : ''}
        {b.className}
      </div>
      <div className="text-[10px] opacity-70 mt-0.5">{b.scope}</div>
    </div>
  );
}

function nodeStyle(b: ContainerBindingNode, isResolved: boolean) {
  const palette: Record<string, { bg: string; border: string; text: string }> = {
    Singleton: { bg: '#082413', border: '#19ce59', text: '#3de678' },
    Request: { bg: '#1f1505', border: '#d97706', text: '#fbbf24' },
    Transient: { bg: '#1e0a2b', border: '#9333ea', text: '#c084fc' },
  };
  const p = palette[b.scope] ?? { bg: '#1f2937', border: '#4b5563', text: '#e5e7eb' };
  return {
    background: p.bg,
    border: `1px solid ${isResolved ? '#3de678' : p.border}`,
    boxShadow: isResolved ? '0 0 0 2px rgba(61,230,120,0.35)' : 'none',
    color: p.text,
    width: 180,
    height: 60,
    fontSize: 11,
    padding: 8,
    borderRadius: 8,
  };
}
