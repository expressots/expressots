/**
 * LazyLoadMetrics Implementation
 *
 * Usage analytics and recommendations for lazy loading optimization.
 *
 * @module lazy-loading
 */

import { injectable, inject } from "../di/inversify";
import {
  ILazyLoadMetrics,
  ModuleRecommendation,
  ApplyRecommendationsOptions,
} from "./lazy.interfaces";
import { LazyModuleLoader } from "./lazy-module-loader";

// ============================================================================
// Metric Types
// ============================================================================

/**
 * Recorded access event.
 * @internal
 */
interface AccessRecord {
  moduleName: string;
  timestamp: number;
  timeSinceStartup: number;
}

/**
 * Module metrics data.
 * @internal
 */
interface ModuleMetrics {
  moduleName: string;
  accessCount: number;
  firstAccessTime: number | null;
  avgTimeSinceStartup: number;
  loadTime: number | null;
  isLazy: boolean;
}

// ============================================================================
// Lazy Load Metrics
// ============================================================================

/**
 * Usage analytics and recommendations for lazy loading.
 *
 * @layer public
 * @audience application-developers
 * @concept lazy-loading
 *
 * UNIQUE: Framework tracks module load times and provides actionable
 * recommendations based on actual usage patterns.
 *
 * @example
 * ```typescript
 * const metrics = container.get(LazyLoadMetrics);
 *
 * // Get recommendations for all modules
 * const recommendations = metrics.getRecommendations();
 * console.log(recommendations);
 *
 * // Apply recommendations automatically
 * await metrics.applyRecommendations({
 *   autoOptimize: true,
 *   maxStartupTime: 1000 // Max 1s startup
 * });
 *
 * // Export metrics for analysis
 * const json = metrics.export();
 * ```
 *
 * @public API
 */
@injectable()
export class LazyLoadMetrics implements ILazyLoadMetrics {
  private readonly startupTime: number = Date.now();
  private readonly accessRecords: Array<AccessRecord> = [];
  private readonly loadTimes: Map<string, number> = new Map();
  private startupTimeSaved: number = 0;

  constructor(
    @inject(LazyModuleLoader) private readonly loader: LazyModuleLoader,
  ) {}

  // ============================================================================
  // Recording
  // ============================================================================

  /**
   * Record a module access event.
   *
   * @param moduleName - Name of the accessed module
   *
   * @internal Called automatically by the framework
   */
  recordAccess(moduleName: string): void {
    const now = Date.now();
    this.accessRecords.push({
      moduleName,
      timestamp: now,
      timeSinceStartup: now - this.startupTime,
    });
  }

  /**
   * Record module load time.
   *
   * @param moduleName - Name of the module
   * @param timeMs - Time taken to load (ms)
   *
   * @internal Called automatically by the framework
   */
  recordLoadTime(moduleName: string, timeMs: number): void {
    this.loadTimes.set(moduleName, timeMs);
  }

  // ============================================================================
  // Recommendations
  // ============================================================================

  /**
   * Get recommendations for all modules.
   *
   * @returns Object mapping module names to recommendations
   *
   * @example
   * ```typescript
   * const recommendations = metrics.getRecommendations();
   * // {
   * //   "AdminModule": {
   * //     currentStrategy: "lazy",
   * //     loadTime: "234ms",
   * //     suggestion: "Keep lazy - rarely accessed early",
   * //     ...
   * //   }
   * // }
   * ```
   */
  getRecommendations(): Record<string, ModuleRecommendation> {
    const recommendations: Record<string, ModuleRecommendation> = {};
    const moduleMetrics = this.calculateModuleMetrics();

    for (const metrics of moduleMetrics) {
      recommendations[metrics.moduleName] =
        this.generateRecommendation(metrics);
    }

    return recommendations;
  }

  /**
   * Get recommendation for a specific module.
   *
   * @param moduleName - Name of the module
   * @returns Recommendation or undefined if module not found
   */
  getRecommendation(moduleName: string): ModuleRecommendation | undefined {
    const recommendations = this.getRecommendations();
    return recommendations[moduleName];
  }

  /**
   * Apply recommendations.
   *
   * @param options - Options for applying recommendations
   *
   * @example
   * ```typescript
   * await metrics.applyRecommendations({
   *   autoOptimize: true,
   *   maxStartupTime: 1000
   * });
   * ```
   */
  async applyRecommendations(
    options: ApplyRecommendationsOptions,
  ): Promise<void> {
    if (!options.autoOptimize) {
      return;
    }

    const recommendations = this.getRecommendations();
    const maxStartup = options.maxStartupTime ?? 2000;

    // Find modules that should be preloaded based on access patterns
    const modulesToPreload: Array<string> = [];
    let estimatedStartupTime = 0;

    for (const [moduleName, rec] of Object.entries(recommendations)) {
      if (
        rec.currentStrategy === "lazy" &&
        rec.suggestion.includes("preloading")
      ) {
        const loadTimeMs = parseInt(rec.loadTime) || 0;

        if (estimatedStartupTime + loadTimeMs <= maxStartup) {
          modulesToPreload.push(moduleName);
          estimatedStartupTime += loadTimeMs;
        }
      }
    }

    // Preload recommended modules
    if (modulesToPreload.length > 0) {
      console.log(
        `[LazyLoadMetrics] Auto-optimizing: preloading ${modulesToPreload.length} modules`,
      );

      for (const moduleName of modulesToPreload) {
        try {
          await this.loader.load(moduleName);
        } catch (error) {
          console.warn(
            `[LazyLoadMetrics] Failed to preload '${moduleName}':`,
            error,
          );
        }
      }
    }
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get total startup time saved by lazy loading.
   *
   * @returns Time saved in milliseconds
   */
  getStartupTimeSaved(): number {
    // Calculate based on load times of modules that weren't loaded at startup
    const pendingModules = this.loader.getByStatus("pending");
    let totalSaved = 0;

    for (const module of pendingModules) {
      const loadTime = this.loadTimes.get(module.name);
      if (loadTime) {
        totalSaved += loadTime;
      } else {
        // Estimate based on average
        totalSaved += 100; // Default estimate
      }
    }

    return totalSaved + this.startupTimeSaved;
  }

  /**
   * Reset all metrics.
   */
  reset(): void {
    this.accessRecords.length = 0;
    this.loadTimes.clear();
    this.startupTimeSaved = 0;
  }

  /**
   * Export metrics as JSON.
   *
   * @returns JSON string of all metrics
   */
  export(): string {
    const moduleMetrics = this.calculateModuleMetrics();
    const recommendations = this.getRecommendations();

    return JSON.stringify(
      {
        startupTime: this.startupTime,
        currentTime: Date.now(),
        uptimeMs: Date.now() - this.startupTime,
        startupTimeSaved: this.getStartupTimeSaved(),
        totalAccessRecords: this.accessRecords.length,
        modules: moduleMetrics,
        recommendations,
      },
      null,
      2,
    );
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Calculate metrics for each module.
   * @private
   */
  private calculateModuleMetrics(): Array<ModuleMetrics> {
    const allModules = this.loader.getAll();
    const metricsMap = new Map<string, ModuleMetrics>();

    // Initialize metrics for all modules
    for (const module of allModules) {
      metricsMap.set(module.name, {
        moduleName: module.name,
        accessCount: 0,
        firstAccessTime: null,
        avgTimeSinceStartup: 0,
        loadTime: module.loadTime,
        isLazy: module.config.preloadHint !== "high",
      });
    }

    // Process access records
    for (const record of this.accessRecords) {
      const metrics = metricsMap.get(record.moduleName);
      if (metrics) {
        metrics.accessCount++;
        if (metrics.firstAccessTime === null) {
          metrics.firstAccessTime = record.timeSinceStartup;
        }
        metrics.avgTimeSinceStartup =
          (metrics.avgTimeSinceStartup * (metrics.accessCount - 1) +
            record.timeSinceStartup) /
          metrics.accessCount;
      }
    }

    return Array.from(metricsMap.values());
  }

  /**
   * Generate recommendation for a module.
   * @private
   */
  private generateRecommendation(metrics: ModuleMetrics): ModuleRecommendation {
    const loadTimeMs = metrics.loadTime ?? 100; // Default estimate
    const loadTimeStr = `${loadTimeMs}ms`;
    const currentStrategy = metrics.isLazy ? "lazy" : "eager";

    // Determine access frequency description
    let accessFrequency: string;
    if (metrics.accessCount === 0) {
      accessFrequency = "Never accessed";
    } else if (
      metrics.firstAccessTime !== null &&
      metrics.firstAccessTime < 5000
    ) {
      const percentage = Math.round(
        (metrics.accessCount / Math.max(this.accessRecords.length, 1)) * 100,
      );
      accessFrequency = `${percentage}% within 5s of startup`;
    } else if (
      metrics.firstAccessTime !== null &&
      metrics.firstAccessTime < 60000
    ) {
      accessFrequency = "Accessed within first minute";
    } else {
      accessFrequency = "Rarely accessed early";
    }

    // Generate suggestion
    let suggestion: string;
    let estimatedSavings: string;

    if (currentStrategy === "lazy") {
      if (metrics.accessCount === 0) {
        suggestion = "Keep lazy - never accessed";
        estimatedSavings = `+${loadTimeMs}ms startup saved`;
      } else if (
        metrics.firstAccessTime !== null &&
        metrics.firstAccessTime < 2000
      ) {
        suggestion = "Consider preloading - frequently accessed early";
        estimatedSavings = `-${loadTimeMs}ms startup, +${loadTimeMs}ms first access`;
      } else {
        suggestion = "Keep lazy - rarely accessed early";
        estimatedSavings = `+${loadTimeMs}ms startup saved`;
      }
    } else {
      if (metrics.accessCount === 0) {
        suggestion = "Consider lazy loading - never accessed";
        estimatedSavings = `+${loadTimeMs}ms startup if lazy`;
      } else if (
        metrics.firstAccessTime !== null &&
        metrics.firstAccessTime > 30000
      ) {
        suggestion = "Consider lazy loading - accessed late";
        estimatedSavings = `+${loadTimeMs}ms startup, -${loadTimeMs}ms on access`;
      } else {
        suggestion = "Keep eager - frequently accessed";
        estimatedSavings = "Optimal";
      }
    }

    return {
      currentStrategy,
      loadTime: loadTimeStr,
      firstAccessDelay: metrics.isLazy ? loadTimeStr : "0ms",
      accessFrequency,
      suggestion,
      estimatedSavings,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new LazyLoadMetrics instance.
 *
 * @param loader - The LazyModuleLoader to use
 * @returns LazyLoadMetrics instance
 *
 * @public API
 */
export function createLazyLoadMetrics(
  loader: LazyModuleLoader,
): LazyLoadMetrics {
  return new LazyLoadMetrics(loader);
}
