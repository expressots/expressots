/**
 * LazyModuleManager Implementation
 *
 * Runtime module management service for querying and controlling lazy modules.
 *
 * @module lazy-loading
 */

import { injectable, inject } from "../di/inversify.js";
import {
  ILazyModuleManager,
  ModuleLoadStatistics,
  PreloadHint,
} from "./lazy.interfaces.js";
import { LazyModuleLoader } from "./lazy-module-loader.js";

// ============================================================================
// Lazy Module Manager
// ============================================================================

/**
 * Runtime module management service.
 *
 * @layer public
 * @audience application-developers
 * @concept lazy-loading
 *
 * Query module load status at runtime, get statistics,
 * and manually control module loading.
 *
 * @example
 * ```typescript
 * const manager = container.get(LazyModuleManager);
 *
 * // Check if module is loaded
 * if (!manager.isLoaded("AdminModule")) {
 *   await manager.load("AdminModule");
 * }
 *
 * // Get all loaded modules
 * const loaded = manager.getLoadedModules();
 * console.log(`Loaded: ${loaded.join(", ")}`);
 *
 * // Get statistics
 * const stats = manager.getStatistics();
 * console.log(`Average load time: ${stats.avgLoadTime}ms`);
 * ```
 *
 * @public API
 */
@injectable()
export class LazyModuleManager implements ILazyModuleManager {
  constructor(
    @inject(LazyModuleLoader) private readonly loader: LazyModuleLoader,
  ) {}

  // ============================================================================
  // Status Queries
  // ============================================================================

  /**
   * Check if a module is loaded.
   *
   * @param moduleName - Name of the module
   * @returns True if the module is loaded
   *
   * @example
   * ```typescript
   * if (manager.isLoaded("AdminModule")) {
   *   // AdminModule is ready to use
   * }
   * ```
   */
  isLoaded(moduleName: string): boolean {
    return this.loader.isLoaded(moduleName);
  }

  /**
   * Get names of all loaded modules.
   *
   * @returns Array of loaded module names
   *
   * @example
   * ```typescript
   * const loaded = manager.getLoadedModules();
   * // ["CoreModule", "AuthModule", "UserModule"]
   * ```
   */
  getLoadedModules(): Array<string> {
    return this.loader
      .getAll()
      .filter((m) => m.isLoaded)
      .map((m) => m.name);
  }

  /**
   * Get names of all pending (unloaded) modules.
   *
   * @returns Array of pending module names
   *
   * @example
   * ```typescript
   * const pending = manager.getPendingModules();
   * // ["AdminModule", "ReportsModule"]
   * ```
   */
  getPendingModules(): Array<string> {
    return this.loader
      .getAll()
      .filter((m) => m.status === "pending")
      .map((m) => m.name);
  }

  /**
   * Get names of all modules that failed to load.
   *
   * @returns Array of failed module names
   */
  getFailedModules(): Array<string> {
    return this.loader
      .getAll()
      .filter((m) => m.status === "failed")
      .map((m) => m.name);
  }

  // ============================================================================
  // Loading Control
  // ============================================================================

  /**
   * Manually load a module.
   *
   * @param moduleName - Name of the module to load
   *
   * @example
   * ```typescript
   * // Preload module before it's needed
   * await manager.load("AdminModule");
   * ```
   */
  async load(moduleName: string): Promise<void> {
    await this.loader.load(moduleName);
  }

  /**
   * Load all modules with a specific preload hint.
   *
   * @param hint - Preload hint to match
   *
   * @example
   * ```typescript
   * // Load all high-priority modules
   * await manager.loadByHint("high");
   * ```
   */
  async loadByHint(hint: PreloadHint): Promise<void> {
    await this.loader.loadByHint(hint);
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get module load statistics.
   *
   * @returns Statistics about module loading
   *
   * @example
   * ```typescript
   * const stats = manager.getStatistics();
   * console.log({
   *   totalModules: stats.totalModules,
   *   loadedModules: stats.loadedModules,
   *   avgLoadTime: stats.avgLoadTime + "ms",
   *   memorySaved: (stats.estimatedMemorySaved / 1024 / 1024).toFixed(2) + "MB"
   * });
   * ```
   */
  getStatistics(): ModuleLoadStatistics {
    const allModules = this.loader.getAll();
    const loadedModules = allModules.filter((m) => m.isLoaded);
    const pendingModules = allModules.filter((m) => m.status === "pending");
    const failedModules = allModules.filter((m) => m.status === "failed");

    const loadTimes = loadedModules
      .map((m) => m.loadTime)
      .filter((t): t is number => t !== null);

    const totalLoadTime = loadTimes.reduce((sum, t) => sum + t, 0);
    const avgLoadTime =
      loadTimes.length > 0 ? totalLoadTime / loadTimes.length : 0;

    // Estimate memory saved (rough estimate: 50KB per lazy module)
    const estimatedMemorySaved = pendingModules.length * 50 * 1024;

    return {
      totalModules: allModules.length,
      loadedModules: loadedModules.length,
      lazyModules: pendingModules.length,
      failedModules: failedModules.length,
      avgLoadTime: Math.round(avgLoadTime),
      totalLoadTime: Math.round(totalLoadTime),
      estimatedMemorySaved,
    };
  }

  // ============================================================================
  // Advanced Operations
  // ============================================================================

  /**
   * Attempt to unload a module.
   *
   * Note: Due to JavaScript's garbage collection, unloading may not
   * immediately free memory. The module's bindings will be removed
   * from the container, but cached instances may remain.
   *
   * @param moduleName - Name of the module to unload
   * @returns True if unload was attempted, false if module not found
   */
  async unload(moduleName: string): Promise<boolean> {
    const module = this.loader.get(moduleName);
    if (!module) {
      return false;
    }

    // For now, we can't truly unload modules in InversifyJS
    // This would require container.unbind() for each binding
    // We'll mark this as a limitation and return false
    console.warn(
      `[LazyModuleManager] Module unloading is not fully supported. ` +
        `Module '${moduleName}' bindings will remain in the container.`,
    );

    return false;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new LazyModuleManager instance.
 *
 * @param loader - The LazyModuleLoader to use
 * @returns LazyModuleManager instance
 *
 * @public API
 */
export function createLazyModuleManager(
  loader: LazyModuleLoader,
): LazyModuleManager {
  return new LazyModuleManager(loader);
}
