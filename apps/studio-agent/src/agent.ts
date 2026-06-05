/**
 * StudioAgent - Main orchestrator for ExpressoTS Studio instrumentation
 * 
 * Provides:
 * - OpenTelemetry instrumentation
 * - Route discovery
 * - Request/response recording
 * - WebSocket communication with Studio UI
 */

import { Server as SocketIOServer } from 'socket.io';
import { createServer, Server as HttpServer } from 'http';
import { StudioTracer } from './instrumentation/tracer.js';
import { RouteScanner } from './discovery/route-scanner.js';
import { RequestRecorder } from './recording/request-recorder.js';
import {
  ContainerIntrospector,
  type ContainerSnapshot,
} from './introspection/container-introspector.js';
import { DatabaseIntrospector } from './introspection/database-introspector.js';
import { LogCapture, type LogEntry } from './logging/log-capture.js';
import { SecurityEngine } from './security/index.js';
import { resolveInstallId } from './identity/install-id.js';
import * as fs from 'node:fs';
import type { FSWatcher } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  AgentConfig,
  RouteInfo,
  TraceInfo,
  AppStructure,
  AppMetrics,
  EndpointStats,
  WSMessage,
  HttpMethod,
  RuntimeInfo,
} from './types/index.js';

/**
 * Best-effort version lookup for a package installed in the host's
 * `node_modules`. We read `package.json` straight from disk instead of
 * going through `require()` — most modern packages don't expose
 * `./package.json` in their `exports` map, which made the `require`
 * approach silently return `undefined`.
 */
function safePackageVersion(pkgName: string): string | undefined {
  const candidates = [
    // Standard layout: <cwd>/node_modules/<pkg>/package.json
    path.resolve(process.cwd(), 'node_modules', ...pkgName.split('/'), 'package.json'),
    // Walk up from this module's location for nested / hoisted layouts.
    ...walkParentNodeModules(pkgName),
  ];
  for (const file of candidates) {
    try {
      const raw = fs.readFileSync(file, 'utf-8');
      const parsed = JSON.parse(raw) as { version?: string };
      if (parsed?.version) return parsed.version;
    } catch {
      // try the next candidate
    }
  }
  return undefined;
}

/** Yield candidate `node_modules/<pkg>/package.json` paths walking up from this file. */
function walkParentNodeModules(pkgName: string): string[] {
  const out: string[] = [];
  try {
    let dir = path.dirname(fileURLToPath(import.meta.url));
    for (let i = 0; i < 8; i++) {
      out.push(path.resolve(dir, 'node_modules', ...pkgName.split('/'), 'package.json'));
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch {
    // import.meta.url may be unavailable in some bundles — fine.
  }
  return out;
}

/**
 * Resolve our own package version from the agent's bundled `package.json`.
 * Reads the manifest sitting two levels up from the compiled `agent.js`
 * (i.e. `dist/agent.js` → `package.json`). Falls back to the host lookup,
 * then to "unknown".
 */
function resolveOwnVersion(): string {
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const candidate = path.resolve(here, '..', 'package.json');
    const raw = fs.readFileSync(candidate, 'utf-8');
    const parsed = JSON.parse(raw) as { version?: string };
    if (parsed?.version) return parsed.version;
  } catch {
    // fall through
  }
  return safePackageVersion('@expressots/studio-agent') ?? 'unknown';
}

export class StudioAgent {
  private config: AgentConfig;
  private tracer: StudioTracer;
  private scanner: RouteScanner;
  private recorder: RequestRecorder;
  private introspector: ContainerIntrospector | null = null;
  private containerSnapshot: ContainerSnapshot | null = null;
  private databaseIntrospector: DatabaseIntrospector | null = null;
  private logCapture: LogCapture;
  private securityEngine: SecurityEngine | null = null;
  private io: SocketIOServer | null = null;
  private httpServer: HttpServer | null = null;
  private routes: RouteInfo[] = [];
  private appStructure: AppStructure | null = null;
  private metrics: AppMetrics;
  private endpointStats: Map<string, EndpointStats> = new Map();
  private responseTimes: number[] = [];
  private startTime: number = Date.now();
  private isRunning: boolean = false;
  private srcWatcher: FSWatcher | null = null;
  private rescanTimer: NodeJS.Timeout | null = null;
  /**
   * Periodic metrics-broadcast timer. Captured so `stop()` can clear it
   * cleanly; `.unref()`'d so it never keeps the Node event loop alive in
   * tests / serverless environments.
   */
  private metricsTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<AgentConfig> = {}) {
    this.config = {
      mode: config.mode ?? 'development',
      installId: resolveInstallId(config.installId || undefined),
      port: config.port ?? 3334,
      dbPath: config.dbPath ?? '.studio/studio.db',
      enableRecording: config.enableRecording ?? true,
      maxRecordedExchanges: config.maxRecordedExchanges ?? 1000,
      enableProfiling: config.enableProfiling ?? true,
      traceSampleRate: config.traceSampleRate ?? 1.0,
      serviceName: config.serviceName ?? 'expressots-app',
      expressApp: config.expressApp,
      appContainer: config.appContainer,
      appPort: config.appPort,
      globalPrefix: config.globalPrefix,
      startupMs: config.startupMs,
      interceptorCount: config.interceptorCount,
    };

    if (this.config.appContainer) {
      this.introspector = new ContainerIntrospector(this.config.appContainer);
      this.databaseIntrospector = new DatabaseIntrospector(
        this.config.appContainer,
      );
    }

    this.logCapture = new LogCapture(1000);

    this.tracer = new StudioTracer(this.config.serviceName);
    this.scanner = new RouteScanner();
    this.recorder = new RequestRecorder(
      this.config.dbPath,
      this.config.maxRecordedExchanges
    );

    this.metrics = {
      uptime: 0,
      requestCount: 0,
      errorCount: 0,
      avgResponseTime: 0,
      p50ResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      memoryUsage: process.memoryUsage(),
      activeConnections: 0,
    };
  }

  /** Start the Studio Agent */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('StudioAgent is already running');
      return;
    }

    // Initialize recorder. Best-effort: request recording is backed by
    // Node's built-in `node:sqlite` (Node >=22.5). On older runtimes the
    // recorder stays disabled and every other Studio feature keeps working,
    // so a missing/unavailable SQLite backend must never abort startup.
    if (this.config.enableRecording) {
      try {
        await this.recorder.initialize();
        if (!this.recorder.isAvailable()) {
          this.config.enableRecording = false;
          console.warn(
            'StudioAgent: request recording disabled (node:sqlite unavailable, requires Node >=22.5). All other Studio features remain active.',
          );
        }
      } catch (error) {
        this.config.enableRecording = false;
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          `StudioAgent: request recording disabled (${message}). All other Studio features remain active.`,
        );
      }
    }

    // Start tracer
    await this.tracer.start((trace) => this.handleTrace(trace));

    // Scan for routes
    await this.scanRoutes();

    // Capture DI container snapshot (bindings + dependency graph). Best-effort:
    // if the container is missing or not the expected Inversify shape we just
    // get an empty snapshot back and the Container view in the UI stays empty.
    if (this.introspector && this.introspector.isAvailable()) {
      try {
        this.containerSnapshot = this.introspector.capture();
        this.introspector.installResolutionTracker();
      } catch {
        this.containerSnapshot = null;
      }
    }

    // Start WebSocket server
    await this.startWebSocketServer();

    // Start metrics collection
    this.startMetricsCollection();

    // Capture console.* output and stream it to the UI. We install this
    // last so the agent's own startup logs ("Studio Agent listening on …")
    // still go through unmodified.
    this.logCapture.install();
    this.logCapture.onLog((entry) => {
      this.broadcast('log', entry);
      // Each new log line is a potential signal for the posture
      // analyzer (e.g. it may reveal a leaked secret). Cheap to
      // debounce; the engine collapses bursts.
      this.securityEngine?.scheduleRefresh();
    });

    this.startSecurityEngine();

    // Watch the project's `src/` for controller / module / DTO changes so
    // the Routes, Architecture and API client tabs stay live without the
    // user reloading Studio. Disabled in production and silently no-ops
    // when the directory is missing or `fs.watch(recursive)` isn't
    // supported on this platform/Node version.
    this.startSrcWatcher();

    this.isRunning = true;
  }

  /**
   * Start a debounced filesystem watcher over `./src` (relative to the
   * host's CWD) that triggers a route + structure rescan whenever a
   * `*.ts` / `*.js` file changes. Uses `fs.watch({ recursive: true })`
   * to avoid taking a chokidar dependency. Failures are non-fatal.
   */
  private startSrcWatcher(): void {
    if (process.env.NODE_ENV === 'production') return;
    if (process.env.EXPRESSOTS_STUDIO_FS_WATCH === 'false') return;

    const srcDir = path.resolve(process.cwd(), 'src');
    if (!fs.existsSync(srcDir)) return;

    const debounceMs = 300;
    const onChange = (_event: string, filename: string | Buffer | null) => {
      if (!filename) return;
      const name = filename.toString();
      // Only react to source file changes; skip editor swap files and the
      // compiled output to avoid feedback loops.
      if (!/\.(ts|js)$/i.test(name)) return;
      if (name.includes('node_modules')) return;
      if (name.includes('dist' + path.sep) || name.startsWith('dist')) return;

      if (this.rescanTimer) clearTimeout(this.rescanTimer);
      this.rescanTimer = setTimeout(() => {
        this.rescanTimer = null;
        void this.scanRoutes();
      }, debounceMs);
    };

    try {
      this.srcWatcher = fs.watch(srcDir, { recursive: true }, onChange);
      this.srcWatcher.on('error', () => {
        // Best-effort: a closed handle / inotify exhaustion shouldn't take
        // down the agent. Disable further reactions until next start().
        this.srcWatcher?.close();
        this.srcWatcher = null;
      });
    } catch {
      // Recursive watch is unsupported on some Linux setups (Node < 20).
      // Live updates simply degrade to "rescan on next request"; users
      // running tsx/nodemon will still get a fresh agent on each restart.
      this.srcWatcher = null;
    }
  }

  /**
   * Stand up the SecurityEngine and kick off the first scan. The
   * engine reuses the existing Socket.IO server — every transition in
   * its report goes out as a `WSMessage<'security'>` envelope, gated
   * on at least one connected client.
   */
  private startSecurityEngine(): void {
    this.securityEngine = new SecurityEngine({
      cwd: process.cwd(),
      dbPath: this.config.dbPath,
      getRoutes: () => this.routes,
      getStructure: () => this.appStructure,
      getExchanges: () =>
        this.config.enableRecording
          ? this.recorder.getRecentExchanges(this.config.maxRecordedExchanges, 0)
          : [],
      getLogs: () => this.logCapture.getBuffer(),
    });

    this.securityEngine.onReport((report) => {
      // Gate on clientsCount > 0 — no point queueing 100 KB frames
      // against a backgrounded tab. The next reconnecting client gets
      // the latest report from the initial-data replay anyway.
      if (!this.io || this.io.engine.clientsCount === 0) return;
      this.broadcast('security', report);
    });

    // Kick off the first full scan in the background — never blocks
    // start(). Failures are absorbed by the engine and surface in
    // `scanState.audit === 'error'`.
    void this.securityEngine.runFullScan();
  }

  /** Get the captured container snapshot (or null if unavailable). */
  getContainerSnapshot(): ContainerSnapshot | null {
    return this.containerSnapshot;
  }

  /**
   * Capture a fresh in-memory database snapshot. Returns an "unavailable"
   * snapshot when no `InMemoryDBProvider` is registered or no container was
   * provided to the agent.
   */
  private captureDatabaseSnapshot(): import('./types/index.js').DatabaseSnapshot {
    if (this.databaseIntrospector) {
      return this.databaseIntrospector.capture();
    }
    return {
      available: false,
      tableCount: 0,
      totalRecords: 0,
      entities: [],
      timestamp: new Date().toISOString(),
    };
  }

  /** Stop the Studio Agent */
  async stop(): Promise<void> {
    if (!this.isRunning) return;
    // Mark stopped up-front so concurrent stop() calls bail and the
    // host's shutdown hook isn't held waiting on a duplicate teardown.
    this.isRunning = false;

    await this.shutdownWebSocketServer();

    try {
      await this.tracer.stop();
    } catch {
      // best-effort
    }

    try {
      this.recorder.close();
    } catch {
      // best-effort
    }

    // Restore original console.* so the host process logs untouched.
    this.logCapture.uninstall();

    if (this.securityEngine) {
      this.securityEngine.stop();
      this.securityEngine = null;
    }

    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }

    if (this.rescanTimer) {
      clearTimeout(this.rescanTimer);
      this.rescanTimer = null;
    }
    if (this.srcWatcher) {
      try {
        this.srcWatcher.close();
      } catch {
        // best-effort
      }
      this.srcWatcher = null;
    }
  }

  /**
   * Tear down the WebSocket / HTTP server with a hard timeout so the
   * host's graceful shutdown never hangs on a slow socket.io drain.
   *
   * If the close doesn't complete in time, we move on — the OS reclaims
   * the port the moment the host process exits, so the next hot-reload
   * start succeeds anyway. (`tsx --watch` / `nodemon` will SIGKILL us
   * otherwise, which surfaces to the user as "Failed running ./src/main.ts".)
   */
  private async shutdownWebSocketServer(): Promise<void> {
    const io = this.io;
    const httpServer = this.httpServer;
    this.io = null;
    this.httpServer = null;

    if (!io && !httpServer) return;

    // Force-close any lingering keep-alive / WebSocket sockets so the
    // underlying server can release the port immediately rather than
    // waiting for the OS-level read timeout. (Node 18.2+; older Node
    // silently no-ops via the optional-call.)
    if (httpServer) {
      try {
        (httpServer as unknown as { closeAllConnections?: () => void })
          .closeAllConnections?.();
      } catch {
        // best-effort
      }
    }

    const drained = new Promise<void>((resolve) => {
      const finish = () => resolve();
      if (io) {
        // socket.io closes the underlying http server itself.
        io.close(finish);
      } else if (httpServer) {
        httpServer.close(() => finish());
      } else {
        finish();
      }
    });

    // Hard cap: 500ms is plenty for a clean drain after
    // closeAllConnections; anything slower is a stuck client and we
    // don't want that to hold up the host's shutdown.
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, 500));

    await Promise.race([drained, timeout]);
  }

  /** Scan application for routes */
  async scanRoutes(): Promise<void> {
    try {
      this.appStructure = await this.scanner.scan();
      this.routes = this.scanner.getRoutes();
      // Snapshot the un-prefixed path for every freshly scanned route.
      // The static scanner only sees `@controller(...)` + `@Get(...)`
      // metadata — the host mounts the whole router under
      // `setGlobalRoutePrefix("/api")` later, so the source-of-truth
      // path is kept on `originalPath` and the user-visible `path` is
      // always recomputed from it. This lets `updateRuntimeInfo` swap
      // the prefix later without compounding `/api/api/health`-style
      // duplication on each call.
      for (const r of this.routes) {
        (r as RouteInfo & { originalPath?: string }).originalPath = r.path;
      }
      // Re-fold any previously reported runtime middleware data into
      // the fresh static structure. Without this, a hot-reload rescan
      // would drop the global pipeline nodes and Reflect-derived edges
      // until the next `updateRuntimeInfo()` callback.
      this.mergeRuntimeMiddlewareIntoStructure();

      // Apply the host-supplied global URL prefix. Earlier versions
      // tried to recover the prefix from `app.router.stack[i].regexp`
      // at runtime, but Express 5 dropped that field in favour of
      // opaque `matchers` closures, so the prefix is no longer
      // recoverable from the layer alone. The host already passes it
      // in via `agentOptions.globalPrefix` — use that as the source of
      // truth.
      this.applyGlobalPrefixToRoutes();

      // If Express app is provided, also scan runtime routes and merge
      // anything the static scan missed (handlers registered ad-hoc via
      // `app.get(...)` outside a `@Controller()` class, e.g. health-check
      // probes wired directly in `configureServices`). The static
      // scanner is the source of truth for decorated routes; runtime
      // routes only ever *add* — never replace.
      if (this.config.expressApp) {
        const runtimeRoutes = RouteScanner.scanExpressApp(this.config.expressApp);
        const prefix = this.normaliseGlobalPrefix(this.config.globalPrefix);

        for (const runtimeRoute of runtimeRoutes) {
          // Apply the same global prefix to runtime routes — Express 5
          // strips it from `app.router.stack` (the prefix lives inside
          // sub-router matcher closures), so `scanExpressApp` returns
          // un-prefixed paths just like the static scanner.
          const fullPath = prefix
            ? this.joinPrefixWithRoute(prefix, runtimeRoute.path)
            : runtimeRoute.path;

          const exact = this.routes.find(
            (r) => r.path === fullPath && r.method === runtimeRoute.method,
          );
          if (exact) continue;

          this.routes.push({
            ...runtimeRoute,
            path: fullPath,
            // Keep the un-prefixed form so a later prefix change rewrites
            // this route the same way it does decorator-discovered ones.
            ...(({ originalPath: runtimeRoute.path }) as { originalPath: string }),
          });
        }
      }

      // Broadcast to connected clients. The routes payload is small,
      // but the architecture map needs the full `appStructure` (controllers,
      // services, providers, middleware, dependencies) to redraw nodes
      // and edges for newly added classes — without this second emit the
      // map keeps showing the boot-time graph even after a rescan.
      this.broadcast('routes', this.routes);
      if (this.appStructure) {
        this.broadcast('structure', this.appStructure);
      }
    } catch (error) {
      // `console.error('Failed to scan routes:', error)` prints `{}` for any
      // thrown value that isn't a `Error` instance (because plain objects
      // serialise as their enumerable keys, of which there are none on most
      // exception shapes). Normalise to a useful one-liner so users can
      // actually diagnose what the static scan tripped over.
      const err = error as { message?: string; code?: string; stack?: string };
      const message =
        (err && (err.message || err.code)) ||
        (typeof error === 'string' ? error : JSON.stringify(error)) ||
        'unknown error';
      console.error(`[StudioAgent] Failed to scan routes: ${message}`);
      if (err?.stack && process.env.EXPRESSOTS_STUDIO_DEBUG === 'true') {
        console.error(err.stack);
      }
    }
  }

  /** Get discovered routes */
  getRoutes(): RouteInfo[] {
    return this.routes;
  }

  /**
   * Normalise the host-supplied global URL prefix into the form we
   * actually want to splice into route paths.
   *
   *   - Returns `''` for "no prefix" (so callers can fall through with a
   *     simple truthy check).
   *   - Strips trailing slashes (`/api/` → `/api`) so the join helper
   *     never produces `/api//foo`.
   *   - Defends against the host passing through a legitimate but
   *     no-op `'/'` prefix.
   */
  private normaliseGlobalPrefix(value: string | undefined): string {
    if (!value || typeof value !== 'string') return '';
    if (value === '/' || value === '') return '';
    return value.endsWith('/') ? value.slice(0, -1) : value;
  }

  /**
   * Splice a normalised global prefix onto a controller-relative route
   * path while preserving the leading slash and avoiding doubled
   * separators. `/api` + `/` → `/api/`, `/api` + `users` → `/api/users`,
   * `/api` + `/users` → `/api/users`.
   */
  private joinPrefixWithRoute(prefix: string, path: string): string {
    if (!path || path === '/') return prefix + '/';
    return prefix + (path.startsWith('/') ? path : `/${path}`);
  }

  /** Get application structure */
  getAppStructure(): AppStructure | null {
    return this.appStructure;
  }

  /** Get current metrics */
  getMetrics(): AppMetrics {
    return {
      ...this.metrics,
      uptime: Date.now() - this.startTime,
      memoryUsage: process.memoryUsage(),
    };
  }

  /** Get endpoint statistics (without internal durations array) */
  getEndpointStats(): EndpointStats[] {
    return Array.from(this.endpointStats.values()).map(({ durations, ...stats }) => stats);
  }

  /**
   * Apply runtime details that the host application only knows after
   * boot (e.g. the actual port returned by `app.listen()`, total startup
   * duration, count of registered interceptors).
   *
   * Called by the adapter integration once the HTTP server is listening.
   * Re-broadcasts the updated runtime info so connected Studio clients
   * see fresh values without waiting for the next metrics tick.
   */
  updateRuntimeInfo(patch: {
    appPort?: number;
    globalPrefix?: string;
    startupMs?: number;
    interceptorCount?: number;
    providerCount?: number;
    middlewareCount?: number;
    runtimeItems?: import('./types/index.js').RuntimeItems;
    middlewarePreset?: import('./types/index.js').MiddlewarePresetInfo;
  }): void {
    if (patch.appPort !== undefined) this.config.appPort = patch.appPort;
    // Track whether the prefix actually changed before assigning, so we
    // know whether to re-prefix the cached `routes`. Without this, a
    // late `updateRuntimeInfo({ globalPrefix: "/api" })` (e.g. fired
    // from `app.listen()`'s callback after `setGlobalRoutePrefix("/api")`
    // ran during configureServices) would update the config but leave
    // the route list still showing un-prefixed paths until the next
    // file-watcher rescan.
    let prefixChanged = false;
    if (patch.globalPrefix !== undefined && patch.globalPrefix !== this.config.globalPrefix) {
      this.config.globalPrefix = patch.globalPrefix;
      prefixChanged = true;
    }
    if (patch.startupMs !== undefined) this.config.startupMs = patch.startupMs;
    if (patch.interceptorCount !== undefined) {
      this.config.interceptorCount = patch.interceptorCount;
    }
    if (patch.providerCount !== undefined) {
      this.config.providerCount = patch.providerCount;
    }
    if (patch.middlewareCount !== undefined) {
      this.config.middlewareCount = patch.middlewareCount;
    }
    if (patch.runtimeItems !== undefined) {
      this.config.runtimeItems = {
        ...this.config.runtimeItems,
        ...patch.runtimeItems,
      };
    }
    if (patch.middlewarePreset !== undefined) {
      this.config.middlewarePreset = patch.middlewarePreset;
    }

    // Fold the latest runtime data into the cached `appStructure` so the
    // architecture map sees:
    //   1. Global pipeline middleware as nodes (even when nothing in
    //      source extends ExpressoMiddleware — e.g. plain functions
    //      added via `Middleware.add`).
    //   2. Scoped middleware → controller / route edges from the
    //      `middlewareBindings` payload.
    //
    // The merge is idempotent — calling `updateRuntimeInfo` repeatedly
    // with the same payload yields the same structure.
    const merged = this.mergeRuntimeMiddlewareIntoStructure();
    if (merged && this.io) {
      this.broadcast('structure', this.appStructure!);
    }

    // If the global URL prefix changed, splice it onto every cached
    // route so the Routes / API client tabs immediately reflect the
    // mounted paths instead of the bare per-controller paths.
    if (prefixChanged) {
      this.applyGlobalPrefixToRoutes();
      if (this.io) this.broadcast('routes', this.routes);
    }

    if (this.io) {
      this.broadcast('runtime', this.getRuntimeInfo());
    }
  }

  /**
   * Recompute every route's `path` from its captured `originalPath` plus
   * the current `config.globalPrefix`. Idempotent and prefix-change-safe
   * — calling it twice with different prefixes never produces the
   * `/api/api/health` doubling we'd see if we appended in place.
   *
   * Routes pushed by older code paths that don't carry an `originalPath`
   * (defensive — hot-reload scans always set it now) are left alone, so
   * we never silently strip a prefix the source of truth set
   * intentionally.
   */
  private applyGlobalPrefixToRoutes(): void {
    const prefix = this.normaliseGlobalPrefix(this.config.globalPrefix);
    for (const route of this.routes) {
      const original = (route as RouteInfo & { originalPath?: string }).originalPath;
      if (typeof original !== 'string') continue;
      route.path = prefix
        ? this.joinPrefixWithRoute(prefix, original)
        : original;
    }
  }

  /**
   * Merge global pipeline middleware and runtime middleware bindings
   * into the static `appStructure` so the architecture map sees a
   * single source of truth. Returns `true` when the structure changed.
   *
   * Rules:
   *   - Each `runtimeItems.middleware` entry whose `type === 'custom'`
   *     gets a `MiddlewareInfo` node with `scope: 'global'` (built-in
   *     pipeline entries like `helmet` / `jsonParser` aren't worth
   *     plotting — they would clutter every architecture map without
   *     adding signal). Names are deduplicated against the existing
   *     middleware list.
   *   - Each `runtimeItems.middlewareBindings` entry contributes a
   *     `middleware → controller` edge (deduplicated with the static
   *     bindings produced by `RouteScanner`). The middleware node's
   *     scope is upgraded to `controller` or `route`.
   *   - Global middleware also gets synthetic edges to every
   *     controller in the structure so the map shows the pipeline
   *     fanning out across the app.
   */
  private mergeRuntimeMiddlewareIntoStructure(): boolean {
    if (!this.appStructure) return false;
    const runtime = this.config.runtimeItems;
    if (!runtime) return false;

    let changed = false;
    const byName = new Map<string, AppStructure['middleware'][number]>();
    for (const mw of this.appStructure.middleware) {
      byName.set(mw.name, mw);
    }

    // Global pipeline middleware → upgrade or create a node.
    for (const item of runtime.middleware ?? []) {
      if (item.type === 'built-in') continue;
      const existing = byName.get(item.name);
      if (existing) {
        if (existing.scope !== 'global') {
          existing.scope = 'global';
          changed = true;
        }
      } else {
        const node = {
          name: item.name,
          filePath: '',
          dependencies: [],
          methods: [],
          scope: 'global' as const,
        };
        this.appStructure.middleware.push(node);
        byName.set(item.name, node);
        changed = true;
      }
    }

    const knownNodes = new Set<string>();
    for (const c of this.appStructure.controllers) knownNodes.add(c.name);
    for (const s of this.appStructure.services) knownNodes.add(s.name);
    for (const p of this.appStructure.providers) knownNodes.add(p.name);
    for (const m of this.appStructure.middleware) knownNodes.add(m.name);

    const seenEdge = new Set<string>();
    for (const dep of this.appStructure.dependencies) {
      seenEdge.add(`${dep.source}->${dep.target}@${dep.type}`);
    }

    // Scoped bindings from Reflect metadata. If a binding references a
    // middleware name we haven't seen before (common for plain-function
    // middleware like `newMiddleware()` that doesn't extend
    // ExpressoMiddleware), create a lightweight node on-the-fly so the
    // architecture map can still render it.
    for (const binding of runtime.middlewareBindings ?? []) {
      if (!knownNodes.has(binding.controllerName)) continue;

      if (!knownNodes.has(binding.middlewareName)) {
        const node = {
          name: binding.middlewareName,
          filePath: '',
          dependencies: [],
          methods: [],
          scope: binding.scope as 'controller' | 'route',
        };
        this.appStructure.middleware.push(node);
        byName.set(binding.middlewareName, node);
        knownNodes.add(binding.middlewareName);
        changed = true;
      }

      const key = `${binding.middlewareName}->${binding.controllerName}@middleware`;
      if (!seenEdge.has(key)) {
        this.appStructure.dependencies.push({
          source: binding.middlewareName,
          target: binding.controllerName,
          type: 'middleware',
        });
        seenEdge.add(key);
        changed = true;
      }

      const mw = byName.get(binding.middlewareName);
      if (mw) {
        if (binding.scope === 'controller' && mw.scope !== 'controller') {
          mw.scope = 'controller';
          changed = true;
        } else if (
          binding.scope === 'route' &&
          mw.scope !== 'controller' &&
          mw.scope !== 'route'
        ) {
          mw.scope = 'route';
          changed = true;
        }
      }
    }

    // Global middleware fans out to every controller. We only emit
    // edges for nodes that already exist; the list is short (typically
    // a handful of custom middleware × a handful of controllers) so
    // duplication is cheap and produces a readable layered layout.
    for (const mw of this.appStructure.middleware) {
      if (mw.scope !== 'global') continue;
      for (const ctrl of this.appStructure.controllers) {
        const key = `${mw.name}->${ctrl.name}@middleware`;
        if (seenEdge.has(key)) continue;
        this.appStructure.dependencies.push({
          source: mw.name,
          target: ctrl.name,
          type: 'middleware',
        });
        seenEdge.add(key);
        changed = true;
      }
    }

    return changed;
  }

  /**
   * Build a snapshot of runtime information for the Status dashboard.
   *
   * Pulls together:
   *   - host process info (`pid`, `nodeVersion`, `platform`, etc.)
   *   - explicit values passed via `AgentConfig` (port, prefix, startupMs)
   *   - counts derived from the latest discovery scan
   *   - best-effort framework versions from the host's `node_modules`
   *
   * Designed to be cheap to call on every WebSocket connection.
   */
  getRuntimeInfo(): RuntimeInfo {
    // Resolve the host application's HTTP port. Order of preference:
    //   1) Explicit value passed via AgentConfig (most accurate; the
    //      adapter-express integration forwards the listening port here).
    //   2) `PORT` environment variable, which a lot of hosting platforms
    //      (and `expressots dev`) set.
    //   3) ExpressoTS default port (3000).
    const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : undefined;
    const appPort =
      this.config.appPort ?? (Number.isFinite(envPort) ? envPort : 3000);
    const appUrl = appPort ? `http://localhost:${appPort}` : undefined;

    // Prefer counts reported by the adapter (which uses the same
    // `MetricsCollector` as the CLI banner — so Studio always agrees with
    // the terminal) and fall back to whatever the static scan turned up.
    //
    // This matters for things our static scanner can't see:
    //   - framework-registered providers (lifecycle, logger, etc.)
    //   - interceptors registered via decorators on classes the agent
    //     hasn't reached during file traversal
    const interceptorCount =
      this.config.interceptorCount ??
      this.appStructure?.middleware.length;
    const providerCount =
      this.config.providerCount ??
      this.appStructure?.providers.length ??
      0;
    const middlewareCount =
      this.config.middlewareCount ??
      this.appStructure?.middleware.length ??
      0;

    return {
      serviceName: this.config.serviceName,
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      env: process.env.NODE_ENV || 'development',
      agentPort: this.config.port,
      appPort,
      appUrl,
      globalPrefix: this.config.globalPrefix ?? '/',
      startedAt: this.startTime,
      uptimeMs: Date.now() - this.startTime,
      startupMs: this.config.startupMs,
      versions: {
        agent: resolveOwnVersion(),
        core: safePackageVersion('@expressots/core'),
        adapterExpress: safePackageVersion('@expressots/adapter-express'),
      },
      counts: {
        controllers: this.appStructure?.controllers.length ?? 0,
        services: this.appStructure?.services.length ?? 0,
        providers: providerCount,
        routes: this.routes.length,
        middleware: middlewareCount,
        interceptors: interceptorCount,
      },
      runtimeItems: this.config.runtimeItems,
      recordingEnabled: this.config.enableRecording,
      middlewarePreset: this.config.middlewarePreset,
    };
  }

  /** Start WebSocket server */
  private async startWebSocketServer(): Promise<void> {
    this.httpServer = createServer((req, res) => {
      // Health check endpoint
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', agent: 'studio-agent' }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    // Critical: handle server errors so EADDRINUSE doesn't crash the host
    // process. Without this, an unhandled `'error'` event during `.listen()`
    // emits an unhandled error and Node terminates the host app — which is
    // exactly what users hit on hot-reload when the previous tsx-watched
    // process hasn't yet released the port.
    this.httpServer.on('error', (err) => {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'EADDRINUSE') {
        // Surfaced so `start()` can retry / degrade gracefully.
        return;
      }
      console.warn(
        `[studio-agent] WebSocket server error (${code ?? 'unknown'}):`,
        err.message,
      );
    });

    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.io.on('connection', (socket) => {
      // Client connected
      this.metrics.activeConnections++;

      // Send initial data
      socket.emit('message', this.createMessage('routes', this.routes));
      socket.emit('message', this.createMessage('metrics', this.getMetrics()));
      socket.emit('message', this.createMessage('runtime', this.getRuntimeInfo()));

      if (this.appStructure) {
        socket.emit('message', {
          type: 'structure',
          timestamp: Date.now(),
          data: this.appStructure,
        });
      }

      if (this.containerSnapshot) {
        socket.emit('message', {
          type: 'container',
          timestamp: Date.now(),
          data: this.containerSnapshot,
        });
      }

      // Send the in-memory database schema snapshot (when a provider is
      // registered). Always emitted so the UI can render the "not detected"
      // empty state when `available` is false.
      socket.emit('message', {
        type: 'database',
        timestamp: Date.now(),
        data: this.captureDatabaseSnapshot(),
      });

      socket.emit('message', {
        type: 'recording_state',
        timestamp: Date.now(),
        data: { enabled: this.config.enableRecording },
      });

      // Replay buffered logs so reconnecting clients catch up to the stream.
      const buffered = this.logCapture.getBuffer();
      if (buffered.length > 0) {
        socket.emit('message', {
          type: 'logs',
          timestamp: Date.now(),
          data: buffered,
        });
      }

      // Replay the latest security report so the Security view doesn't
      // sit empty until the next analyzer tick. The engine always has
      // a report (it initialises to an empty A-grade one).
      if (this.securityEngine) {
        socket.emit('message', {
          type: 'security',
          timestamp: Date.now(),
          data: this.securityEngine.getReport(),
        });
      }

      // Handle client requests
      socket.on('get_routes', () => {
        socket.emit('message', this.createMessage('routes', this.routes));
      });

      socket.on('get_metrics', () => {
        socket.emit('message', this.createMessage('metrics', this.getMetrics()));
      });

      socket.on('get_structure', () => {
        socket.emit('message', {
          type: 'structure',
          timestamp: Date.now(),
          data: this.appStructure,
        });
      });

      socket.on('get_runtime', () => {
        socket.emit(
          'message',
          this.createMessage('runtime', this.getRuntimeInfo()),
        );
      });

      socket.on('get_exchanges', (params: { limit?: number; offset?: number }) => {
        const exchanges = this.recorder.getRecentExchanges(
          params.limit || 100,
          params.offset || 0
        );
        socket.emit('message', {
          type: 'exchanges',
          timestamp: Date.now(),
          data: exchanges,
        });
      });

      socket.on('get_exchange', (params: { id: string }) => {
        const exchange = this.recorder.getExchange(params.id);
        socket.emit('message', {
          type: 'exchange',
          timestamp: Date.now(),
          data: exchange,
        });
      });

      socket.on('search_exchanges', (params: { query: string; method?: HttpMethod; limit?: number }) => {
        const exchanges = this.recorder.searchExchanges(
          params.query,
          params.method,
          params.limit || 100
        );
        socket.emit('message', {
          type: 'exchanges',
          timestamp: Date.now(),
          data: exchanges,
        });
      });

      socket.on('replay', async (params: { exchangeId: string }) => {
        await this.replayRequest(params.exchangeId, socket);
      });

      socket.on('rescan', async () => {
        await this.scanRoutes();
      });

      socket.on('clear_recordings', () => {
        this.recorder.clearAll();
        // Reset in-memory aggregates so the Metrics / Endpoint tabs reflect
        // the cleared timeline instead of showing pre-clear totals.
        this.endpointStats.clear();
        this.responseTimes = [];
        this.metrics.requestCount = 0;
        this.metrics.errorCount = 0;
        this.broadcast('cleared', { success: true });
        this.broadcast('metrics', this.getMetrics());
        this.broadcast('endpoint_stats', this.getEndpointStats());
      });

      socket.on('set_recording', (params: { enabled: boolean }) => {
        this.config.enableRecording = Boolean(params?.enabled);
        this.broadcast('recording_state', {
          enabled: this.config.enableRecording,
        });
        this.broadcast('runtime', this.getRuntimeInfo());
      });

      socket.on('get_stats', () => {
        const stats = this.recorder.getStats();
        socket.emit('message', {
          type: 'stats',
          timestamp: Date.now(),
          data: stats,
        });
      });

      socket.on('get_endpoint_stats', () => {
        socket.emit('message', {
          type: 'endpoint_stats',
          timestamp: Date.now(),
          data: this.getEndpointStats(),
        });
      });

      // Lightweight round-trip used by the UI to compute agent latency.
      // We echo the client's timestamp so the round-trip can be measured
      // without depending on agent vs. client clock drift.
      socket.on('ping_studio', (payload: { sentAt?: number } | undefined) => {
        socket.emit('message', {
          type: 'pong_studio',
          timestamp: Date.now(),
          data: { sentAt: payload?.sentAt ?? 0, agentNow: Date.now() },
        });
      });

      socket.on('get_logs', () => {
        socket.emit('message', {
          type: 'logs',
          timestamp: Date.now(),
          data: this.logCapture.getBuffer(),
        });
      });

      socket.on('clear_logs', () => {
        this.logCapture.clear();
        this.broadcast('logs_cleared', { success: true });
      });

      socket.on('get_container', () => {
        socket.emit('message', {
          type: 'container',
          timestamp: Date.now(),
          data: this.containerSnapshot,
        });
      });

      // Re-send the in-memory database schema snapshot on demand. Captured
      // fresh each call so newly created tables / records are reflected.
      socket.on('get_database_schema', () => {
        socket.emit('message', {
          type: 'database',
          timestamp: Date.now(),
          data: this.captureDatabaseSnapshot(),
        });
      });

      // Return a page of rows for a single table.
      socket.on(
        'get_database_table',
        async (params: { table?: string; offset?: number; limit?: number }) => {
          const table = typeof params?.table === 'string' ? params.table : '';
          if (!table) return;
          const offset =
            typeof params?.offset === 'number' && params.offset >= 0
              ? params.offset
              : 0;
          const limit =
            typeof params?.limit === 'number' && params.limit > 0
              ? Math.min(params.limit, 200)
              : 50;

          const data = this.databaseIntrospector
            ? await this.databaseIntrospector.getTableData(table, offset, limit)
            : { table, rows: [], total: 0, offset, limit };

          socket.emit('message', {
            type: 'database_table',
            timestamp: Date.now(),
            data,
          });
        },
      );

      // Push the latest cached report on demand. Useful when the UI
      // explicitly navigates to the Security view and wants a fresh
      // copy even if nothing has changed.
      socket.on('get_security_report', () => {
        if (!this.securityEngine) return;
        socket.emit('message', {
          type: 'security',
          timestamp: Date.now(),
          data: this.securityEngine.getReport(),
        });
      });

      // User-initiated rescan: re-run `npm audit` + OSV. The engine
      // coalesces concurrent calls, so spamming this button is safe.
      socket.on('request_security_scan', () => {
        if (!this.securityEngine) return;
        void this.securityEngine.runFullScan();
      });

      // User clicked "Apply fix" on a finding or fix group. The engine
      // spawns the npm command and streams each output line through
      // `fix_progress` so the UI can render a live transcript. When the
      // command exits the agent emits a single `fix_result`; the engine
      // also kicks off a full rescan, so the next `security` frame
      // reflects whatever actually changed.
      socket.on(
        'apply_security_fix',
        async (params: {
          targetKind?: 'finding' | 'fix-group';
          targetId?: string;
          allowMajor?: boolean;
        }) => {
          if (!this.securityEngine) return;
          if (
            !params ||
            (params.targetKind !== 'finding' && params.targetKind !== 'fix-group') ||
            typeof params.targetId !== 'string' ||
            params.targetId.length === 0
          ) {
            return;
          }
          const result = await this.securityEngine.applyFix(
            {
              targetKind: params.targetKind,
              targetId: params.targetId,
              allowMajor: Boolean(params.allowMajor),
            },
            (msg) => {
              this.broadcast('fix_progress', msg);
            },
          );
          this.broadcast('fix_result', result);
        },
      );

      socket.on('disconnect', () => {
        this.metrics.activeConnections--;
      });
    });

    await this.listenWithRetry(this.httpServer, this.config.port);
  }

  /**
   * `httpServer.listen()` that survives transient `EADDRINUSE` from
   * hot-reload races — when `tsx --watch` (or nodemon) restarts the host
   * process before the previous run has released the agent port. We
   * retry a few times with exponential-ish backoff before giving up.
   *
   * On final failure throws an `Error` whose `.code` is preserved so
   * the integration layer (`@expressots/adapter-express`) can decide
   * whether to surface it; today it just logs a warning and the host
   * app keeps running (Studio is opt-in dev tooling).
   */
  private async listenWithRetry(
    server: HttpServer,
    port: number,
    attempts = 5,
    initialDelayMs = 250,
  ): Promise<void> {
    let delay = initialDelayMs;

    for (let i = 1; i <= attempts; i++) {
      try {
        await this.listenOnce(server, port);
        return;
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code !== 'EADDRINUSE' || i === attempts) {
          throw err;
        }
        // Hot-reload race — port hasn't been released yet. Wait and retry.
        console.warn(
          `[studio-agent] Port ${port} busy (attempt ${i}/${attempts}); retrying in ${delay}ms…`,
        );
        await new Promise<void>((r) => setTimeout(r, delay));
        delay = Math.min(delay * 2, 2000);
      }
    }
  }

  /** Single attempt — resolves on `listening`, rejects on `error`. */
  private listenOnce(server: HttpServer, port: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const onError = (err: Error) => {
        server.removeListener('listening', onListening);
        reject(err);
      };
      const onListening = () => {
        server.removeListener('error', onError);
        resolve();
      };
      server.once('error', onError);
      server.once('listening', onListening);
      server.listen(port);
    });
  }

  /** Handle incoming trace */
  private handleTrace(trace: TraceInfo): void {
    // Update metrics
    this.metrics.requestCount++;
    this.responseTimes.push(trace.duration);

    // Keep only last 1000 response times for percentile calculation
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }

    // Check if error
    if (trace.rootSpan.status === 'ERROR') {
      this.metrics.errorCount++;
    }

    // Update endpoint stats
    const httpMethod = trace.rootSpan.attributes['http.method'] as string;
    const httpPath = trace.rootSpan.attributes['http.target'] as string || 
                     trace.rootSpan.attributes['http.route'] as string;
    
    if (httpMethod && httpPath) {
      const isError = trace.rootSpan.status === 'ERROR';
      this.updateEndpointStats(httpMethod as HttpMethod, httpPath, trace.duration, isError);
    }

    // Store trace
    if (this.config.enableRecording) {
      this.recorder.recordTrace(trace.traceId, trace);
    }

    // Broadcast to UI
    this.broadcast('trace', trace);
  }

  /** Update endpoint statistics */
  private updateEndpointStats(
    method: HttpMethod,
    path: string,
    duration: number,
    isError: boolean = false
  ): void {
    const key = `${method}:${path}`;
    let stats = this.endpointStats.get(key);

    if (!stats) {
      stats = {
        path,
        method,
        requestCount: 0,
        errorCount: 0,
        avgDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        p50Duration: 0,
        p95Duration: 0,
        p99Duration: 0,
        lastRequestTime: 0,
        durations: [], // Track durations for percentile calculation
      };
      this.endpointStats.set(key, stats);
    }

    stats.requestCount++;
    stats.lastRequestTime = Date.now();
    stats.minDuration = Math.min(stats.minDuration, duration);
    stats.maxDuration = Math.max(stats.maxDuration, duration);
    
    // Track errors
    if (isError) {
      stats.errorCount++;
    }
    
    // Rolling average
    stats.avgDuration =
      (stats.avgDuration * (stats.requestCount - 1) + duration) /
      stats.requestCount;
    
    // Track durations for percentile calculation (keep last 100 per endpoint)
    if (!stats.durations) {
      stats.durations = [];
    }
    stats.durations.push(duration);
    if (stats.durations.length > 100) {
      stats.durations = stats.durations.slice(-100);
    }
    
    // Calculate percentiles
    if (stats.durations.length > 0) {
      const sorted = [...stats.durations].sort((a, b) => a - b);
      const len = sorted.length;
      stats.p50Duration = sorted[Math.floor(len * 0.5)] || 0;
      stats.p95Duration = sorted[Math.floor(len * 0.95)] || 0;
      stats.p99Duration = sorted[Math.floor(len * 0.99)] || 0;
    }
  }

  /** Replay a recorded request */
  private async replayRequest(exchangeId: string, socket: any): Promise<void> {
    const exchange = this.recorder.getExchange(exchangeId);
    if (!exchange) {
      socket.emit('message', {
        type: 'replay_result',
        timestamp: Date.now(),
        data: { success: false, error: 'Exchange not found' },
      });
      return;
    }

    try {
      // The recorder stores only the request path (e.g. "/users/1"). To
      // replay we need an absolute URL — reconstruct it from the original
      // `host` header captured at record time.
      const recordedHeaders = (exchange.request.headers || {}) as Record<string, string>;
      const host = recordedHeaders['host'] || recordedHeaders['Host'] || 'localhost';
      const recordedUrl = exchange.request.url || exchange.request.path || '/';
      const targetUrl = /^https?:\/\//i.test(recordedUrl)
        ? recordedUrl
        : `http://${host}${recordedUrl.startsWith('/') ? '' : '/'}${recordedUrl}`;

      // Strip hop-by-hop and content-length headers so fetch can compute its
      // own. Also drop `host` (browsers/Node set it from the URL).
      const replayHeaders: Record<string, string> = {};
      for (const [k, v] of Object.entries(recordedHeaders)) {
        const key = k.toLowerCase();
        if (
          key === 'host' ||
          key === 'content-length' ||
          key === 'connection' ||
          key.startsWith('sec-') ||
          key === 'origin' ||
          key === 'referer'
        ) {
          continue;
        }
        replayHeaders[k] = String(v);
      }

      const replayStart = Date.now();
      const response = await fetch(targetUrl, {
        method: exchange.request.method,
        headers: replayHeaders,
        body: exchange.request.body
          ? JSON.stringify(exchange.request.body)
          : undefined,
      });

      const responseBody = await response.text();
      const replayDuration = Date.now() - replayStart;
      let parsedBody: unknown;
      try {
        parsedBody = JSON.parse(responseBody);
      } catch {
        parsedBody = responseBody;
      }

      socket.emit('message', {
        type: 'replay_result',
        timestamp: Date.now(),
        data: {
          success: true,
          original: exchange,
          replay: {
            statusCode: response.status,
            statusMessage: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: parsedBody,
            duration: replayDuration,
          },
        },
      });
    } catch (error) {
      socket.emit('message', {
        type: 'replay_result',
        timestamp: Date.now(),
        data: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  /** Broadcast message to all connected clients */
  private broadcast<T>(type: string, data: T): void {
    if (this.io) {
      this.io.emit('message', this.createMessage(type as any, data));
    }
  }

  /** Create WebSocket message */
  private createMessage<T>(type: string, data: T): WSMessage<T> {
    return {
      type: type as any,
      timestamp: Date.now(),
      data,
    };
  }

  /** Start metrics collection interval */
  private startMetricsCollection(): void {
    // Reuse an existing timer rather than stacking duplicates if the host
    // re-invokes start(); also makes idempotent restarts safe.
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }
    this.metricsTimer = setInterval(() => {
      // Calculate percentiles
      if (this.responseTimes.length > 0) {
        const sorted = [...this.responseTimes].sort((a, b) => a - b);
        const len = sorted.length;

        this.metrics.avgResponseTime =
          sorted.reduce((a, b) => a + b, 0) / len;
        this.metrics.p50ResponseTime = sorted[Math.floor(len * 0.5)] || 0;
        this.metrics.p95ResponseTime = sorted[Math.floor(len * 0.95)] || 0;
        this.metrics.p99ResponseTime = sorted[Math.floor(len * 0.99)] || 0;
      }

      // Broadcast metrics
      this.broadcast('metrics', this.getMetrics());
      // Piggyback runtime info on the metrics tick so the Status page's
      // uptime counter and memory chip stay in sync without a separate
      // timer. The payload is small (~600 B JSON) so the extra traffic is
      // negligible.
      this.broadcast('runtime', this.getRuntimeInfo());
    }, 5000);
    // Don't keep the event loop alive solely for metrics broadcasting;
    // the agent is observability infrastructure, not application logic.
    this.metricsTimer.unref?.();
  }

  /** Create Express middleware for request/response recording */
  createMiddleware() {
    return (req: any, res: any, next: any) => {
      // CORS for Studio UI: allow any localhost origin in dev so the
      // built-in API Client (served from a different localhost port)
      // can read responses and send preflighted methods.
      const origin = req.headers.origin as string | undefined;
      if (
        origin &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader(
          'Access-Control-Allow-Methods',
          'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS',
        );
        const reqHeaders = req.headers['access-control-request-headers'];
        res.setHeader(
          'Access-Control-Allow-Headers',
          reqHeaders || 'Content-Type, Authorization, X-Trace-Id',
        );
        res.setHeader('Access-Control-Max-Age', '600');

        // Short-circuit preflights so they don't pollute the request timeline
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          return res.end();
        }
      }

      if (!this.config.enableRecording) {
        return next();
      }

      const startTime = Date.now();
      const traceId = (req.headers['x-trace-id'] as string) || '';

      // Record request
      const recordedRequest = this.recorder.recordRequest(
        req.method as HttpMethod,
        req.path,
        req.originalUrl || req.url,
        req.headers,
        req.query || {},
        req.body,
        req.cookies,
        traceId,
      );

      // Capture response
      const originalEnd = res.end;
      let responseBody: any;

      res.end = function (chunk: any, ...args: any[]) {
        if (chunk) {
          responseBody = chunk.toString();
        }
        return originalEnd.apply(res, [chunk, ...args]);
      };

      // Track DI resolutions for this request (if the introspector is wired).
      // We capture the live Set reference and read it on `finish`, which fires
      // after the handler chain has fully drained.
      let resolvedRef: Set<string> | undefined;

      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const isError = res.statusCode >= 400;

        try {
          let parsedBody: unknown;
          try {
            parsedBody = responseBody ? JSON.parse(responseBody) : undefined;
          } catch {
            parsedBody = responseBody;
          }

          this.recorder.recordResponse(
            recordedRequest.id,
            res.statusCode,
            res.statusMessage || '',
            res.getHeaders() as Record<string, string>,
            parsedBody,
            duration,
            traceId,
          );

          // Update metrics
          this.metrics.requestCount++;
          if (isError) this.metrics.errorCount++;
          this.responseTimes.push(duration);
          if (this.responseTimes.length > 1000) {
            this.responseTimes = this.responseTimes.slice(-1000);
          }
          this.updateEndpointStats(
            req.method as HttpMethod,
            req.path,
            duration,
            isError,
          );

          // Emit request to UI
          this.broadcast('request', {
            request: recordedRequest,
            response: {
              statusCode: res.statusCode,
              duration,
            },
          });

          // Per-request DI resolutions (if tracked)
          if (resolvedRef && resolvedRef.size > 0) {
            this.broadcast('container_resolutions', {
              exchangeId: recordedRequest.id,
              traceId,
              method: req.method,
              path: req.path,
              resolved: Array.from(resolvedRef),
              timestamp: Date.now(),
            });
          }

          // Broadcast updated metrics immediately for real-time updates
          this.broadcast('metrics', this.getMetrics());
          this.broadcast('endpoint_stats', this.getEndpointStats());

          // New exchange = potential signal for the posture analyzer
          // (new route, new header pattern, error leakage, …). Cheap
          // to debounce; the engine collapses bursts.
          this.securityEngine?.scheduleRefresh();
        } catch (error) {
          console.error('[Studio] Error in middleware:', error);
        }
      });

      // Run the rest of the request chain inside two nested ALS scopes:
      //  - LogCapture's, so any `console.*` calls get tagged with the traceId.
      //  - ContainerIntrospector's, so any `container.get(...)` resolutions
      //    are recorded for the per-request "Resolved bindings" panel.
      const scopedTraceId = String(traceId || recordedRequest.id);
      const runner = (cb: () => void) =>
        this.logCapture.runWith(scopedTraceId, cb);

      if (this.introspector) {
        runner(() => {
          const { resolved } = this.introspector!.runWithRequest(
            scopedTraceId,
            () => {
              next();
              return undefined;
            },
          );
          resolvedRef = resolved;
        });
      } else {
        runner(() => next());
      }
    };
  }
}

export type { LogEntry };
