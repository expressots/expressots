/**
 * Core types for ExpressoTS Studio Agent
 */

/** HTTP methods supported */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/** Route information discovered from the application */
export interface RouteInfo {
  path: string;
  method: HttpMethod;
  controller: string;
  controllerMethod: string;
  filePath?: string;
  lineNumber?: number;
  middleware?: string[];
  parameters?: ParameterInfo[];
}

/** Parameter information for a route */
export interface ParameterInfo {
  name: string;
  type: 'path' | 'query' | 'body' | 'header';
  required: boolean;
  dataType?: string;
}

/** Span information from OpenTelemetry */
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

/** Event within a span */
export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, string | number | boolean>;
}

/** Complete trace containing multiple spans */
export interface TraceInfo {
  traceId: string;
  rootSpan: SpanInfo;
  spans: SpanInfo[];
  startTime: number;
  endTime: number;
  duration: number;
}

/** Recorded HTTP request */
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
  cookies?: Record<string, string>;
}

/** Recorded HTTP response */
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

/** Complete request/response pair for replay */
export interface RecordedExchange {
  id: string;
  request: RecordedRequest;
  response: RecordedResponse;
  trace?: TraceInfo;
}

/** Agent configuration options */
export interface AgentConfig {
  /** Port for the agent WebSocket server */
  port: number;
  /** Path to store SQLite database */
  dbPath: string;
  /** Enable request/response recording */
  enableRecording: boolean;
  /** Maximum number of recorded exchanges to keep */
  maxRecordedExchanges: number;
  /** Enable performance profiling */
  enableProfiling: boolean;
  /** Sample rate for tracing (0-1) */
  traceSampleRate: number;
  /** Custom service name */
  serviceName: string;
  /** Express app instance (if available) */
  expressApp?: unknown;
  /**
   * ExpressoTS AppContainer instance (if available). When provided the agent
   * will capture a DI snapshot (bindings + dependency graph) and track which
   * bindings are resolved during each request.
   */
  appContainer?: unknown;
}

/** Default agent configuration */
export const defaultAgentConfig: AgentConfig = {
  port: 3334,
  dbPath: '.studio/studio.db',
  enableRecording: true,
  maxRecordedExchanges: 1000,
  enableProfiling: true,
  traceSampleRate: 1.0,
  serviceName: 'expressots-app',
};

/** WebSocket message types */
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
  | 'cleared';

/** WebSocket message structure */
export interface WSMessage<T = unknown> {
  type: WSMessageType;
  timestamp: number;
  data: T;
}

/** Application metrics */
export interface AppMetrics {
  uptime: number;
  requestCount: number;
  errorCount: number;
  avgResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  activeConnections: number;
}

/** Endpoint statistics */
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
  /** Internal: durations array for percentile calculation (not sent to UI) */
  durations?: number[];
}

/** Dependency information for architecture map */
export interface DependencyInfo {
  source: string;
  target: string;
  type: 'controller' | 'service' | 'provider' | 'middleware' | 'repository';
}

/** Controller metadata */
export interface ControllerInfo {
  name: string;
  filePath: string;
  routes: RouteInfo[];
  dependencies: string[];
}

/** Service metadata */
export interface ServiceInfo {
  name: string;
  filePath: string;
  dependencies: string[];
  methods: string[];
}

/** Application structure for architecture visualization */
export interface AppStructure {
  controllers: ControllerInfo[];
  services: ServiceInfo[];
  providers: ServiceInfo[];
  middleware: string[];
  dependencies: DependencyInfo[];
}
