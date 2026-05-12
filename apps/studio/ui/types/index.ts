/**
 * Types for ExpressoTS Studio UI
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface RouteInfo {
  path: string;
  method: HttpMethod;
  controller: string;
  controllerMethod: string;
  filePath?: string;
  lineNumber?: number;
  middleware?: string[];
}

export interface SpanInfo {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: 'SERVER' | 'CLIENT' | 'INTERNAL' | 'PRODUCER' | 'CONSUMER';
  startTime: number;
  endTime: number;
  duration: number;
  status: 'OK' | 'ERROR' | 'UNSET';
  attributes: Record<string, string | number | boolean>;
  events: SpanEvent[];
}

export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, string | number | boolean>;
}

export interface TraceInfo {
  traceId: string;
  rootSpan: SpanInfo;
  spans: SpanInfo[];
  startTime: number;
  endTime: number;
  duration: number;
}

export interface RecordedRequest {
  id: string;
  traceId: string;
  timestamp: number;
  method: HttpMethod;
  path: string;
  url: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body?: unknown;
}

export interface RecordedResponse {
  id: string;
  requestId: string;
  traceId: string;
  timestamp: number;
  statusCode: number;
  statusMessage: string;
  headers: Record<string, string>;
  body?: unknown;
  duration: number;
}

export interface RecordedExchange {
  id: string;
  request: RecordedRequest;
  response: RecordedResponse;
  trace?: TraceInfo;
}

export interface ReplayResultPayload {
  success: boolean;
  original?: RecordedExchange;
  replay?: {
    statusCode: number;
    statusMessage: string;
    headers: Record<string, string>;
    body: unknown;
    duration?: number;
  };
  error?: string;
  replayedAt: number;
}

export interface AppMetrics {
  uptime: number;
  requestCount: number;
  errorCount: number;
  avgResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
  };
  activeConnections: number;
}

export interface EndpointStats {
  path: string;
  method: HttpMethod;
  requestCount: number;
  errorCount: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  lastRequestTime: number;
}

export interface DependencyInfo {
  source: string;
  target: string;
  type: 'controller' | 'service' | 'provider' | 'middleware' | 'repository';
}

export interface ControllerInfo {
  name: string;
  filePath: string;
  routes: RouteInfo[];
  dependencies: string[];
}

export interface ServiceInfo {
  name: string;
  filePath: string;
  dependencies: string[];
  methods: string[];
}

export interface AppStructure {
  controllers: ControllerInfo[];
  services: ServiceInfo[];
  providers: ServiceInfo[];
  middleware: string[];
  dependencies: DependencyInfo[];
}

export type WSMessageType =
  | 'routes'
  | 'trace'
  | 'request'
  | 'response'
  | 'metrics'
  | 'error'
  | 'replay_result'
  | 'health'
  | 'structure'
  | 'exchanges'
  | 'exchange'
  | 'stats'
  | 'endpoint_stats'
  | 'cleared'
  | 'container'
  | 'container_resolutions'
  | 'recording_state'
  | 'log'
  | 'logs'
  | 'logs_cleared'
  | 'pong_studio'
  | 'runtime';

export interface WSMessage<T = unknown> {
  type: WSMessageType;
  timestamp: number;
  data: T;
}

export type ViewMode =
  | 'status'
  | 'requests'
  | 'architecture'
  | 'metrics'
  | 'replay'
  | 'api-client'
  | 'container'
  | 'logs';

// ────────────────────────────────────────────────────────────────────────
// DI Container introspection
// ────────────────────────────────────────────────────────────────────────

export interface ContainerBindingNode {
  id: string;
  serviceIdentifier: string;
  className: string;
  scope: string;
  type: string;
  activated: boolean;
  cached: boolean;
  moduleId?: number | string | null;
}

export interface ContainerBindingEdge {
  source: string;
  target: string;
}

export interface ContainerSnapshot {
  bindings: ContainerBindingNode[];
  edges: ContainerBindingEdge[];
  summary: {
    total: number;
    byScope: Record<string, number>;
    byType: Record<string, number>;
    cached: number;
    activated: number;
  };
  options?: Record<string, unknown>;
  timestamp: string;
  containerId: number;
}

export interface ContainerResolutions {
  exchangeId: string;
  traceId?: string;
  method: string;
  path: string;
  resolved: string[];
  timestamp: number;
}

// ────────────────────────────────────────────────────────────────────────
// Live logs
// ────────────────────────────────────────────────────────────────────────

export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  traceId?: string;
}

// ────────────────────────────────────────────────────────────────────────
// Runtime / Status dashboard
// ────────────────────────────────────────────────────────────────────────

/**
 * Browser-side mirror of `RuntimeInfo` from the Studio Agent.
 * See `packages/studio-agent/src/types/index.ts` for field semantics.
 */
export interface RuntimeInfo {
  serviceName: string;
  pid: number;
  nodeVersion: string;
  platform: string;
  arch: string;
  env: string;
  agentPort: number;
  appPort?: number;
  appUrl?: string;
  globalPrefix?: string;
  startedAt: number;
  uptimeMs: number;
  startupMs?: number;
  versions: {
    agent: string;
    core?: string;
    adapterExpress?: string;
  };
  counts: {
    controllers: number;
    services: number;
    providers: number;
    routes: number;
    middleware: number;
    interceptors?: number;
  };
  /**
   * Itemised runtime lists. Used by the Status page drill-down to show
   * actual class names for items the static file scanner can't see
   * (framework providers, container-resolved interceptors).
   */
  runtimeItems?: RuntimeItems;
  recordingEnabled: boolean;
}

/** Mirror of `RuntimeItems` from the Studio Agent. */
export interface RuntimeItems {
  providers?: RuntimeItem[];
  interceptors?: RuntimeItem[];
}

/** A single runtime-discovered item (provider, interceptor, etc.). */
export interface RuntimeItem {
  name: string;
  priority?: number;
  source?: string;
}
