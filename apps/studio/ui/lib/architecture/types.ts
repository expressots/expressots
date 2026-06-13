import type { Node, Edge } from '@xyflow/react';

/** Per-node runtime stats aggregated from recorded exchanges. */
export interface NodeStats {
  req: number;
  errors: number;
  /** Average duration in milliseconds. */
  avgMs: number;
  /** P95 duration in milliseconds. 0 when fewer than 2 samples. */
  p95Ms: number;
}

/** Node-level architectural lint hits surfaced as badges. */
export interface NodeWarnings {
  cycle?: boolean;
  orphan?: boolean;
  fanIn?: number;
}

/** Layout direction toggle. */
export type LayoutDirection = 'LR' | 'TB';

export interface NodeData {
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

export interface ModuleNodeData {
  label: string;
  filePath?: string;
  memberCount: number;
}

export interface SelectedNode {
  kind: 'controller' | 'service' | 'provider' | 'middleware';
  name: string;
  filePath?: string;
  routes: import('../../types').RouteInfo[];
  methods: string[];
  dependencies: string[];
  stats?: NodeStats;
  warnings?: NodeWarnings;
  /** Pipeline scope when `kind === 'middleware'`. */
  middlewareScope?: 'global' | 'controller' | 'route' | 'unknown';
}

export interface BuildGraphOptions {
  scopeIndex: Map<string, string>;
  stats: Map<string, NodeStats>;
  warnings: Map<string, NodeWarnings>;
  dtoEdgeLabels: Map<string, string>;
  layoutDir: LayoutDirection;
  showModules: boolean;
}

export interface GraphResult {
  nodes: Node[];
  edges: Edge[];
}

export const FAN_IN_WARN = 5;

export const ENTITY_HINT = /entity$/i;

export const SCOPE_BADGE_CLASSES: Record<string, string> = {
  Singleton: 'text-primary-300 bg-primary-950/60 border-primary-700/50',
  Request: 'text-amber-300 bg-amber-950/50 border-amber-700/50',
  Transient: 'text-purple-300 bg-purple-950/50 border-purple-700/50',
  Global: 'text-orange-300 bg-orange-950/50 border-orange-700/50',
  Controller: 'text-amber-300 bg-amber-950/50 border-amber-700/50',
  Route: 'text-yellow-300 bg-yellow-950/50 border-yellow-700/50',
};

export const ACTIVE_RING =
  'ring-2 ring-primary-500 ring-offset-2 ring-offset-gray-950 shadow-[0_0_18px_rgba(61,230,120,0.35)]';
