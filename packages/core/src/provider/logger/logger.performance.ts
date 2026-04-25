/**
 * @file logger.performance.ts
 * @description Performance metrics and timing utilities for logging
 * @module @expressots/core/provider/logger
 *
 * Features:
 * - High-resolution timer API
 * - Metrics collector for tracking multiple operations
 * - Automatic performance logging
 * - Memory and CPU usage tracking
 */

import { Logger } from "./logger.provider.js";

/**
 * Timer interface for measuring execution time.
 * @public API
 */
export interface ITimer {
  /** Label for this timer */
  readonly label: string;
  /** Start time in milliseconds (high-resolution) */
  readonly startTime: number;
  /** End the timer and log the duration */
  end(): number;
  /** Get elapsed time without ending the timer */
  elapsed(): number;
  /** Cancel the timer (don't log) */
  cancel(): void;
}

/**
 * Timer implementation using performance.now() for high-resolution timing.
 * @public API
 */
export class Timer implements ITimer {
  readonly label: string;
  readonly startTime: number;
  private readonly logger: Logger;
  private readonly logLevel: "debug" | "info" | "warn";
  private ended: boolean = false;
  private cancelled: boolean = false;

  constructor(
    label: string,
    logger: Logger,
    logLevel: "debug" | "info" | "warn" = "debug",
  ) {
    this.label = label;
    this.logger = logger;
    this.logLevel = logLevel;
    // Use performance.now() for sub-millisecond accuracy
    this.startTime = globalThis.performance.now();
  }

  /**
   * Get elapsed time in milliseconds without ending the timer.
   * @returns Elapsed time in milliseconds
   */
  elapsed(): number {
    return globalThis.performance.now() - this.startTime;
  }

  /**
   * End the timer and log the duration.
   * @returns Elapsed time in milliseconds
   */
  end(): number {
    if (this.ended || this.cancelled) {
      return this.elapsed();
    }

    this.ended = true;
    const duration = this.elapsed();

    // Log with appropriate level
    const message = `⏱️  Timer "${this.label}" completed in ${duration.toFixed(2)}ms`;
    const logData = {
      timer: this.label,
      duration: `${duration.toFixed(2)}ms`,
      durationMs: duration,
    };

    switch (this.logLevel) {
      case "info":
        this.logger.info(message, undefined, logData);
        break;
      case "warn":
        this.logger.warn(message, undefined, logData);
        break;
      case "debug":
      default:
        this.logger.debug(message, logData);
        break;
    }

    return duration;
  }

  /**
   * Cancel the timer (don't log).
   */
  cancel(): void {
    this.cancelled = true;
  }
}

/**
 * Individual metric entry for tracking operation duration.
 */
interface MetricEntry {
  label: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  count: number; // Number of times this metric was recorded
  totalDuration: number; // Cumulative duration
  minDuration: number;
  maxDuration: number;
}

/**
 * Performance metrics collector for tracking multiple operations and generating summaries.
 * @public API
 *
 * @example
 * ```typescript
 * const metrics = logger.metrics();
 * metrics.start("database-query");
 * // ... do work ...
 * metrics.end("database-query");
 *
 * metrics.start("api-call");
 * // ... do work ...
 * metrics.end("api-call");
 *
 * const summary = metrics.summary();
 * // Logs detailed breakdown with percentages
 * ```
 */
export class PerformanceMetricsCollector {
  private metrics: Map<string, MetricEntry> = new Map();
  private readonly logger: Logger;
  private readonly startTime: number;

  constructor(logger: Logger) {
    this.logger = logger;
    this.startTime = globalThis.performance.now();
  }

  /**
   * Start tracking a metric.
   * @param label - Label for this metric
   * @returns This collector for chaining
   */
  start(label: string): this {
    const existing = this.metrics.get(label);
    if (existing && !existing.endTime) {
      // Already started, don't restart
      return this;
    }

    this.metrics.set(label, {
      label,
      startTime: globalThis.performance.now(),
      count: existing?.count || 0,
      totalDuration: existing?.totalDuration || 0,
      minDuration: existing?.minDuration || Infinity,
      maxDuration: existing?.maxDuration || 0,
    });

    return this;
  }

  /**
   * End tracking a metric.
   * @param label - Label for this metric
   * @returns This collector for chaining
   */
  end(label: string): this {
    const metric = this.metrics.get(label);
    if (!metric || metric.endTime) {
      // Not started or already ended
      return this;
    }

    const endTime = globalThis.performance.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;
    metric.count = (metric.count || 0) + 1;
    metric.totalDuration = (metric.totalDuration || 0) + duration;
    metric.minDuration = Math.min(metric.minDuration, duration);
    metric.maxDuration = Math.max(metric.maxDuration, duration);

    return this;
  }

  /**
   * Get current metric value without ending it.
   * @param label - Label for this metric
   * @returns Current duration or undefined if not started
   */
  get(label: string): number | undefined {
    const metric = this.metrics.get(label);
    if (!metric || metric.endTime) {
      return undefined;
    }
    return globalThis.performance.now() - metric.startTime;
  }

  /**
   * Reset all metrics.
   */
  reset(): void {
    this.metrics.clear();
  }

  /**
   * Generate and log a summary of all metrics.
   * @param options - Summary options
   * @returns Summary object
   */
  summary(options?: {
    /** Log the summary (default: true) */
    log?: boolean;
    /** Log level (default: "info") */
    logLevel?: "debug" | "info" | "warn";
  }): {
    totalTime: number;
    metrics: Array<{
      label: string;
      count: number;
      totalDuration: number;
      averageDuration: number;
      minDuration: number;
      maxDuration: number;
      percentage: number;
    }>;
  } {
    const totalTime = globalThis.performance.now() - this.startTime;
    const completedMetrics: Array<{
      label: string;
      count: number;
      totalDuration: number;
      averageDuration: number;
      minDuration: number;
      maxDuration: number;
      percentage: number;
    }> = [];

    for (const [label, metric] of this.metrics.entries()) {
      if (metric.endTime && metric.count > 0) {
        completedMetrics.push({
          label,
          count: metric.count,
          totalDuration: metric.totalDuration,
          averageDuration: metric.totalDuration / metric.count,
          minDuration: metric.minDuration === Infinity ? 0 : metric.minDuration,
          maxDuration: metric.maxDuration,
          percentage: (metric.totalDuration / totalTime) * 100,
        });
      }
    }

    // Sort by total duration (descending)
    completedMetrics.sort((a, b) => b.totalDuration - a.totalDuration);

    const summary = {
      totalTime,
      metrics: completedMetrics,
    };

    // Log summary if requested
    if (options?.log !== false) {
      const logLevel = options?.logLevel || "info";
      const message = `📊 Performance Summary (Total: ${totalTime.toFixed(2)}ms)`;
      const logData: Record<string, unknown> = {
        totalTime: `${totalTime.toFixed(2)}ms`,
        metrics: completedMetrics.map((m) => ({
          label: m.label,
          count: m.count,
          total: `${m.totalDuration.toFixed(2)}ms`,
          average: `${m.averageDuration.toFixed(2)}ms`,
          min: `${m.minDuration.toFixed(2)}ms`,
          max: `${m.maxDuration.toFixed(2)}ms`,
          percentage: `${m.percentage.toFixed(1)}%`,
        })),
      };

      switch (logLevel) {
        case "debug":
          this.logger.debug(message, logData);
          break;
        case "warn":
          this.logger.warn(message, undefined, logData);
          break;
        case "info":
        default:
          this.logger.info(message, undefined, logData);
          break;
      }
    }

    return summary;
  }

  /**
   * Get all metrics as a map.
   * @returns Map of label to metric entry
   */
  getAll(): Map<string, MetricEntry> {
    return new Map(this.metrics);
  }
}

/**
 * Performance measurement result.
 * @public API
 */
export interface PerformanceResult {
  /** Duration in milliseconds */
  duration: number;
  /** Memory delta in bytes */
  memoryDelta: number;
  /** CPU usage percentage (if available) */
  cpuUsage?: number;
}

/**
 * Measure performance of a function execution.
 * @param fn - Function to measure
 * @param label - Label for this measurement
 * @param logger - Logger instance
 * @returns Performance result
 * @public API
 */
export async function measurePerformance<T>(
  fn: () => T | Promise<T>,
  label: string,
  logger: Logger,
): Promise<{ result: T; performance: PerformanceResult }> {
  const startMemory = process.memoryUsage().heapUsed;
  const startTime = globalThis.performance.now();
  const startCpu = process.cpuUsage();

  const result = await fn();

  const endTime = globalThis.performance.now();
  const endMemory = process.memoryUsage().heapUsed;
  const endCpu = process.cpuUsage();

  const duration = endTime - startTime;
  const memoryDelta = endMemory - startMemory;
  const cpuDelta = {
    user: endCpu.user - startCpu.user,
    system: endCpu.system - startCpu.system,
  };
  const cpuUsage = ((cpuDelta.user + cpuDelta.system) / 1000 / duration) * 100; // Convert to percentage

  const performance: PerformanceResult = {
    duration,
    memoryDelta,
    cpuUsage: isNaN(cpuUsage) ? undefined : cpuUsage,
  };

  logger.debug(`⏱️  "${label}" took ${duration.toFixed(2)}ms`, {
    label,
    duration: `${duration.toFixed(2)}ms`,
    memoryDelta: `${(memoryDelta / 1024).toFixed(1)}KB`,
    cpuUsage: cpuUsage ? `${cpuUsage.toFixed(1)}%` : undefined,
  });

  return { result, performance };
}

/**
 * Synchronous version of measurePerformance.
 * @param fn - Function to measure
 * @param label - Label for this measurement
 * @param logger - Logger instance
 * @returns Performance result
 * @public API
 */
export function measurePerformanceSync<T>(
  fn: () => T,
  label: string,
  logger: Logger,
): { result: T; performance: PerformanceResult } {
  const startMemory = process.memoryUsage().heapUsed;
  const startTime = globalThis.performance.now();
  const startCpu = process.cpuUsage();

  const result = fn();

  const endTime = globalThis.performance.now();
  const endMemory = process.memoryUsage().heapUsed;
  const endCpu = process.cpuUsage();

  const duration = endTime - startTime;
  const memoryDelta = endMemory - startMemory;
  const cpuDelta = {
    user: endCpu.user - startCpu.user,
    system: endCpu.system - startCpu.system,
  };
  const cpuUsage = ((cpuDelta.user + cpuDelta.system) / 1000 / duration) * 100;

  const performance: PerformanceResult = {
    duration,
    memoryDelta,
    cpuUsage: isNaN(cpuUsage) ? undefined : cpuUsage,
  };

  logger.debug(`⏱️  "${label}" took ${duration.toFixed(2)}ms`, {
    label,
    duration: `${duration.toFixed(2)}ms`,
    memoryDelta: `${(memoryDelta / 1024).toFixed(1)}KB`,
    cpuUsage: cpuUsage ? `${cpuUsage.toFixed(1)}%` : undefined,
  });

  return { result, performance };
}
