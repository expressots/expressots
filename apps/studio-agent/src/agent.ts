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
import type {
  AgentConfig,
  RouteInfo,
  TraceInfo,
  AppStructure,
  AppMetrics,
  EndpointStats,
  WSMessage,
  HttpMethod,
} from './types/index.js';

export class StudioAgent {
  private config: AgentConfig;
  private tracer: StudioTracer;
  private scanner: RouteScanner;
  private recorder: RequestRecorder;
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
    };

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

    // Start WebSocket server
    await this.startWebSocketServer();

    // Start metrics collection
    this.startMetricsCollection();

    this.isRunning = true;
  }

  /** Stop the Studio Agent */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    // Close WebSocket server
    if (this.io) {
      this.io.close();
      this.io = null;
    }

    if (this.httpServer) {
      this.httpServer.close();
      this.httpServer = null;
    }

    // Stop tracer
    await this.tracer.stop();

    // Close recorder
    this.recorder.close();

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
      
      if (this.appStructure) {
        socket.emit('message', {
          type: 'structure',
          timestamp: Date.now(),
          data: this.appStructure,
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
        socket.emit('message', {
          type: 'cleared',
          timestamp: Date.now(),
          data: { success: true },
        });
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

      socket.on('disconnect', () => {
        this.metrics.activeConnections--;
      });
    });

    return new Promise((resolve) => {
      this.httpServer!.listen(this.config.port, () => {
        resolve();
      });
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
      const traceId = req.headers['x-trace-id'] || '';

      // Record request
      const recordedRequest = this.recorder.recordRequest(
        req.method as HttpMethod,
        req.path,
        req.originalUrl || req.url,
        req.headers,
        req.query || {},
        req.body,
        req.cookies,
        traceId
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
            traceId
          );

          // ========================================
          // UPDATE METRICS FROM MIDDLEWARE
          // ========================================
          
          // Update request count
          this.metrics.requestCount++;
          
          // Update error count
          if (isError) {
            this.metrics.errorCount++;
          }
          
          // Track response time for percentile calculation
          this.responseTimes.push(duration);
          if (this.responseTimes.length > 1000) {
            this.responseTimes = this.responseTimes.slice(-1000);
          }
          
          // Update endpoint stats
          this.updateEndpointStats(
            req.method as HttpMethod,
            req.path,
            duration,
            isError
          );

          // Emit request to UI
          this.broadcast('request', {
            request: recordedRequest,
            response: {
              statusCode: res.statusCode,
              duration,
            },
          });
          
          // Broadcast updated metrics immediately for real-time updates
          this.broadcast('metrics', this.getMetrics());
          this.broadcast('endpoint_stats', this.getEndpointStats());
          
        } catch (error) {
          console.error('[Studio] Error in middleware:', error);
        }
      });

      next();
    };
  }
}
