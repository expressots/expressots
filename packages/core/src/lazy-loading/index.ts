/**
 * Lazy-Loading Module
 *
 * @module lazy-loading
 *
 * Intelligent lazy-loading of modules for improved startup time and memory efficiency.
 *
 * Features:
 * - On-demand module loading
 * - Preload hints (high, medium, low, never)
 * - Usage analytics and recommendations
 * - Progressive loading with phases
 * - Runtime module status queries
 * - Background warmup during idle time
 *
 * @example
 * ```typescript
 * // Create a lazy module
 * export const AdminModule = CreateLazyModule([
 *   AdminController,
 *   AdminDashboardController
 * ]).withPreloadHint("low");
 *
 * // Load on-demand
 * const loader = container.get(LazyModuleLoader);
 * await loader.load("AdminModule");
 *
 * // Get recommendations
 * const metrics = container.get(LazyLoadMetrics);
 * console.log(metrics.getRecommendations());
 *
 * // Warm up in background
 * const warmup = container.get(LazyModuleWarmup);
 * await warmup.start({ strategy: "idle" });
 * ```
 */

// ============================================================================
// Interfaces and Types
// ============================================================================

export type {
  // Preload hints
  PreloadHint,
  ModuleLoadStatus,

  // Module configuration
  LazyModuleConfig,
  LazyModuleFactory,
  ILazyModule,

  // Loader
  ILazyModuleLoader,

  // Manager
  ModuleLoadStatistics,
  ILazyModuleManager,

  // Metrics
  ModuleRecommendation,
  ApplyRecommendationsOptions,
  ILazyLoadMetrics,

  // Warmup
  WarmupStrategy,
  WarmupConfig,
  ILazyModuleWarmup,

  // Progressive loading
  LoadingPhase,
  ProgressiveLoadingConfig,

  // Setup
  LazyLoadingOptions,
  LazyLoadingSetupResult,
} from "./lazy.interfaces";

// ============================================================================
// Lazy Module
// ============================================================================

export {
  LazyModule,
  CreateLazyModule,
  createLazyModule,
  isLazyModule,
  getModuleName,
  LAZY_MODULE_METADATA_KEY,
} from "./lazy-module";

// ============================================================================
// Lazy Module Loader
// ============================================================================

export {
  LazyModuleLoader,
  createLazyModuleLoader,
} from "./lazy-module-loader";

// ============================================================================
// Lazy Module Manager
// ============================================================================

export {
  LazyModuleManager,
  createLazyModuleManager,
} from "./lazy-module-manager";

// ============================================================================
// Lazy Load Metrics
// ============================================================================

export {
  LazyLoadMetrics,
  createLazyLoadMetrics,
} from "./lazy-load-metrics";

// ============================================================================
// Lazy Module Warmup
// ============================================================================

export {
  LazyModuleWarmup,
  createLazyModuleWarmup,
} from "./lazy-module-warmup";

