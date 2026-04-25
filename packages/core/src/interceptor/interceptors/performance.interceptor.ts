import { inject, injectable } from "../../di/inversify.js";
import { Logger } from "../../provider/logger/logger.provider.js";
import type {
  IInterceptor,
  ExecutionContext,
  CallHandler,
} from "../interceptor.interface.js";
import { Interceptor } from "../interceptor-decorators.js";

/**
 * Performance metrics for a single endpoint
 */
export interface EndpointMetrics {
  /**
   * Average response time in milliseconds
   */
  avgTime: number;

  /**
   * Maximum response time in milliseconds
   */
  maxTime: number;

  /**
   * Minimum response time in milliseconds
   */
  minTime: number;

  /**
   * Total number of calls
   */
  callCount: number;

  /**
   * Number of calls that exceeded slow threshold
   */
  slowCalls: number;

  /**
   * Last response time in milliseconds
   */
  lastTime: number;

  /**
   * Last call timestamp
   */
  lastCall: Date;
}

/**
 * All performance metrics keyed by endpoint
 */
export type PerformanceMetrics = Record<string, EndpointMetrics>;

/**
 * Configuration options for PerformanceInterceptor
 */
export interface PerformanceInterceptorOptions {
  /**
   * Threshold in milliseconds above which a call is considered slow
   * @default 1000
   */
  slowThreshold?: number;

  /**
   * Whether to log slow calls automatically
   * @default true
   */
  logSlowCalls?: boolean;

  /**
   * Whether to log all calls (verbose mode)
   * @default false
   */
  logAllCalls?: boolean;
}

/**
 * Service for managing performance metrics.
 *
 * @layer public
 * @audience application-developers
 * @concept performance-service
 *
 * @summary Quick Start
 * Inject PerformanceInterceptorService to access performance metrics.
 *
 * @example
 * ```typescript
 * @controller("/admin")
 * export class AdminController {
 *   constructor(private perfService: PerformanceInterceptorService) {}
 *
 *   @Get("/metrics")
 *   getMetrics() {
 *     return this.perfService.getMetrics();
 *   }
 *
 *   @Get("/slow-endpoints")
 *   getSlowEndpoints() {
 *     return this.perfService.getSlowEndpoints();
 *   }
 * }
 * ```
 *
 * @public API
 */
@injectable()
export class PerformanceInterceptorService {
  private metrics: PerformanceMetrics = {};
  private slowThreshold: number;
  private logSlowCalls: boolean;
  private logAllCalls: boolean;

  constructor() {
    this.slowThreshold = 1000; // Default 1 second
    this.logSlowCalls = true;
    this.logAllCalls = false;
  }

  /**
   * Configure performance interceptor options
   */
  configure(options: PerformanceInterceptorOptions): void {
    if (options.slowThreshold !== undefined) {
      this.slowThreshold = options.slowThreshold;
    }
    if (options.logSlowCalls !== undefined) {
      this.logSlowCalls = options.logSlowCalls;
    }
    if (options.logAllCalls !== undefined) {
      this.logAllCalls = options.logAllCalls;
    }
  }

  /**
   * Record a call for an endpoint
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  recordCall(key: string, duration: number, _isError: boolean): void {
    if (!this.metrics[key]) {
      this.metrics[key] = {
        avgTime: duration,
        maxTime: duration,
        minTime: duration,
        callCount: 1,
        slowCalls: duration > this.slowThreshold ? 1 : 0,
        lastTime: duration,
        lastCall: new Date(),
      };
    } else {
      const m = this.metrics[key];
      const totalTime = m.avgTime * m.callCount + duration;
      m.callCount++;
      m.avgTime = totalTime / m.callCount;
      m.maxTime = Math.max(m.maxTime, duration);
      m.minTime = Math.min(m.minTime, duration);
      m.lastTime = duration;
      m.lastCall = new Date();
      if (duration > this.slowThreshold) {
        m.slowCalls++;
      }
    }
  }

  /**
   * Check if a duration is considered slow
   */
  isSlowCall(duration: number): boolean {
    return duration > this.slowThreshold;
  }

  /**
   * Get slow threshold
   */
  getSlowThreshold(): number {
    return this.slowThreshold;
  }

  /**
   * Get all performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get metrics for a specific endpoint
   */
  getEndpointMetrics(key: string): EndpointMetrics | undefined {
    return this.metrics[key];
  }

  /**
   * Get all endpoints that have had slow calls
   */
  getSlowEndpoints(): Array<{ endpoint: string; metrics: EndpointMetrics }> {
    return Object.entries(this.metrics)
      .filter(([, m]) => m.slowCalls > 0)
      .map(([endpoint, metrics]) => ({ endpoint, metrics }))
      .sort((a, b) => b.metrics.slowCalls - a.metrics.slowCalls);
  }

  /**
   * Get endpoints sorted by average response time (slowest first)
   */
  getSlowestEndpoints(
    limit = 10,
  ): Array<{ endpoint: string; avgTime: number }> {
    return Object.entries(this.metrics)
      .map(([endpoint, m]) => ({ endpoint, avgTime: m.avgTime }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, limit);
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = {};
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalEndpoints: number;
    totalCalls: number;
    avgResponseTime: number;
    slowEndpoints: number;
  } {
    const endpoints = Object.values(this.metrics);
    const totalCalls = endpoints.reduce((sum, m) => sum + m.callCount, 0);
    const totalTime = endpoints.reduce(
      (sum, m) => sum + m.avgTime * m.callCount,
      0,
    );
    const slowEndpoints = endpoints.filter((m) => m.slowCalls > 0).length;

    return {
      totalEndpoints: endpoints.length,
      totalCalls,
      avgResponseTime: totalCalls > 0 ? totalTime / totalCalls : 0,
      slowEndpoints,
    };
  }
}

/**
 * Built-in performance interceptor with automatic profiling.
 *
 * @layer public
 * @audience application-developers
 * @concept performance-interceptor
 * @difficulty beginner
 *
 * @summary Quick Start
 * Use PerformanceInterceptor to automatically track execution time and
 * identify slow endpoints.
 *
 * @example
 * ```typescript
 * // Apply to individual endpoints
 * @Get("/slow-endpoint")
 * @UseInterceptors(PerformanceInterceptor)
 * getSlowData() {
 *   // Automatically tracked
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Apply to entire controller
 * @UseInterceptors(PerformanceInterceptor)
 * @controller("/api")
 * export class ApiController {
 *   // All methods tracked
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Access metrics
 * const perfService = container.get(PerformanceInterceptorService);
 * const metrics = perfService.getMetrics();
 * console.log(metrics["/api/users"]);
 * // { avgTime: 123, maxTime: 456, minTime: 45, callCount: 100, slowCalls: 5 }
 * ```
 *
 * @public API
 */
@Interceptor({ priority: 1 }) // Run first (outermost) to capture total time
@injectable()
export class PerformanceInterceptor implements IInterceptor {
  readonly priority = 1;

  constructor(
    @inject(Logger) private logger: Logger,
    @inject(PerformanceInterceptorService)
    private metricsService: PerformanceInterceptorService,
  ) {}

  async intercept<T>(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Promise<T> {
    const request = context.getRequest();
    const method = request.method;
    const path = request.path;
    const key = `${method} ${path}`;

    const startTime = Date.now();

    try {
      const result = await next.handle();
      const duration = Date.now() - startTime;

      // Record metrics
      this.metricsService.recordCall(key, duration, false);

      // Log slow calls
      if (this.metricsService.isSlowCall(duration)) {
        this.logger.warn(
          `⚠️ Slow endpoint: ${key} took ${duration}ms (threshold: ${this.metricsService.getSlowThreshold()}ms)`,
          "performance-interceptor",
        );
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsService.recordCall(key, duration, true);
      throw error;
    }
  }
}
