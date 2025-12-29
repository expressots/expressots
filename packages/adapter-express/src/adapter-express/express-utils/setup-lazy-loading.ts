/**
 * Setup Lazy Loading for Express
 *
 * One-liner helper function to configure the lazy loading system.
 *
 * @module adapter-express
 */

import { RequestHandler } from "express";
import { Container } from "@expressots/core";
import {
  LazyModuleLoader,
  LazyModuleManager,
  LazyLoadMetrics,
  LazyModuleWarmup,
  ILazyModule,
  LazyLoadingOptions,
  LazyLoadingSetupResult,
  BindingScopeEnum,
  ProviderManager,
  Logger,
} from "@expressots/core";
import {
  createLazyModuleMiddleware,
  createRouteMappings,
  LazyRouteMapping,
} from "./lazy-module-middleware";

// ============================================================================
// Setup Function
// ============================================================================

/**
 * Set up the lazy loading system with one function call.
 *
 * @layer public
 * @audience application-developers
 * @concept lazy-loading
 *
 * UNIQUE: Zero-configuration lazy loading!
 * - Auto-detects routes from @controller() decorators
 * - Creates middleware for automatic module loading
 * - Optional metrics and background warmup
 *
 * @example
 * ```typescript
 * // 1. Define lazy modules (routes auto-detected from @controller)
 * // lazy-modules.ts
 * export const AdminModule = CreateLazyModule([AdminController]);
 * // Routes auto-detected: ["/admin"] from @controller("/admin")
 *
 * export const ReportsModule = CreateLazyModule([ReportsController]);
 * // Routes auto-detected: ["/reports"] from @controller("/reports")
 *
 * // 2. Setup in app.ts (just pass the modules!)
 * export class App extends AppExpress {
 *   async configureServices(): Promise<void> {
 *     const { middleware } = setupLazyLoadingForExpress(
 *       this.config.Container,
 *       {
 *         lazyModules: [AdminModule, ReportsModule],
 *         globalPrefix: "/api"  // Optional
 *       }
 *     );
 *
 *     // Add middleware - that's it!
 *     if (middleware) {
 *       this.Middleware.addMiddleware(middleware);
 *     }
 *   }
 * }
 *
 * // Now:
 * // - GET /api/admin/* → AdminModule auto-loads
 * // - GET /api/reports/* → ReportsModule auto-loads
 * // - No manual route mapping needed!
 * ```
 *
 * @param container - The DI container
 * @param options - Configuration options
 * @returns Setup result with loader, manager, and middleware
 *
 * @public API
 */
export function setupLazyLoadingForExpress(
  container: Container,
  options: LazyLoadingExpressOptions = {},
): LazyLoadingExpressResult {
  const isDev = process.env.NODE_ENV === "development";

  // Get or create provider manager
  let provider: ProviderManager;
  try {
    provider = container.get(ProviderManager);
  } catch {
    // ProviderManager not available, create bindings manually
    provider = null as unknown as ProviderManager;
  }

  // ============================================
  // Register Services
  // ============================================

  // Register LazyModuleLoader if not already bound
  if (!container.isBound(LazyModuleLoader)) {
    if (provider) {
      provider.register(LazyModuleLoader, BindingScopeEnum.Singleton);
    } else {
      container.bind(LazyModuleLoader).toSelf().inSingletonScope();
    }
  }

  // Register LazyModuleManager if not already bound
  if (!container.isBound(LazyModuleManager)) {
    if (provider) {
      provider.register(LazyModuleManager, BindingScopeEnum.Singleton);
    } else {
      container.bind(LazyModuleManager).toSelf().inSingletonScope();
    }
  }

  // Register LazyLoadMetrics if enabled
  const enableMetrics = options.enableMetrics ?? isDev;
  if (enableMetrics && !container.isBound(LazyLoadMetrics)) {
    if (provider) {
      provider.register(LazyLoadMetrics, BindingScopeEnum.Singleton);
    } else {
      container.bind(LazyLoadMetrics).toSelf().inSingletonScope();
    }
  }

  // Register LazyModuleWarmup if enabled
  const enableWarmup = options.enableWarmup ?? true;
  if (enableWarmup && !container.isBound(LazyModuleWarmup)) {
    if (provider) {
      provider.register(LazyModuleWarmup, BindingScopeEnum.Singleton);
    } else {
      container.bind(LazyModuleWarmup).toSelf().inSingletonScope();
    }
  }

  // ============================================
  // Get Service Instances
  // ============================================

  const loader = container.get(LazyModuleLoader);
  loader.setContainer(container);

  const manager = container.get(LazyModuleManager);
  const metrics = enableMetrics ? container.get(LazyLoadMetrics) : undefined;
  const warmup = enableWarmup ? container.get(LazyModuleWarmup) : undefined;

  // ============================================
  // Register Lazy Modules
  // ============================================

  const lazyModules = options.lazyModules || [];
  let lazyCount = 0;
  let eagerCount = 0;

  for (const lazyModule of lazyModules) {
    // Check if module should always be loaded eagerly
    const alwaysLoad = options.alwaysLoad || [];
    const neverLoad = options.neverLoad || [];

    if (alwaysLoad.includes(lazyModule.name)) {
      // Load immediately
      lazyModule.load().catch((err) => {
        console.warn(`[Lazy Loading] Failed to eager-load ${lazyModule.name}:`, err);
      });
      eagerCount++;
    } else if (!neverLoad.includes(lazyModule.name)) {
      // Register for lazy loading
      loader.register(lazyModule);
      lazyCount++;
    }
  }

  // ============================================
  // Log Summary
  // ============================================

  const logLevel = options.logLevel ?? "info";
  if (logLevel !== "none") {
    let logger: Logger | undefined;
    try {
      logger = container.get(Logger);
    } catch {
      // Logger not available
    }

    const message = `[Lazy Loading] Registered ${lazyCount} lazy modules, ${eagerCount} eager modules`;

    if (logger) {
      logger.info(message);
    } else if (logLevel === "debug" || logLevel === "info") {
      console.log(message);
    }
  }

  // ============================================
  // Start Warmup if Enabled
  // ============================================

  if (warmup && options.warmupConfig) {
    // Schedule warmup to start after a delay
    const warmupDelay = options.warmupConfig.delay ?? 5000;
    setTimeout(() => {
      warmup.start(options.warmupConfig).catch((err) => {
        console.warn("[Lazy Loading] Warmup failed:", err);
      });
    }, warmupDelay);
  }

  // ============================================
  // Create Auto-Load Middleware
  // ============================================

  let middleware: RequestHandler | undefined;
  let routeMappings: Array<LazyRouteMapping> = [];

  if (lazyCount > 0 && options.enableAutoLoad !== false) {
    // Create route mappings from lazy modules
    routeMappings = createRouteMappings(
      lazyModules.filter((m) => !options.alwaysLoad?.includes(m.name)),
      options.routePrefixes,
    );

    // Create the middleware
    middleware = createLazyModuleMiddleware({
      routes: routeMappings,
      loader,
      globalPrefix: options.globalPrefix || "",
      onLoadStart: (moduleName, path) => {
        if (options.logLevel !== "none") {
          console.log(`[Lazy Loading] Loading '${moduleName}' (triggered by ${path})...`);
        }
      },
      onLoadComplete: (moduleName, loadTimeMs) => {
        metrics?.recordLoadTime(moduleName, loadTimeMs);
      },
      onLoadError: (moduleName, error) => {
        console.error(`[Lazy Loading] Failed to load '${moduleName}':`, error.message);
      },
    });

    if (options.logLevel !== "none") {
      const routes = routeMappings
        .map((r) => `${options.globalPrefix || ""}${r.prefix}`)
        .join(", ");
      console.log(`[Lazy Loading] Auto-load middleware active for routes: ${routes}`);
    }
  }

  // ============================================
  // Return Result
  // ============================================

  return {
    loader,
    manager,
    metrics,
    warmup,
    middleware,
    routeMappings,
    lazyModulesCount: lazyCount,
    eagerModulesCount: eagerCount,
  };
}

// ============================================================================
// Extended Types
// ============================================================================

/**
 * Extended lazy loading options for Express.
 *
 * @public API
 */
export interface LazyLoadingExpressOptions extends LazyLoadingOptions {
  /** Lazy modules to register */
  lazyModules?: Array<ILazyModule>;

  /**
   * Manual route prefix mappings.
   * Maps module names to route prefixes for auto-loading.
   *
   * @example
   * ```typescript
   * routePrefixes: {
   *   "AdminModule": "/admin",
   *   "ReportsModule": "/reports"
   * }
   * ```
   */
  routePrefixes?: Record<string, string>;

  /**
   * Global route prefix (e.g., "/api").
   * Used when determining if a request matches a lazy module route.
   */
  globalPrefix?: string;

  /**
   * Enable automatic module loading when routes are accessed.
   * When enabled, accessing a lazy module's route will trigger loading.
   * @default true
   */
  enableAutoLoad?: boolean;
}

/**
 * Extended result of lazy loading setup for Express.
 *
 * @public API
 */
export interface LazyLoadingExpressResult extends LazyLoadingSetupResult {
  /**
   * Middleware for auto-loading lazy modules.
   * Add this to your Express app to enable auto-loading.
   *
   * @example
   * ```typescript
   * const { middleware } = setupLazyLoadingForExpress(container, options);
   * if (middleware) {
   *   this.Middleware.addMiddleware(middleware);
   * }
   * ```
   */
  middleware?: RequestHandler;

  /**
   * Route mappings used by the middleware.
   */
  routeMappings: Array<LazyRouteMapping>;
}

// Re-export types
export type { LazyLoadingOptions, LazyLoadingSetupResult } from "@expressots/core";

export type { LazyRouteMapping } from "./lazy-module-middleware";
