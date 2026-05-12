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
  /**
   * HTTP port the host application is listening on. Used by the Studio
   * Status page to display the app URL. Optional — when omitted the
   * Status page falls back to "—".
   */
  appPort?: number;
  /**
   * Global URL prefix of the host application (e.g. "/" or "/api/v1").
   * Used for display purposes only.
   */
  globalPrefix?: string;
  /**
   * How long the host application took to start (ms). Reported by
   * `@expressots/adapter-express` after `app.listen()` resolves.
   */
  startupMs?: number;
  /**
   * Number of registered interceptors (middleware applied via the adapter
   * configuration). Reported by the adapter; falls back to scanned
   * `@middleware` decorators when unavailable.
   */
  interceptorCount?: number;
  /**
   * Number of providers registered with the DI container at runtime.
   * Includes framework-registered providers (e.g. lifecycle hooks),
   * which static file scanning misses. Reported by the adapter via
   * `MetricsCollector` so the Status page agrees with the CLI banner.
   */
  providerCount?: number;
  /**
   * Number of HTTP middleware registered in the adapter's pipeline
   * (distinct from `interceptorCount`). Reported by the adapter for
   * the Status page.
   */
  middlewareCount?: number;
  /**
   * Itemised runtime lists for the Status page drill-down. Class names
   * harvested from DI metadata at boot, including framework items the
   * static scanner can't see.
   */
  runtimeItems?: RuntimeItems;
}

/**
 * Itemised runtime view used by the Studio Status page drill-down.
 *
 * Each entry is just a display name (typically `Class.name`). The UI
 * cross-references against the static `AppStructure` to enrich entries
 * with file paths / "Open in editor" links when a name matches.
 */
export interface RuntimeItems {
  /** Provider class names registered via `@provide` family decorators. */
  providers?: RuntimeItem[];
  /** Interceptor class names registered via `@Interceptor()`. */
  interceptors?: RuntimeItem[];
}

/** A single runtime-discovered item (provider, interceptor, etc.). */
export interface RuntimeItem {
  /** Display name (typically the class constructor name). */
  name: string;
  /**
   * Optional priority — surfaced for interceptors so the dashboard can
   * mirror the execution order shown in the CLI.
   */
  priority?: number;
  /** Optional source — purely informational ("metadata", "registry", …). */
  source?: string;
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
  | 'cleared'
  | 'runtime';

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

/**
 * Runtime information about the host application + the agent itself.
 *
 * Surfaced on the Studio "Status" page so users get a browser-side view
 * of the same information the CLI prints in its boot banner — but live
 * and refreshable, instead of frozen at startup.
 */
export interface RuntimeInfo {
  /** Service name passed to the agent (e.g. "expressots-app"). */
  serviceName: string;
  /** Process id of the host app (the agent runs in-process). */
  pid: number;
  /** Node.js version, e.g. "v22.15.1". */
  nodeVersion: string;
  /** Platform string, e.g. "win32" / "linux" / "darwin". */
  platform: NodeJS.Platform;
  /** CPU architecture, e.g. "x64" / "arm64". */
  arch: string;
  /** NODE_ENV, defaulting to "development" if unset. */
  env: string;
  /** Port the WebSocket agent itself is listening on. */
  agentPort: number;
  /**
   * Application HTTP port (best-effort). The agent doesn't bind the user's
   * server, so this is provided via config and may be undefined.
   */
  appPort?: number;
  /** App base URL, e.g. "http://localhost:3000" — also best-effort. */
  appUrl?: string;
  /**
   * Global path prefix for the app, e.g. "/" or "/api/v1". Best-effort
   * because we can only know it when the host passes it via config.
   */
  globalPrefix?: string;
  /** Wall-clock timestamp of when the agent started (ms since epoch). */
  startedAt: number;
  /** How long the host has been up (ms). */
  uptimeMs: number;
  /** How long the host took to boot (ms), if the user app reports it. */
  startupMs?: number;
  /** Versions of the framework and adapter, when discoverable. */
  versions: {
    agent: string;
    core?: string;
    adapterExpress?: string;
  };
  /** Counts derived from the latest scan, for the dashboard. */
  counts: {
    controllers: number;
    services: number;
    providers: number;
    routes: number;
    middleware: number;
    interceptors?: number;
  };
  /**
   * Itemised runtime lists. Powers the Status page drill-down for items
   * the static file scanner can't see (framework providers, container-
   * resolved interceptors). When omitted, the UI falls back to the
   * static `AppStructure` lists.
   */
  runtimeItems?: RuntimeItems;
  /** Whether request/response recording is currently enabled. */
  recordingEnabled: boolean;
}
