/**
 * LazyModuleWarmup Implementation
 *
 * Service for warming up lazy modules in the background during idle time.
 *
 * @module lazy-loading
 */

import { injectable, inject } from "../di/inversify.js";
import {
  ILazyModuleWarmup,
  WarmupConfig,
  PreloadHint,
} from "./lazy.interfaces.js";
import { LazyModuleLoader } from "./lazy-module-loader.js";

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_WARMUP_CONFIG: WarmupConfig = {
  strategy: "idle",
  maxConcurrent: 2,
  delay: 5000, // 5 seconds after startup
  hints: ["high", "medium"],
};

// ============================================================================
// Lazy Module Warmup
// ============================================================================

/**
 * Service for warming up lazy modules in the background.
 *
 * @layer public
 * @audience application-developers
 * @concept lazy-loading
 *
 * UNIQUE: Automatic module warmup during server idle time.
 * Modules are loaded in the background without blocking requests.
 *
 * @example
 * ```typescript
 * const warmup = container.get(LazyModuleWarmup);
 *
 * // Start background warmup
 * await warmup.start({
 *   strategy: "idle",
 *   maxConcurrent: 2,
 *   priority: ["ReportsModule", "AnalyticsModule"]
 * });
 *
 * // Check progress
 * console.log(`Warmup progress: ${warmup.getProgress()}%`);
 *
 * // Get warmed modules
 * console.log(`Warmed: ${warmup.getWarmedModules().join(", ")}`);
 * ```
 *
 * @public API
 */
@injectable()
export class LazyModuleWarmup implements ILazyModuleWarmup {
  private running: boolean = false;
  private warmedModules: Set<string> = new Set();
  private totalToWarm: number = 0;
  private stopRequested: boolean = false;
  private warmupTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    @inject(LazyModuleLoader) private readonly loader: LazyModuleLoader,
  ) {}

  // ============================================================================
  // Control Methods
  // ============================================================================

  /**
   * Start warming up modules in the background.
   *
   * @param config - Optional warmup configuration
   *
   * @example
   * ```typescript
   * // Start with defaults (idle strategy)
   * await warmup.start();
   *
   * // Start immediately with priority list
   * await warmup.start({
   *   strategy: "immediate",
   *   priority: ["CriticalModule", "ImportantModule"],
   *   maxConcurrent: 3
   * });
   *
   * // Start after delay
   * await warmup.start({
   *   strategy: "scheduled",
   *   delay: 10000 // 10 seconds
   * });
   * ```
   */
  async start(config: Partial<WarmupConfig> = {}): Promise<void> {
    if (this.running) {
      console.warn("[LazyModuleWarmup] Warmup already in progress");
      return;
    }

    const fullConfig: WarmupConfig = { ...DEFAULT_WARMUP_CONFIG, ...config };
    this.running = true;
    this.stopRequested = false;
    this.warmedModules.clear();

    // Get modules to warm up
    const modulesToWarm = this.getModulesToWarm(fullConfig);
    this.totalToWarm = modulesToWarm.length;

    if (modulesToWarm.length === 0) {
      console.log("[LazyModuleWarmup] No modules to warm up");
      this.running = false;
      return;
    }

    console.log(
      `[LazyModuleWarmup] Starting warmup of ${modulesToWarm.length} modules ` +
        `(strategy: ${fullConfig.strategy})`,
    );

    // Apply delay based on strategy
    const delay =
      fullConfig.strategy === "immediate" ? 0 : (fullConfig.delay ?? 5000);

    if (delay > 0) {
      await this.delay(delay);
    }

    if (this.stopRequested) {
      this.running = false;
      return;
    }

    // Warm up modules
    await this.warmModules(modulesToWarm, fullConfig.maxConcurrent ?? 2);

    this.running = false;
    console.log(
      `[LazyModuleWarmup] Warmup complete. Warmed ${this.warmedModules.size}/${this.totalToWarm} modules`,
    );
  }

  /**
   * Stop the warmup process.
   *
   * @example
   * ```typescript
   * warmup.stop();
   * console.log("Warmup stopped");
   * ```
   */
  stop(): void {
    this.stopRequested = true;
    if (this.warmupTimer) {
      clearTimeout(this.warmupTimer);
      this.warmupTimer = null;
    }
  }

  // ============================================================================
  // Status Methods
  // ============================================================================

  /**
   * Check if warmup is in progress.
   *
   * @returns True if warmup is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get warmup progress (0-100).
   *
   * @returns Progress percentage
   */
  getProgress(): number {
    if (this.totalToWarm === 0) {
      return 100;
    }
    return Math.round((this.warmedModules.size / this.totalToWarm) * 100);
  }

  /**
   * Get list of modules that have been warmed up.
   *
   * @returns Array of warmed module names
   */
  getWarmedModules(): Array<string> {
    return Array.from(this.warmedModules);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Get modules to warm up based on configuration.
   * @private
   */
  private getModulesToWarm(config: WarmupConfig): Array<string> {
    const allModules = this.loader.getAll();
    let modulesToWarm: Array<string> = [];

    // Filter by hints if specified
    if (config.hints && config.hints.length > 0) {
      const hintsSet = new Set(config.hints);
      modulesToWarm = allModules
        .filter(
          (m) =>
            !m.isLoaded && hintsSet.has(m.config.preloadHint as PreloadHint),
        )
        .map((m) => m.name);
    } else {
      modulesToWarm = allModules.filter((m) => !m.isLoaded).map((m) => m.name);
    }

    // Apply priority ordering if specified
    if (config.priority && config.priority.length > 0) {
      const prioritySet = new Set(config.priority);
      const prioritized: Array<string> = [];
      const others: Array<string> = [];

      for (const name of modulesToWarm) {
        if (prioritySet.has(name)) {
          prioritized.push(name);
        } else {
          others.push(name);
        }
      }

      // Sort prioritized by their order in the priority array
      prioritized.sort((a, b) => {
        return config.priority!.indexOf(a) - config.priority!.indexOf(b);
      });

      modulesToWarm = [...prioritized, ...others];
    }

    return modulesToWarm;
  }

  /**
   * Warm up modules with concurrency control.
   * @private
   */
  private async warmModules(
    moduleNames: Array<string>,
    maxConcurrent: number,
  ): Promise<void> {
    const chunks = this.chunk(moduleNames, maxConcurrent);

    for (const chunk of chunks) {
      if (this.stopRequested) {
        break;
      }

      // Load chunk in parallel
      const promises = chunk.map(async (name) => {
        try {
          await this.loader.load(name);
          this.warmedModules.add(name);
        } catch (error) {
          console.warn(`[LazyModuleWarmup] Failed to warm '${name}':`, error);
        }
      });

      await Promise.all(promises);

      // Small delay between chunks to not overwhelm the system
      if (!this.stopRequested && chunks.indexOf(chunk) < chunks.length - 1) {
        await this.delay(100);
      }
    }
  }

  /**
   * Split array into chunks.
   * @private
   */
  private chunk<T>(array: Array<T>, size: number): Array<Array<T>> {
    const chunks: Array<Array<T>> = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Delay helper.
   * @private
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.warmupTimer = setTimeout(() => {
        this.warmupTimer = null;
        resolve();
      }, ms);
    });
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new LazyModuleWarmup instance.
 *
 * @param loader - The LazyModuleLoader to use
 * @returns LazyModuleWarmup instance
 *
 * @public API
 */
export function createLazyModuleWarmup(
  loader: LazyModuleLoader,
): LazyModuleWarmup {
  return new LazyModuleWarmup(loader);
}
