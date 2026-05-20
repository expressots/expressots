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
  /**
   * Class name of the `@Body()` DTO declared on the controller method,
   * when one is present. Powers the API client's auto-fill feature so
   * users get a working JSON body without typing it by hand.
   */
  bodyDto?: string;
  /**
   * Example JSON body inferred from the DTO class fields (string → "",
   * number → 0, boolean → false, etc.). Best-effort: complex / generic
   * types fall back to `null` so the JSON stays parseable.
   */
  bodySample?: Record<string, unknown>;
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
  /**
   * Active middleware preset and effective configuration. Populated by
   * the adapter after `applyPreset()` runs, so Studio can display what
   * middleware is active without reading framework internals.
   */
  middlewarePreset?: MiddlewarePresetInfo;
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
  /** Middleware pipeline entries from the Middleware service. */
  middleware?: MiddlewarePipelineItem[];
  /**
   * Controller- and route-scoped middleware bindings, harvested from
   * Reflect metadata after `app.listen()`. Used to draw scoped
   * "middleware → controller / route" edges in the architecture map.
   */
  middlewareBindings?: MiddlewareBinding[];
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

/** A middleware entry from the runtime pipeline. */
export interface MiddlewarePipelineItem {
  /** Display name of the middleware function/class. */
  name: string;
  /** Category: parser, security, logging, session, static, error, validation, other. */
  category: string;
  /** Whether this is a built-in (preset) or custom (user-added) middleware. */
  type: 'built-in' | 'custom';
  /** Execution order (0-based). */
  order: number;
  /** Route path if scoped, or "Global" for global middleware. */
  path?: string;
}

/**
 * A controller- or route-scoped middleware binding harvested from
 * `ControllerMetadata.middleware` / `ControllerMethodMetadata.middleware`
 * Reflect metadata. Reported by the adapter once the HTTP server is
 * listening so the agent can draw "middleware → controller / route"
 * edges on the architecture map.
 *
 * The static source scanner can find most of these from the decorator
 * arguments; runtime data is the source of truth because it survives
 * dynamic registration patterns (e.g. classes assembled via composition).
 */
export interface MiddlewareBinding {
  /** Display name of the middleware (class / function / registered name). */
  middlewareName: string;
  /** Pipeline scope — see `MiddlewareScope`. Always `controller` or `route` here. */
  scope: 'controller' | 'route';
  /** Class name of the controller this middleware is attached to. */
  controllerName: string;
  /** HTTP method handler (when `scope === 'route'`). */
  controllerMethod?: string;
  /** HTTP verb (when `scope === 'route'`). */
  httpMethod?: string;
  /** Resolved route path including the controller base path. */
  routePath?: string;
}

/**
 * Middleware preset information surfaced on the Studio Status dashboard.
 * Populated by the adapter after `applyPreset()` resolves and passed to
 * the agent via `AgentConfig.middlewarePreset`.
 */
export interface MiddlewarePresetInfo {
  /** Name of the active preset (e.g. "api", "web", "production"). */
  name: string;
  /** Whether custom overrides were applied on top of the preset. */
  hasOverrides: boolean;
  /** Effective parse configuration. */
  parse?: {
    json?: { limit?: string };
    urlencoded?: { limit?: string; extended?: boolean };
    cookies?: boolean;
  };
  /** Effective security configuration. */
  security?: {
    tier?: string;
    helmet?: boolean;
    cors?: {
      origin?: boolean | string;
      credentials?: boolean;
      methods?: string[];
      allowedHeaders?: string[];
    };
    rateLimit?: {
      windowMs?: number;
      max?: number;
    } | false;
  };
  /** Effective compression configuration. */
  compress?: {
    enabled: boolean;
    level?: number;
  };
  /** Effective logger configuration. */
  logger?: {
    enabled: boolean;
    implementation?: string;
  };
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
  | 'runtime'
  | 'security'
  | 'security_scan_state'
  | 'fix_progress'
  | 'fix_result';

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

/**
 * How a middleware participates in the HTTP pipeline.
 *
 *   - `global`     — added in `app.ts` via `Middleware.add()` / preset.
 *                    Runs for every request that reaches the app.
 *   - `controller` — passed to `@controller(path, ...mw)`. Runs for every
 *                    route the controller exposes.
 *   - `route`      — passed to a route decorator like `@Get(path, ...mw)`.
 *                    Runs only for that specific route.
 *
 * Middleware that we discovered statically but cannot tie to a binding
 * yet defaults to `unknown` and is rendered without an edge.
 */
export type MiddlewareScope =
  | 'global'
  | 'controller'
  | 'route'
  | 'unknown';

/**
 * Middleware metadata — a first-class node type in the architecture
 * map, distinct from services and providers.
 *
 * Middleware participates in the HTTP pipeline rather than the DI
 * injection graph: nothing `@inject`s it, so the orphan heuristic that
 * works for services would falsely flag every middleware. The map
 * therefore needs the explicit `scope` to position the node and draw
 * the right edge style (dashed for global, solid for scoped).
 */
export interface MiddlewareInfo {
  name: string;
  filePath: string;
  dependencies: string[];
  methods: string[];
  /**
   * Pipeline scope. May be `unknown` for the brief window between the
   * static scan and the adapter's runtime report — the agent's merge
   * step upgrades it once Reflect metadata is available.
   */
  scope: MiddlewareScope;
}

/**
 * A `CreateModule(...)` grouping discovered in the host source.
 *
 * Modules are first-class organisational units in ExpressoTS — the
 * Architecture Map renders one bounded box per module so that a 50-
 * controller app reads as a small set of feature areas rather than a
 * flat soup. Anonymous inline modules (e.g. the root one passed to
 * `configContainer([CreateModule([...])])`) are skipped — only named
 * exports are surfaced because they're the ones users reason about.
 */
export interface ModuleInfo {
  /** Variable name the module is exported under (e.g. "UserModule"). */
  name: string;
  /** File where the `CreateModule(...)` declaration was found. */
  filePath: string;
  /**
   * Class names listed in the module array, recursively expanded
   * through nested module references. So `RootModule = CreateModule(
   * [AppController, UserModule])` resolves to
   * `["AppController", "UserCreateController"]`.
   */
  members: string[];
}

/** Application structure for architecture visualization */
export interface AppStructure {
  controllers: ControllerInfo[];
  services: ServiceInfo[];
  providers: ServiceInfo[];
  /**
   * Middleware nodes. Promoted from a flat name list to rich
   * `MiddlewareInfo` records so the Architecture Map can render them as
   * a distinct node type with scope-aware edges. Pre-existing consumers
   * that only need the count can still read `middleware.length`.
   */
  middleware: MiddlewareInfo[];
  dependencies: DependencyInfo[];
  /** Discovered `CreateModule(...)` groupings — empty when the project is module-less. */
  modules: ModuleInfo[];
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
  /**
   * Active middleware preset and effective configuration. Reported by the
   * adapter after `applyPreset()` runs so Studio can display what's active.
   */
  middlewarePreset?: MiddlewarePresetInfo;
}

// ────────────────────────────────────────────────────────────────────────
// Security — supply-chain + runtime posture
// ────────────────────────────────────────────────────────────────────────

/**
 * Severity classes used across both supply-chain (CVE) and runtime
 * posture findings. Mirrors the npm-audit / OSV / CVSS vocabulary, plus
 * an `INFO` bucket for advisory-grade hints (e.g. heuristic secret
 * detections) that aren't strictly vulnerabilities.
 */
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

/**
 * How likely is it that the vulnerable code is actually executed in the
 * running app? Computed from imports in `src/`, the DI/route graph, and
 * recorded HTTP exchanges. Drives risk-weighted prioritisation: a
 * `confirmed` MEDIUM finding usually deserves attention before an
 * `unreachable` CRITICAL one.
 */
export type Reachability = 'confirmed' | 'likely' | 'unreachable' | 'unknown';

/** Why a finding got the reachability label it did, plus the evidence trail. */
export interface ReachabilityInfo {
  level: Reachability;
  /** Files under `src/` that import (or `require`) the vulnerable package. */
  importedBy: string[];
  /**
   * Routes whose controller (or transitively a service it depends on)
   * imports the vulnerable package. Drives the "exercised X times in
   * the last Y exchanges" chip in the UI.
   */
  routes: { method: string; path: string }[];
  /** How many recorded exchanges hit one of `routes`. */
  runtimeHits: number;
  /** Short human reason — feeds the tooltip on the reachability chip. */
  reason: string;
}

/**
 * Concrete, runnable remediation for a finding. The agent computes this
 * server-side so the UI never has to assemble shell commands. Two flavours:
 *
 *   - `install`  → `npm install <pkg>@<ver>` (direct dep, exact target).
 *   - `audit-fix` → `npm audit fix` (npm can resolve a non-major upgrade).
 *   - `audit-fix-force` → `npm audit fix --force` (semver-major; warn).
 *   - `override` → user has to edit `package.json` `overrides` themselves.
 *   - `none` → no upstream fix exists yet; advisory-only.
 */
export interface FixSpec {
  kind: 'install' | 'audit-fix' | 'audit-fix-force' | 'override' | 'none';
  /** Verbatim command the agent will run if "Apply fix" is clicked. */
  command: string;
  /** True when the upgrade crosses a semver-major boundary on the root. */
  breaking: boolean;
  /** Short button label, e.g. "Upgrade lodash 4.17.10 → 4.17.21". */
  label: string;
  /** Optional human note (e.g. "requires `npm audit fix --force`"). */
  note?: string;
}

/**
 * For transitive vulnerabilities, the *real* package the user needs to
 * upgrade to fix the issue. npm audit's stock output buries this — we
 * reconstruct it from the lockfile so the UI can show
 * "Vulnerable lodash@4.17.10 reached via express-session → fix by
 *  upgrading express-session 1.17.0 → 1.17.3".
 */
export interface RootCause {
  /** Top-level package (direct dep) the user actually owns. */
  rootPackage: string;
  /** Version currently installed for the root. */
  rootInstalledVersion: string;
  /** Shortest path through node_modules from root → vulnerable pkg. */
  chain: string[];
  /** True when the vulnerable package *is* the root (direct dep). */
  isDirect: boolean;
  /**
   * Optional version of the root that ships a fixed transitive. Set when
   * npm audit / OSV can tell us; absent means user has to bump manually
   * or wait for upstream.
   */
  rootFixedVersion?: string;
}

/**
 * A single supply-chain vulnerability finding. Produced by reconciling
 * `npm audit --json` output with the OSV.dev advisory database — the
 * agent dedupes by `id` (CVE / GHSA) across both sources, then enriches
 * each finding with a concrete `fix`, the transitive `rootCause`, and a
 * runtime `reachability` assessment.
 */
export interface DependencyFinding {
  /** Canonical advisory id (CVE-… or GHSA-…). Stable across rescans. */
  id: string;
  /** npm package name. */
  package: string;
  /** Version currently installed in the host's lockfile. */
  installedVersion: string;
  /** Minimum version that includes the fix, when known. */
  fixedVersion?: string;
  severity: Severity;
  /** CVSS v3.x base score, when published. */
  cvss?: number;
  title: string;
  summary: string;
  /** External links (advisory pages, blog posts, commits). */
  references: string[];
  /**
   * Transitive resolution chain from a root dependency to the vulnerable
   * package. First entry is the root, last entry is the vulnerable
   * package itself. Empty when the agent can't resolve a path.
   */
  path: string[];
  /**
   * Concrete remediation. Always populated, even if `kind: 'none'` — UI
   * can branch on `kind` instead of doing existence checks.
   */
  fix?: FixSpec;
  /**
   * Root-cause analysis for transitive vulnerabilities. Absent when the
   * finding *is* a direct dependency (in which case `fix` already targets
   * the right package).
   */
  rootCause?: RootCause;
  /** Runtime reachability assessment. Studio's unique contribution. */
  reachability?: ReachabilityInfo;
}

/**
 * A grouping of findings that all share a single fix command.
 *
 * Most real-world `npm audit` reports list one upgrade resolving many
 * advisories (a single lodash bump kills four CVEs). Grouping flips the
 * UI from "look at every advisory" to "make this one change to fix N
 * issues" — same data, dramatically less noise.
 */
export interface FixGroup {
  /** Stable id (hash of package@version + finding ids). */
  id: string;
  /** Package being upgraded (typically a direct dep / root cause). */
  package: string;
  /** Current installed version of that package. */
  fromVersion: string;
  /** Target version that fixes every finding in this group. */
  toVersion: string;
  /** True when this is a semver-major upgrade. */
  breaking: boolean;
  /** Top severity across the findings in the group. */
  severity: Severity;
  /** IDs of every finding this group resolves (look up in `dependencies`). */
  findingIds: string[];
  /** The actual fix command — same shape as `DependencyFinding.fix`. */
  fix: FixSpec;
  /** "confirmed" if any member finding is confirmed-reachable. */
  reachability?: Reachability;
}

/**
 * Where a posture finding came from. Each kind gives the UI just enough
 * context to deep-link the user to the offending route / exchange / log
 * / file so they can fix the issue without leaving Studio.
 */
export type PostureEvidence =
  | { kind: 'exchange'; exchangeId: string }
  | { kind: 'route'; method: string; path: string }
  | { kind: 'log'; logIndex: number }
  | { kind: 'file'; filePath: string; lineNumber?: number };

/**
 * A runtime posture finding — a check that the posture analyzer
 * performed over the agent's in-memory exchanges/routes/structure/logs
 * and flagged as risky.
 *
 * Distinct from `DependencyFinding` (which is supply-chain only). The
 * runtime posture is Studio's unique contribution: Snyk-style scanners
 * never see the running app.
 */
export interface PostureFinding {
  /** Stable hash so the UI can dedupe across re-runs of the analyzer. */
  id: string;
  /**
   * Slug identifying the check that produced this finding
   * (e.g. `missing-csp`, `permissive-cors`, `verbose-error`).
   */
  rule: string;
  /** OWASP API Security Top 10 category (e.g. `API1:2023`), when applicable. */
  owasp?: string;
  severity: Severity;
  /** Short, user-facing one-liner. */
  title: string;
  /** Longer explanation — used as the body of the finding card. */
  description: string;
  /** Where to look to verify the finding (deep-link target). */
  evidence: PostureEvidence;
  /** Suggested remediation, when we can be concrete. */
  fixHint?: string;
}

/**
 * The whole security view, debounced and broadcast as one envelope so
 * the UI can render with a single state transition. Includes both
 * supply-chain CVEs and runtime posture findings, plus an aggregate
 * letter grade and a `scanState` describing the current scan lifecycle.
 */
export interface SecurityReport {
  /** When the agent finished assembling this report (ms epoch). */
  generatedAt: number;
  /** Aggregate posture score. F = critical issues; A = no findings. */
  score: 'A' | 'B' | 'C' | 'D' | 'F';
  /** Counts by severity across both dependencies and posture. */
  counts: Record<Severity, number>;
  dependencies: DependencyFinding[];
  posture: PostureFinding[];
  /**
   * Findings grouped by their shared fix command. A single upgrade can
   * resolve many advisories — surfacing those groups lets users act on
   * the *change*, not on every individual CVE.
   */
  fixGroups: FixGroup[];
  /**
   * Lifecycle of the on-demand scan. Use this to drive UI affordances
   * (spinner, error banner) instead of inferring from finding counts.
   */
  scanState: {
    audit: 'idle' | 'running' | 'error';
    /** When the posture analyzer last produced findings. 0 = never. */
    postureLastRunAt: number;
    /** Short reason when `audit === 'error'`. Surfaced to the user. */
    auditError?: string;
    /**
     * True when the host project has no `package-lock.json`, so `npm
     * audit` is skipped entirely. The UI should show an empty state
     * with instructions, not "no vulnerabilities".
     */
    missingLockfile?: boolean;
    /**
     * Lifecycle of the currently-running "Apply fix" job, if any. The
     * agent streams `fix_progress` messages while this is `running`.
     */
    fix?: {
      state: 'running' | 'success' | 'error';
      /** The `FixGroup.id` or `DependencyFinding.id` being applied. */
      targetId: string;
      /** Concrete command being executed. */
      command: string;
      /** Short error reason when `state === 'error'`. */
      error?: string;
    };
  };
}

// ────────────────────────────────────────────────────────────────────────
// Apply-fix workflow — WS payloads
// ────────────────────────────────────────────────────────────────────────

/**
 * Streaming line from an in-flight `apply_security_fix` job. The UI
 * appends these to a terminal-style transcript so users can watch
 * `npm install` progress live without leaving Studio.
 */
export interface FixProgressMessage {
  /** Matches the `FixGroup.id` / `DependencyFinding.id` that was clicked. */
  targetId: string;
  stream: 'stdout' | 'stderr';
  line: string;
  /** Wall-clock at which the agent observed this line. */
  timestamp: number;
}

/**
 * Final outcome of an `apply_security_fix` job. After this fires the
 * agent always re-runs `npm audit` + OSV; the resulting `security`
 * frame is the user's "did it actually work?" confirmation.
 */
export interface FixResultMessage {
  targetId: string;
  success: boolean;
  exitCode: number | null;
  durationMs: number;
  /** Final command that ran (echoed for the transcript footer). */
  command: string;
  /** Short message for the toast — "Upgrade succeeded" / "npm install failed". */
  summary: string;
  /** Captured stderr tail when `success === false` (truncated to 4 KB). */
  errorTail?: string;
}
