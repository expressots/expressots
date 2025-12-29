/**
 * Lazy-Loading Module - Core Interfaces and Types
 *
 * @module lazy-loading
 *
 * Type-safe lazy module loading with auto-detection, preloading hints,
 * usage analytics, and runtime module management.
 *
 * Features:
 * - On-demand module loading for improved startup time
 * - Preload hints (high, medium, low, never)
 * - Usage analytics and recommendations
 * - Progressive loading with phases
 * - Runtime module status queries
 * - Background warmup during idle time
 */

import { ContainerModule } from "../di/inversify";

// ============================================================================
// Preload Hint Types
// ============================================================================

/**
 * Preload priority levels for lazy modules.
 *
 * @public API
 *
 * @example
 * ```typescript
 * // High priority - preload during startup idle time
 * CreateLazyModule([AdminController]).withPreloadHint("high");
 *
 * // Low priority - only load when accessed
 * CreateLazyModule([ReportsController]).withPreloadHint("low");
 * ```
 */
export type PreloadHint = "high" | "medium" | "low" | "never";

/**
 * Module load status.
 *
 * @public API
 */
export type ModuleLoadStatus =
  | "pending" // Not yet loaded
  | "loading" // Currently loading
  | "loaded" // Successfully loaded
  | "failed" // Failed to load
  | "warming"; // Being warmed up in background

// ============================================================================
// Lazy Module Configuration
// ============================================================================

/**
 * Configuration for a lazy module.
 *
 * @public API
 */
export interface LazyModuleConfig {
  /**
   * Unique name for the module (auto-generated if not provided).
   */
  name?: string;

  /**
   * Preload priority hint.
   * @default "low"
   */
  preloadHint?: PreloadHint;

  /**
   * Routes that trigger prefetching of this module.
   * When user visits these routes, module starts loading in background.
   */
  prefetchOn?: Array<{
    route: string;
    reason?: string;
  }>;

  /**
   * Prefetch after idle time (milliseconds).
   * Module starts loading after user is idle for this duration.
   */
  prefetchAfterIdle?: number;

  /**
   * Dependencies that must be loaded before this module.
   */
  dependencies?: Array<string>;

  /**
   * Custom timeout for module loading (milliseconds).
   * @default 30000
   */
  timeout?: number;

  /**
   * Route prefixes handled by this module.
   * Auto-detected from @controller() decorators when using CreateLazyModule().
   *
   * @example
   * ```typescript
   * routePrefixes: ["/admin", "/admin/settings"]
   * ```
   */
  routePrefixes?: Array<string>;

  /**
   * Estimated memory usage in KB.
   * Used for analytics and memory tracking.
   */
  estimatedMemoryUsage?: number;
}

// ============================================================================
// Lazy Module Types
// ============================================================================

/**
 * Factory function that creates a ContainerModule.
 * Used for lazy loading - the factory is invoked only when module is needed.
 *
 * @public API
 */
export type LazyModuleFactory = () =>
  | ContainerModule
  | Promise<ContainerModule>;

/**
 * A lazy module that can be loaded on-demand.
 *
 * @public API
 */
export interface ILazyModule {
  /**
   * Unique identifier for the module.
   */
  readonly name: string;

  /**
   * Module configuration.
   */
  readonly config: LazyModuleConfig;

  /**
   * Current load status.
   */
  readonly status: ModuleLoadStatus;

  /**
   * Whether the module is currently loaded.
   */
  readonly isLoaded: boolean;

  /**
   * Time taken to load (ms), null if not loaded yet.
   */
  readonly loadTime: number | null;

  /**
   * Error if loading failed.
   */
  readonly error: Error | null;

  /**
   * The underlying ContainerModule (null if not loaded).
   */
  readonly module: ContainerModule | null;

  /**
   * Factory function to create the module.
   */
  readonly factory: LazyModuleFactory;

  /**
   * Load the module (idempotent - safe to call multiple times).
   */
  load(): Promise<ContainerModule>;

  /**
   * Configure the lazy module with fluent API.
   */
  withPreloadHint(hint: PreloadHint): ILazyModule;

  /**
   * Configure lazy loading options.
   */
  withLazyConfig(config: Partial<LazyModuleConfig>): ILazyModule;
}

// ============================================================================
// Lazy Module Loader
// ============================================================================

/**
 * Service for loading lazy modules on-demand.
 *
 * @public API
 */
export interface ILazyModuleLoader {
  /**
   * Load a module by name.
   * Returns immediately if already loaded.
   */
  load(moduleName: string): Promise<ContainerModule>;

  /**
   * Load multiple modules in parallel.
   */
  loadAll(moduleNames: Array<string>): Promise<Array<ContainerModule>>;

  /**
   * Check if a module is loaded.
   */
  isLoaded(moduleName: string): boolean;

  /**
   * Get the current load status of a module.
   */
  getStatus(moduleName: string): ModuleLoadStatus | undefined;

  /**
   * Register a lazy module.
   */
  register(module: ILazyModule): void;

  /**
   * Get all registered lazy modules.
   */
  getAll(): Array<ILazyModule>;

  /**
   * Get modules matching a filter.
   */
  getByStatus(status: ModuleLoadStatus): Array<ILazyModule>;

  /**
   * Get modules by preload hint.
   */
  getByHint(hint: PreloadHint): Array<ILazyModule>;
}

// ============================================================================
// Lazy Module Manager
// ============================================================================

/**
 * Statistics about module loading.
 *
 * @public API
 */
export interface ModuleLoadStatistics {
  /** Total number of registered modules */
  totalModules: number;

  /** Number of loaded modules */
  loadedModules: number;

  /** Number of lazy (unloaded) modules */
  lazyModules: number;

  /** Number of failed modules */
  failedModules: number;

  /** Average load time (ms) */
  avgLoadTime: number;

  /** Total time spent loading (ms) */
  totalLoadTime: number;

  /** Memory saved by lazy loading (estimated bytes) */
  estimatedMemorySaved: number;
}

/**
 * Runtime module management service.
 *
 * @public API
 */
export interface ILazyModuleManager {
  /**
   * Check if a module is loaded.
   */
  isLoaded(moduleName: string): boolean;

  /**
   * Get all loaded module names.
   */
  getLoadedModules(): Array<string>;

  /**
   * Get all pending/unloaded module names.
   */
  getPendingModules(): Array<string>;

  /**
   * Get modules that failed to load.
   */
  getFailedModules(): Array<string>;

  /**
   * Manually load a module.
   */
  load(moduleName: string): Promise<void>;

  /**
   * Load all modules matching a preload hint.
   */
  loadByHint(hint: PreloadHint): Promise<void>;

  /**
   * Get module load statistics.
   */
  getStatistics(): ModuleLoadStatistics;

  /**
   * Unload a module (if supported).
   * Note: This may not fully release memory in all cases.
   */
  unload(moduleName: string): Promise<boolean>;
}

// ============================================================================
// Lazy Load Metrics
// ============================================================================

/**
 * Recommendation for a specific module.
 *
 * @public API
 */
export interface ModuleRecommendation {
  /** Current loading strategy */
  currentStrategy: "eager" | "lazy";

  /** Time to load the module (ms) */
  loadTime: string;

  /** Delay added to first access (ms) */
  firstAccessDelay: string;

  /** How often the module is accessed early in startup */
  accessFrequency: string;

  /** Suggested action */
  suggestion: string;

  /** Estimated impact of change */
  estimatedSavings: string;
}

/**
 * Options for applying recommendations.
 *
 * @public API
 */
export interface ApplyRecommendationsOptions {
  /** Automatically apply all recommendations */
  autoOptimize?: boolean;

  /** Maximum acceptable startup time (ms) */
  maxStartupTime?: number;

  /** Only apply recommendations for modules accessed within this time (ms) */
  accessWindow?: number;
}

/**
 * Usage analytics and recommendations for lazy loading.
 *
 * @public API
 */
export interface ILazyLoadMetrics {
  /**
   * Record a module access.
   */
  recordAccess(moduleName: string): void;

  /**
   * Record module load time.
   */
  recordLoadTime(moduleName: string, timeMs: number): void;

  /**
   * Get recommendations for all modules.
   */
  getRecommendations(): Record<string, ModuleRecommendation>;

  /**
   * Get recommendation for a specific module.
   */
  getRecommendation(moduleName: string): ModuleRecommendation | undefined;

  /**
   * Apply recommendations.
   */
  applyRecommendations(options: ApplyRecommendationsOptions): Promise<void>;

  /**
   * Get total startup time saved by lazy loading.
   */
  getStartupTimeSaved(): number;

  /**
   * Reset all metrics.
   */
  reset(): void;

  /**
   * Export metrics as JSON.
   */
  export(): string;
}

// ============================================================================
// Lazy Module Warmup
// ============================================================================

/**
 * Warmup strategy options.
 *
 * @public API
 */
export type WarmupStrategy = "idle" | "immediate" | "scheduled";

/**
 * Configuration for module warmup.
 *
 * @public API
 */
export interface WarmupConfig {
  /** Warmup strategy */
  strategy: WarmupStrategy;

  /** Maximum concurrent module loads */
  maxConcurrent?: number;

  /** Priority order for warming up modules */
  priority?: Array<string>;

  /** Delay before starting warmup (ms) */
  delay?: number;

  /** Only warm up modules with these hints */
  hints?: Array<PreloadHint>;
}

/**
 * Service for warming up lazy modules in the background.
 *
 * @public API
 */
export interface ILazyModuleWarmup {
  /**
   * Start warming up modules.
   */
  start(config?: Partial<WarmupConfig>): Promise<void>;

  /**
   * Stop warmup process.
   */
  stop(): void;

  /**
   * Check if warmup is in progress.
   */
  isRunning(): boolean;

  /**
   * Get warmup progress (0-100).
   */
  getProgress(): number;

  /**
   * Get list of modules warmed up.
   */
  getWarmedModules(): Array<string>;
}

// ============================================================================
// Progressive Loading
// ============================================================================

/**
 * A phase in progressive loading.
 *
 * @public API
 */
export interface LoadingPhase {
  /** Phase name */
  name: string;

  /** Timeout for this phase (ms) */
  timeout?: number;

  /** Modules to load in this phase */
  modules: Array<string>;
}

/**
 * Configuration for progressive module loading.
 *
 * @public API
 */
export interface ProgressiveLoadingConfig {
  /** Enable progressive loading */
  enabled?: boolean;

  /** Loading phases */
  phases: Array<LoadingPhase>;

  /** Callback when a phase completes */
  onPhaseComplete?: (phase: LoadingPhase, duration: number) => void;

  /** Callback when all phases complete */
  onComplete?: (totalDuration: number) => void;

  /** Callback on phase failure */
  onPhaseFailed?: (phase: LoadingPhase, error: Error) => void;
}

// ============================================================================
// Setup Configuration
// ============================================================================

/**
 * Configuration for enabling smart lazy loading.
 *
 * @public API
 *
 * @example
 * ```typescript
 * setupLazyLoadingForExpress(container, {
 *   strategy: "auto",
 *   alwaysLoad: ["CoreModule", "AuthModule"],
 *   enableMetrics: true
 * });
 * ```
 */
export interface LazyLoadingOptions {
  /**
   * Loading strategy.
   * - "auto": Framework auto-detects based on routes
   * - "manual": Only load modules marked as lazy
   * - "progressive": Use phase-based loading
   * @default "auto"
   */
  strategy?: "auto" | "manual" | "progressive";

  /**
   * Modules to always load eagerly (never lazy).
   */
  alwaysLoad?: Array<string>;

  /**
   * Modules to never preload (only load when accessed).
   */
  neverLoad?: Array<string>;

  /**
   * Enable usage metrics collection.
   * @default true in development, false in production
   */
  enableMetrics?: boolean;

  /**
   * Enable background warmup.
   * @default true
   */
  enableWarmup?: boolean;

  /**
   * Warmup configuration.
   */
  warmupConfig?: Partial<WarmupConfig>;

  /**
   * Progressive loading configuration.
   */
  progressiveConfig?: ProgressiveLoadingConfig;

  /**
   * Default timeout for module loading (ms).
   * @default 30000
   */
  defaultTimeout?: number;

  /**
   * Log level for lazy loading messages.
   * @default "info"
   */
  logLevel?: "debug" | "info" | "warn" | "error" | "none";
}

/**
 * Result of lazy loading setup.
 *
 * @public API
 */
export interface LazyLoadingSetupResult {
  /** Lazy module loader instance */
  loader: ILazyModuleLoader;

  /** Module manager instance */
  manager: ILazyModuleManager;

  /** Metrics instance (if enabled) */
  metrics?: ILazyLoadMetrics;

  /** Warmup instance (if enabled) */
  warmup?: ILazyModuleWarmup;

  /** Number of lazy modules registered */
  lazyModulesCount: number;

  /** Number of eager modules */
  eagerModulesCount: number;
}
