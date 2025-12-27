import { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Performance metrics for a single middleware.
 * @public API
 */
export interface MiddlewareMetrics {
  /** Middleware name */
  name: string;
  /** Average execution time in milliseconds */
  avgExecutionMs: number;
  /** Minimum execution time in milliseconds */
  minExecutionMs: number;
  /** Maximum execution time in milliseconds */
  maxExecutionMs: number;
  /** 50th percentile (median) execution time */
  p50ExecutionMs: number;
  /** 95th percentile execution time */
  p95ExecutionMs: number;
  /** 99th percentile execution time */
  p99ExecutionMs: number;
  /** Total number of executions */
  totalCalls: number;
  /** Number of errors encountered */
  errors: number;
  /** Last execution timestamp */
  lastExecutionAt: Date | null;
}

/**
 * Aggregated profiler statistics.
 * @public API
 */
export interface ProfilerStats {
  /** Total middleware tracked */
  totalMiddleware: number;
  /** Total requests processed */
  totalRequests: number;
  /** Average total pipeline execution time */
  avgPipelineMs: number;
  /** Slowest middleware by average time */
  slowestMiddleware: string | null;
  /** Fastest middleware by average time */
  fastestMiddleware: string | null;
  /** Individual middleware metrics */
  metrics: Array<MiddlewareMetrics>;
}

/**
 * Internal timing data structure.
 * @internal
 */
interface TimingEntry {
  times: Array<number>;
  errors: number;
  lastExecution: Date | null;
  maxSamples: number;
}

/**
 * Middleware Profiler - Track execution time and performance of middleware.
 *
 * Provides detailed metrics including:
 * - Average, min, max execution times
 * - Percentile calculations (p50, p95, p99)
 * - Error tracking
 * - Pipeline-level statistics
 *
 * @example
 * ```typescript
 * const profiler = new MiddlewareProfiler();
 *
 * // Wrap middleware for profiling
 * app.use(profiler.wrap("cors", corsMiddleware));
 * app.use(profiler.wrap("helmet", helmetMiddleware));
 *
 * // Get metrics
 * const stats = profiler.getStats();
 * console.log(stats.metrics);
 * ```
 *
 * @public API
 */
export class MiddlewareProfiler {
  private timings = new Map<string, TimingEntry>();
  private pipelineTimes: Array<number> = [];
  private totalRequests = 0;
  private enabled = true;
  private maxSamples: number;

  /**
   * Create a new MiddlewareProfiler.
   *
   * @param options - Profiler configuration options
   * @param options.maxSamples - Maximum number of timing samples to keep per middleware (default: 1000)
   * @param options.enabled - Whether profiling is enabled (default: true)
   */
  constructor(
    options: {
      maxSamples?: number;
      enabled?: boolean;
    } = {},
  ) {
    this.maxSamples = options.maxSamples ?? 1000;
    this.enabled = options.enabled ?? true;
  }

  /**
   * Enable or disable profiling.
   *
   * @param enabled - Whether to enable profiling
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if profiling is enabled.
   *
   * @returns True if profiling is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Wrap a middleware for profiling.
   *
   * @param name - Name to identify this middleware in metrics
   * @param handler - The middleware handler to wrap
   * @returns Wrapped middleware handler
   *
   * @example
   * ```typescript
   * const profiler = new MiddlewareProfiler();
   * app.use(profiler.wrap("auth", authMiddleware));
   * ```
   */
  wrap(name: string, handler: RequestHandler): RequestHandler {
    // Initialize timing entry if not exists
    if (!this.timings.has(name)) {
      this.timings.set(name, {
        times: [],
        errors: 0,
        lastExecution: null,
        maxSamples: this.maxSamples,
      });
    }

    return (req: Request, res: Response, next: NextFunction): void => {
      if (!this.enabled) {
        handler(req, res, next);
        return;
      }

      const start = performance.now();
      const entry = this.timings.get(name)!;

      const recordTiming = (hadError: boolean): void => {
        const duration = performance.now() - start;
        entry.times.push(duration);
        entry.lastExecution = new Date();

        // Keep only the last N samples
        if (entry.times.length > entry.maxSamples) {
          entry.times.shift();
        }

        if (hadError) {
          entry.errors++;
        }
      };

      const wrappedNext: NextFunction = (err?: unknown): void => {
        recordTiming(!!err);
        next(err);
      };

      try {
        const result = handler(req, res, wrappedNext) as unknown;

        // Handle async middleware (middleware that returns a Promise)
        if (
          result !== null &&
          result !== undefined &&
          typeof (result as Promise<void>).then === "function"
        ) {
          (result as Promise<void>).catch((err) => {
            recordTiming(true);
            next(err);
          });
        }
      } catch (err) {
        recordTiming(true);
        next(err);
      }
    };
  }

  /**
   * Create a pipeline timing middleware.
   * Place at the start of your middleware chain to measure total pipeline time.
   *
   * @returns Middleware that tracks total request time
   *
   * @example
   * ```typescript
   * app.use(profiler.pipelineTimer());
   * // ... other middleware
   * ```
   */
  pipelineTimer(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!this.enabled) {
        next();
        return;
      }

      const start = performance.now();
      this.totalRequests++;

      res.on("finish", () => {
        const duration = performance.now() - start;
        this.pipelineTimes.push(duration);

        // Keep only the last N samples
        if (this.pipelineTimes.length > this.maxSamples) {
          this.pipelineTimes.shift();
        }
      });

      next();
    };
  }

  /**
   * Calculate percentile from an array of numbers.
   *
   * @param arr - Array of numbers
   * @param percentile - Percentile to calculate (0-100)
   * @returns The percentile value
   * @internal
   */
  private percentile(arr: Array<number>, percentile: number): number {
    if (arr.length === 0) return 0;

    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get metrics for a specific middleware.
   *
   * @param name - The middleware name
   * @returns Metrics for the middleware or null if not found
   */
  getMetricsFor(name: string): MiddlewareMetrics | null {
    const entry = this.timings.get(name);
    if (!entry || entry.times.length === 0) {
      return null;
    }

    const times = entry.times;
    const sum = times.reduce((a, b) => a + b, 0);

    return {
      name,
      avgExecutionMs: sum / times.length,
      minExecutionMs: Math.min(...times),
      maxExecutionMs: Math.max(...times),
      p50ExecutionMs: this.percentile(times, 50),
      p95ExecutionMs: this.percentile(times, 95),
      p99ExecutionMs: this.percentile(times, 99),
      totalCalls: times.length,
      errors: entry.errors,
      lastExecutionAt: entry.lastExecution,
    };
  }

  /**
   * Get all middleware metrics.
   *
   * @returns Array of all middleware metrics
   */
  getAllMetrics(): Array<MiddlewareMetrics> {
    const metrics: Array<MiddlewareMetrics> = [];

    for (const name of this.timings.keys()) {
      const metric = this.getMetricsFor(name);
      if (metric) {
        metrics.push(metric);
      }
    }

    return metrics.sort((a, b) => b.avgExecutionMs - a.avgExecutionMs);
  }

  /**
   * Get aggregated profiler statistics.
   *
   * @returns Aggregated statistics including all middleware metrics
   */
  getStats(): ProfilerStats {
    const metrics = this.getAllMetrics();
    const avgPipeline =
      this.pipelineTimes.length > 0
        ? this.pipelineTimes.reduce((a, b) => a + b, 0) /
          this.pipelineTimes.length
        : 0;

    const slowest = metrics.length > 0 ? metrics[0].name : null;
    const fastest =
      metrics.length > 0 ? metrics[metrics.length - 1].name : null;

    return {
      totalMiddleware: metrics.length,
      totalRequests: this.totalRequests,
      avgPipelineMs: avgPipeline,
      slowestMiddleware: slowest,
      fastestMiddleware: fastest,
      metrics,
    };
  }

  /**
   * Get a formatted text report of all metrics.
   *
   * @returns Formatted string report
   */
  getReport(): string {
    const stats = this.getStats();
    const lines: Array<string> = [
      "╔══════════════════════════════════════════════════════════════════╗",
      "║                    MIDDLEWARE PROFILER REPORT                    ║",
      "╠══════════════════════════════════════════════════════════════════╣",
      `║ Total Requests: ${stats.totalRequests.toString().padEnd(49)}║`,
      `║ Avg Pipeline:   ${stats.avgPipelineMs.toFixed(2).padEnd(46)}ms ║`,
      `║ Slowest:        ${(stats.slowestMiddleware ?? "N/A").padEnd(49)}║`,
      `║ Fastest:        ${(stats.fastestMiddleware ?? "N/A").padEnd(49)}║`,
      "╠══════════════════════════════════════════════════════════════════╣",
      "║ MIDDLEWARE                  AVG      P95      P99    CALLS  ERR ║",
      "╠══════════════════════════════════════════════════════════════════╣",
    ];

    for (const m of stats.metrics) {
      const name = m.name.substring(0, 24).padEnd(24);
      const avg = m.avgExecutionMs.toFixed(2).padStart(7);
      const p95 = m.p95ExecutionMs.toFixed(2).padStart(7);
      const p99 = m.p99ExecutionMs.toFixed(2).padStart(7);
      const calls = m.totalCalls.toString().padStart(7);
      const errors = m.errors.toString().padStart(4);
      lines.push(`║ ${name} ${avg}ms ${p95}ms ${p99}ms ${calls} ${errors} ║`);
    }

    lines.push(
      "╚══════════════════════════════════════════════════════════════════╝",
    );

    return lines.join("\n");
  }

  /**
   * Reset all collected metrics.
   */
  reset(): void {
    this.timings.clear();
    this.pipelineTimes = [];
    this.totalRequests = 0;
  }

  /**
   * Get metrics as JSON for API responses.
   *
   * @returns JSON-serializable metrics object
   */
  toJSON(): ProfilerStats {
    return this.getStats();
  }
}

