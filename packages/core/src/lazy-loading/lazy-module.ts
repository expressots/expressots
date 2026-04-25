/**
 * LazyModule Implementation
 *
 * Provides the core LazyModule class and CreateLazyModule factory function.
 *
 * @module lazy-loading
 */

import { ContainerModule } from "../di/inversify.js";
import {
  ILazyModule,
  LazyModuleConfig,
  LazyModuleFactory,
  ModuleLoadStatus,
  PreloadHint,
} from "./lazy.interfaces.js";

// ============================================================================
// Lazy Module Metadata Key
// ============================================================================

/**
 * Metadata key for lazy module configuration.
 * @internal
 */
export const LAZY_MODULE_METADATA_KEY = Symbol.for("expressots:lazy-module");

// ============================================================================
// Lazy Module Implementation
// ============================================================================

/**
 * A module that can be loaded on-demand.
 *
 * @layer public
 * @audience application-developers
 * @concept lazy-loading
 *
 * @example
 * ```typescript
 * // Create a lazy module with preload hint
 * const AdminModule = CreateLazyModule(
 *   [AdminController, AdminDashboardController],
 *   { name: "AdminModule" }
 * ).withPreloadHint("low");
 *
 * // The module won't load until first access to /admin/* routes
 * ```
 *
 * @public API
 */
export class LazyModule implements ILazyModule {
  private _status: ModuleLoadStatus = "pending";
  private _loadTime: number | null = null;
  private _error: Error | null = null;
  private _module: ContainerModule | null = null;
  private _loadPromise: Promise<ContainerModule> | null = null;
  private readonly _config: LazyModuleConfig;
  private readonly _name: string;
  private readonly _factory: LazyModuleFactory;

  constructor(factory: LazyModuleFactory, config: LazyModuleConfig = {}) {
    this._factory = factory;
    this._config = {
      preloadHint: "low",
      timeout: 30000,
      ...config,
    };
    this._name =
      config.name ||
      `LazyModule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  // ============================================================================
  // Public Properties
  // ============================================================================

  get name(): string {
    return this._name;
  }

  get config(): LazyModuleConfig {
    return { ...this._config };
  }

  get status(): ModuleLoadStatus {
    return this._status;
  }

  get isLoaded(): boolean {
    return this._status === "loaded";
  }

  get loadTime(): number | null {
    return this._loadTime;
  }

  get error(): Error | null {
    return this._error;
  }

  get module(): ContainerModule | null {
    return this._module;
  }

  get factory(): LazyModuleFactory {
    return this._factory;
  }

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Load the module. Idempotent - safe to call multiple times.
   *
   * @returns The loaded ContainerModule
   * @throws Error if loading fails
   */
  async load(): Promise<ContainerModule> {
    // Already loaded
    if (this._module) {
      return this._module;
    }

    // Loading in progress - return existing promise
    if (this._loadPromise) {
      return this._loadPromise;
    }

    // Start loading
    this._status = "loading";
    const startTime = performance.now();

    this._loadPromise = this._loadWithTimeout()
      .then((module) => {
        this._module = module;
        this._status = "loaded";
        this._loadTime = Math.round(performance.now() - startTime);
        this._loadPromise = null;
        return module;
      })
      .catch((error) => {
        this._status = "failed";
        this._error = error instanceof Error ? error : new Error(String(error));
        this._loadTime = Math.round(performance.now() - startTime);
        this._loadPromise = null;
        throw this._error;
      });

    return this._loadPromise;
  }

  /**
   * Configure preload hint with fluent API.
   */
  withPreloadHint(hint: PreloadHint): ILazyModule {
    (this._config as LazyModuleConfig).preloadHint = hint;
    return this;
  }

  /**
   * Configure lazy loading options with fluent API.
   */
  withLazyConfig(config: Partial<LazyModuleConfig>): ILazyModule {
    Object.assign(this._config, config);
    return this;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Load module with timeout.
   * @private
   */
  private async _loadWithTimeout(): Promise<ContainerModule> {
    const timeout = this._config.timeout || 30000;

    return new Promise<ContainerModule>((resolve, reject) => {
      let completed = false;

      // Set up timeout
      const timeoutId = setTimeout(() => {
        if (!completed) {
          completed = true;
          reject(
            new Error(`Module '${this._name}' load timeout after ${timeout}ms`),
          );
        }
      }, timeout);

      // Execute factory
      try {
        const result = this._factory();
        Promise.resolve(result)
          .then((module) => {
            if (!completed) {
              completed = true;
              clearTimeout(timeoutId);
              resolve(module);
            }
          })
          .catch((error) => {
            if (!completed) {
              completed = true;
              clearTimeout(timeoutId);
              reject(error);
            }
          });
      } catch (error) {
        // Handle synchronous factory errors
        if (!completed) {
          completed = true;
          clearTimeout(timeoutId);
          reject(error);
        }
      }
    });
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Metadata key for controller routes (must match adapter-express).
 * @internal
 */
const CONTROLLER_METADATA_KEY = "inversify-express-utils:controller";

/**
 * Extract route prefixes from controller classes.
 *
 * @param controllers - Controller classes to analyze
 * @returns Array of unique route prefixes
 *
 * @internal
 */
function extractControllerPaths(
  controllers: Array<new (...args: Array<unknown>) => unknown>,
): Array<string> {
  const paths: Array<string> = [];

  for (const controller of controllers) {
    try {
      // Get controller metadata from @controller decorator
      const metadata = Reflect.getMetadata(CONTROLLER_METADATA_KEY, controller);

      if (metadata && typeof metadata === "object" && "path" in metadata) {
        const path = metadata.path as string;
        if (path && typeof path === "string") {
          // Normalize path
          const normalizedPath = path.startsWith("/") ? path : `/${path}`;
          paths.push(normalizedPath);
        }
      }
    } catch {
      // Controller doesn't have metadata - skip
    }
  }

  // Return unique, sorted paths
  return [...new Set(paths)].sort();
}

/**
 * Create a lazy module from controllers.
 *
 * @layer public
 * @audience application-developers
 * @concept lazy-loading
 *
 * UNIQUE: Zero-configuration lazy loading with automatic route detection!
 * Just wrap your controllers and routes are auto-discovered from @controller() decorators.
 *
 * @example
 * ```typescript
 * // Zero-config! Routes auto-detected from @controller("/admin")
 * export const AdminModule = CreateLazyModule([
 *   AdminController,        // @controller("/admin")
 *   AdminDashboardController // @controller("/admin/dashboard")
 * ]);
 * // Auto-detected routes: ["/admin", "/admin/dashboard"]
 *
 * // With explicit name
 * export const ReportsModule = CreateLazyModule(
 *   [ReportsController],    // @controller("/reports")
 *   { name: "ReportsModule" }
 * ).withPreloadHint("low");
 *
 * // With prefetch hints
 * export const AnalyticsModule = CreateLazyModule(
 *   [AnalyticsController],
 *   { name: "AnalyticsModule" }
 * ).withLazyConfig({
 *   preloadHint: "medium",
 *   prefetchAfterIdle: 5000
 * });
 * ```
 *
 * @param controllers - Controller classes to include in the module
 * @param config - Optional configuration
 * @returns LazyModule instance
 *
 * @public API
 */
export function CreateLazyModule(
  controllers: Array<new (...args: Array<unknown>) => unknown>,
  config: LazyModuleConfig = {},
): ILazyModule {
  // Auto-detect route prefixes from @controller() decorators
  const detectedPaths = extractControllerPaths(controllers);

  // Merge with any explicit routePrefixes
  const allPrefixes = [...(config.routePrefixes || []), ...detectedPaths];
  const uniquePrefixes = [...new Set(allPrefixes)];

  // Create config with auto-detected prefixes
  const enhancedConfig: LazyModuleConfig = {
    ...config,
    routePrefixes: uniquePrefixes.length > 0 ? uniquePrefixes : undefined,
  };

  // Import CreateModule dynamically to avoid circular dependencies.
  // `await import` works identically in both CJS and ESM compiled output
  // and the factory type already accepts Promise<ContainerModule>.
  const factory: LazyModuleFactory = async () => {
    const { CreateModule } = await import(
      "../container-module/container-module.js"
    );
    return CreateModule(controllers);
  };

  return new LazyModule(factory, enhancedConfig);
}

/**
 * Create a lazy module from a ContainerModule factory.
 *
 * @layer public
 * @audience application-developers
 * @concept lazy-loading
 *
 * @example
 * ```typescript
 * // Lazy load with custom bindings
 * export const CustomModule = createLazyModule(
 *   () => new ContainerModule((bind) => {
 *     bind<ICache>("ICache").to(RedisCache);
 *     bind<ILogger>("ILogger").to(FileLogger);
 *   }),
 *   { name: "CustomModule" }
 * );
 *
 * // Async factory (e.g., dynamic import)
 * export const DynamicModule = createLazyModule(
 *   async () => {
 *     const { module } = await import("./heavy-module");
 *     return module;
 *   },
 *   { name: "DynamicModule" }
 * );
 * ```
 *
 * @param factory - Factory function that creates the ContainerModule
 * @param config - Optional configuration
 * @returns LazyModule instance
 *
 * @public API
 */
export function createLazyModule(
  factory: LazyModuleFactory,
  config: LazyModuleConfig = {},
): ILazyModule {
  return new LazyModule(factory, config);
}

/**
 * Check if a value is a LazyModule.
 *
 * @param value - Value to check
 * @returns True if value is a LazyModule
 *
 * @public API
 */
export function isLazyModule(value: unknown): value is ILazyModule {
  return (
    value !== null &&
    typeof value === "object" &&
    "load" in value &&
    "withPreloadHint" in value &&
    "status" in value &&
    "isLoaded" in value
  );
}

/**
 * Get module name from a module (lazy or regular).
 *
 * @param module - Module to get name from
 * @returns Module name or undefined
 *
 * @internal
 */
export function getModuleName(
  module: ContainerModule | ILazyModule,
): string | undefined {
  if (isLazyModule(module)) {
    return module.name;
  }
  // Regular ContainerModule doesn't have a name
  return undefined;
}
