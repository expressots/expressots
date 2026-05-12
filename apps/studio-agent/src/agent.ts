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
import { LogCapture, type LogEntry } from './logging/log-capture.js';
import * as fs from 'node:fs';
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
  private logCapture: LogCapture;
  private io: SocketIOServer | null = null;
  private httpServer: HttpServer | null = null;
  private routes: RouteInfo[] = [];
  private appStructure: AppStructure | null = null;
  private metrics: AppMetrics;
  private endpointStats: Map<string, EndpointStats> = new Map();
  private responseTimes: number[] = [];
  private startTime: number = Date.now();
  private isRunning: boolean = false;

  constructor(config: Partial<AgentConfig> = {}) {
    this.config = {
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

    // Initialize recorder
    if (this.config.enableRecording) {
      await this.recorder.initialize();
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
    this.logCapture.onLog((entry) => this.broadcast('log', entry));

    this.isRunning = true;
  }

  /** Get the captured container snapshot (or null if unavailable). */
  getContainerSnapshot(): ContainerSnapshot | null {
    return this.containerSnapshot;
  }

  /** Stop the Studio Agent */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    // Close WebSocket server. We must actually wait for the underlying
    // HTTP server to release the port — without this the next hot-reload
    // start can hit `EADDRINUSE` because the previous process is still
    // holding the socket while open WebSocket connections drain.
    if (this.io) {
      await new Promise<void>((resolve) => {
        this.io!.close(() => resolve());
      });
      this.io = null;
    }

    if (this.httpServer) {
      const server = this.httpServer;
      // Force-close any lingering keep-alive / WebSocket sockets so
      // `server.close()` resolves promptly instead of waiting for the
      // OS-level read timeout.
      try {
        // Available since Node 18.2 — older Node falls back to plain close.
        (server as unknown as { closeAllConnections?: () => void })
          .closeAllConnections?.();
      } catch {
        // best-effort
      }
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
      this.httpServer = null;
    }

    // Stop tracer
    await this.tracer.stop();

    // Close recorder
    this.recorder.close();

    // Restore original console.* so the host process logs untouched.
    this.logCapture.uninstall();

    this.isRunning = false;
  }

  /** Scan application for routes */
  async scanRoutes(): Promise<void> {
    try {
      this.appStructure = await this.scanner.scan();
      this.routes = this.scanner.getRoutes();
      // Route counts available via getRoutes()

      // If Express app is provided, also scan runtime routes
      if (this.config.expressApp) {
        const runtimeRoutes = RouteScanner.scanExpressApp(this.config.expressApp);
        // Merge runtime routes with discovered routes
        
        // Merge with discovered routes
        for (const runtimeRoute of runtimeRoutes) {
          const exists = this.routes.some(
            (r) => r.path === runtimeRoute.path && r.method === runtimeRoute.method
          );
          if (!exists) {
            this.routes.push(runtimeRoute);
          }
        }
      }

      // Broadcast to connected clients
      this.broadcast('routes', this.routes);
    } catch (error) {
      console.error('Failed to scan routes:', error);
    }
  }

  /** Get discovered routes */
  getRoutes(): RouteInfo[] {
    return this.routes;
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
  }): void {
    if (patch.appPort !== undefined) this.config.appPort = patch.appPort;
    if (patch.globalPrefix !== undefined) this.config.globalPrefix = patch.globalPrefix;
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
      // Merge so partial updates (e.g. providers only) don't wipe the
      // other categories.
      this.config.runtimeItems = {
        ...this.config.runtimeItems,
        ...patch.runtimeItems,
      };
    }
    if (this.io) {
      this.broadcast('runtime', this.getRuntimeInfo());
    }
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
    setInterval(() => {
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
