import { type Node, type Edge, MarkerType } from '@xyflow/react';
import type { AppStructure } from '../../types';
import { assignNodeDepths } from '../architecture-layout';
import type {
  BuildGraphOptions,
  GraphResult,
  NodeData,
  NodeWarnings,
} from './types';
import { ENTITY_HINT } from './types';

type NodeKind = 'controller' | 'service' | 'provider' | 'middleware';

interface Entry {
  name: string;
  kind: NodeKind;
  routes?: number;
  methods?: number;
  filePath?: string;
  middlewareScope?: 'global' | 'controller' | 'route' | 'unknown';
}

const middlewareScopeLabel: Record<NonNullable<Entry['middlewareScope']>, string> = {
  global: 'Global',
  controller: 'Controller',
  route: 'Route',
  unknown: '',
};

function asNodeData(data: Node['data']): NodeData {
  return data as unknown as NodeData;
}

export function buildGraph(
  structure: AppStructure,
  opts: BuildGraphOptions,
): GraphResult {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const nodeMap = new Map<string, string>();

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

  const depth = assignNodeDepths(allEntries, structure.dependencies);

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

  const moduleByMember = new Map<string, string>();
  if (opts.showModules) {
    for (const m of structure.modules ?? []) {
      for (const member of m.members) {
        if (!moduleByMember.has(member)) moduleByMember.set(member, m.name);
      }
    }
  }

  for (const entry of allEntries) {
    const pos = positions.get(entry.name)!;
    const moduleName = moduleByMember.get(entry.name);
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
      const maxX = Math.max(...childPositions.map((p) => p.x)) + 220;
      const maxY = Math.max(...childPositions.map((p) => p.y)) + 110;
      modulesToRender.push({
        id: `module-${m.name}`,
        type: 'module',
        position: { x: minX - PADDING, y: minY - PADDING },
        data: {
          label: m.name,
          filePath: m.filePath,
          memberCount: m.members.length,
        },
        style: {
          width: maxX - minX + PADDING * 2,
          height: maxY - minY + PADDING * 2,
        },
        selectable: true,
        draggable: true,
        zIndex: -1,
      });
    }
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
    nodes.unshift(...modulesToRender);
  }

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
      stroke = '#f59e0b';
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
      label = dtoLabel ? `\u21b3 ${dtoLabel}` : 'depends on';
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
      labelBgPadding: [4, 2] as [number, number],
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

export function applyFilters(
  graph: GraphResult,
  opts: {
    search: string;
    hideEntities: boolean;
    hideOrphans: boolean;
    hideLeaves: boolean;
    hideMiddleware: boolean;
    warnings: Map<string, NodeWarnings>;
  },
): GraphResult {
  const q = opts.search.trim().toLowerCase();

  const outDeg = new Map<string, number>();
  const inDeg = new Map<string, number>();
  for (const e of graph.edges) {
    outDeg.set(e.source, (outDeg.get(e.source) ?? 0) + 1);
    inDeg.set(e.target, (inDeg.get(e.target) ?? 0) + 1);
  }

  const keep = (n: Node): boolean => {
    if (n.type === 'module') return true;
    if (opts.hideMiddleware && n.type === 'middleware') return false;
    const label = (asNodeData(n.data)?.label ?? '').toString();
    if (opts.hideEntities && ENTITY_HINT.test(label)) return false;
    if (opts.hideOrphans) {
      const w = opts.warnings.get(label);
      if (w?.orphan) return false;
    }
    if (opts.hideLeaves && n.type !== 'middleware') {
      if ((outDeg.get(n.id) ?? 0) === 0 && (inDeg.get(n.id) ?? 0) === 0) return false;
    }
    if (q && !label.toLowerCase().includes(q)) return false;
    return true;
  };

  const keepNodes = graph.nodes.filter(keep);

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

export function applyOverlays(
  graph: GraphResult,
  opts: {
    activeNodeIds: Set<string>;
    focusedNeighborhood: Set<string>;
    pulseNodes: Set<string>;
    pulseEdges: Set<string>;
  },
): GraphResult {
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

export function buildDtoEdgeLabels(
  routes: import('../../types').RouteInfo[],
  structure: AppStructure | null,
): Map<string, string> {
  const out = new Map<string, string>();
  if (!structure) return out;
  for (const c of structure.controllers) {
    if (c.dependencies.length === 0) continue;
    const target = c.dependencies[0];
    const body = routes.find((r) => r.controller === c.name && r.bodyDto)?.bodyDto;
    if (body) out.set(`${c.name}->${target}`, body);
  }
  return out;
}
