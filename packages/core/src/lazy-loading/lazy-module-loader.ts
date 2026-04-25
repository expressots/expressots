/**
 * LazyModuleLoader Implementation
 *
 * Service for loading lazy modules on-demand with dependency resolution.
 *
 * @module lazy-loading
 */

import { injectable } from "../di/inversify.js";
import { Container, ContainerModule } from "../di/inversify.js";
import {
  ILazyModule,
  ILazyModuleLoader,
  ModuleLoadStatus,
  PreloadHint,
} from "./lazy.interfaces.js";
import { isLazyModule } from "./lazy-module.js";

// ============================================================================
// Lazy Module Loader
// ============================================================================

/**
 * Service for loading lazy modules on-demand.
 *
 * @layer public
 * @audience application-developers
 * @concept lazy-loading
 *
 * UNIQUE: Intelligent module loading with dependency resolution,
 * parallel loading, and automatic container integration.
 *
 * @example
 * ```typescript
 * // Get the loader from container
 * const loader = container.get(LazyModuleLoader);
 *
 * // Load a module by name
 * await loader.load("AdminModule");
 *
 * // Load multiple modules in parallel
 * await loader.loadAll(["ReportsModule", "AnalyticsModule"]);
 *
 * // Check if module is loaded
 * if (!loader.isLoaded("AdminModule")) {
 *   await loader.load("AdminModule");
 * }
 * ```
 *
 * @public API
 */
@injectable()
export class LazyModuleLoader implements ILazyModuleLoader {
  private readonly modules: Map<string, ILazyModule> = new Map();
  private container: Container | null = null;

  // ============================================================================
  // Container Integration
  // ============================================================================

  /**
   * Set the container for loading modules into.
   * @internal
   */
  setContainer(container: Container): void {
    this.container = container;
  }

  /**
   * Get the container.
   * @internal
   */
  getContainer(): Container | null {
    return this.container;
  }

  // ============================================================================
  // Registration
  // ============================================================================

  /**
   * Register a lazy module.
   *
   * @param module - The lazy module to register
   *
   * @example
   * ```typescript
   * loader.register(AdminModule);
   * loader.register(ReportsModule);
   * ```
   */
  register(module: ILazyModule): void {
    if (!isLazyModule(module)) {
      throw new Error(
        "Invalid lazy module: must implement ILazyModule interface",
      );
    }

    if (this.modules.has(module.name)) {
      console.warn(
        `[LazyModuleLoader] Module '${module.name}' already registered, skipping`,
      );
      return;
    }

    this.modules.set(module.name, module);
  }

  /**
   * Register multiple lazy modules.
   *
   * @param modules - Array of lazy modules to register
   */
  registerAll(modules: Array<ILazyModule>): void {
    for (const module of modules) {
      this.register(module);
    }
  }

  // ============================================================================
  // Loading
  // ============================================================================

  /**
   * Load a module by name.
   *
   * @param moduleName - Name of the module to load
   * @returns The loaded ContainerModule
   * @throws Error if module not found or loading fails
   *
   * @example
   * ```typescript
   * const module = await loader.load("AdminModule");
   * // Module is now loaded and bindings are available
   * ```
   */
  async load(moduleName: string): Promise<ContainerModule> {
    const lazyModule = this.modules.get(moduleName);

    if (!lazyModule) {
      throw new Error(`Module '${moduleName}' not found. Did you register it?`);
    }

    // Check dependencies first
    const dependencies = lazyModule.config.dependencies || [];
    for (const depName of dependencies) {
      if (!this.isLoaded(depName)) {
        await this.load(depName);
      }
    }

    // Load the module
    const containerModule = await lazyModule.load();

    // Load into container if available
    if (this.container && containerModule) {
      try {
        this.container.load(containerModule);
      } catch (error) {
        // Module bindings may already exist - that's okay
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes("already been declared")) {
          throw error;
        }
      }
    }

    return containerModule;
  }

  /**
   * Load multiple modules in parallel.
   *
   * @param moduleNames - Names of modules to load
   * @returns Array of loaded ContainerModules
   *
   * @example
   * ```typescript
   * const modules = await loader.loadAll([
   *   "ReportsModule",
   *   "AnalyticsModule",
   *   "ExportModule"
   * ]);
   * ```
   */
  async loadAll(moduleNames: Array<string>): Promise<Array<ContainerModule>> {
    // Sort by dependencies to ensure correct load order
    const sortedNames = this.topologicalSort(moduleNames);

    const results: Array<ContainerModule> = [];
    for (const name of sortedNames) {
      const module = await this.load(name);
      results.push(module);
    }

    return results;
  }

  /**
   * Load all modules matching a preload hint.
   *
   * @param hint - Preload hint to match
   * @returns Array of loaded ContainerModules
   */
  async loadByHint(hint: PreloadHint): Promise<Array<ContainerModule>> {
    const modules = this.getByHint(hint);
    const names = modules.map((m) => m.name);
    return this.loadAll(names);
  }

  // ============================================================================
  // Status Queries
  // ============================================================================

  /**
   * Check if a module is loaded.
   *
   * @param moduleName - Name of the module
   * @returns True if the module is loaded
   */
  isLoaded(moduleName: string): boolean {
    const module = this.modules.get(moduleName);
    return module?.isLoaded ?? false;
  }

  /**
   * Get the load status of a module.
   *
   * @param moduleName - Name of the module
   * @returns Module status or undefined if not registered
   */
  getStatus(moduleName: string): ModuleLoadStatus | undefined {
    return this.modules.get(moduleName)?.status;
  }

  /**
   * Get all registered lazy modules.
   *
   * @returns Array of all registered modules
   */
  getAll(): Array<ILazyModule> {
    return Array.from(this.modules.values());
  }

  /**
   * Get modules by status.
   *
   * @param status - Status to filter by
   * @returns Array of modules with matching status
   */
  getByStatus(status: ModuleLoadStatus): Array<ILazyModule> {
    return this.getAll().filter((m) => m.status === status);
  }

  /**
   * Get modules by preload hint.
   *
   * @param hint - Preload hint to filter by
   * @returns Array of modules with matching hint
   */
  getByHint(hint: PreloadHint): Array<ILazyModule> {
    return this.getAll().filter((m) => m.config.preloadHint === hint);
  }

  /**
   * Get a module by name.
   *
   * @param name - Module name
   * @returns The module or undefined
   */
  get(name: string): ILazyModule | undefined {
    return this.modules.get(name);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Topological sort of module names based on dependencies.
   * @private
   */
  private topologicalSort(names: Array<string>): Array<string> {
    const visited = new Set<string>();
    const result: Array<string> = [];
    const visiting = new Set<string>(); // For cycle detection

    const visit = (name: string): void => {
      if (visited.has(name)) return;
      if (visiting.has(name)) {
        throw new Error(
          `Circular dependency detected involving module '${name}'`,
        );
      }

      visiting.add(name);

      const module = this.modules.get(name);
      if (module) {
        const deps = module.config.dependencies || [];
        for (const dep of deps) {
          if (names.includes(dep)) {
            visit(dep);
          }
        }
      }

      visiting.delete(name);
      visited.add(name);
      result.push(name);
    };

    for (const name of names) {
      visit(name);
    }

    return result;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new LazyModuleLoader instance.
 *
 * @param container - Optional container to load modules into
 * @returns LazyModuleLoader instance
 *
 * @example
 * ```typescript
 * const loader = createLazyModuleLoader(container);
 * loader.register(AdminModule);
 * await loader.load("AdminModule");
 * ```
 *
 * @public API
 */
export function createLazyModuleLoader(
  container?: Container,
): LazyModuleLoader {
  const loader = new LazyModuleLoader();
  if (container) {
    loader.setContainer(container);
  }
  return loader;
}
