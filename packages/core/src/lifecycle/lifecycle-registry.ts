/**
 * Lifecycle Registry for ExpressoTS
 *
 * Discovers and manages providers implementing lifecycle interfaces.
 * Similar to ExceptionFilterRegistry and GuardRegistry.
 *
 * @module lifecycle
 */

import { interfaces } from "../di/inversify";
import { METADATA_KEY } from "../di/binding-decorator/constants";
import {
  IBootstrap,
  IShutdown,
  isBootstrap,
  isShutdown,
} from "./lifecycle.interface";
import { Logger } from "../provider/logger/logger.provider";

/**
 * Registry for discovering and executing lifecycle hooks on providers.
 *
 * @layer public
 * @audience application-developers
 * @concept lifecycle-registry
 * @difficulty intermediate
 *
 * @summary Quick Start
 * Automatically discovers and executes lifecycle hooks on providers.
 *
 * @example
 * ```typescript
 * const registry = new LifecycleRegistry(container);
 * registry.discover();
 * await registry.executeBootstrap();
 * // ... later on shutdown
 * await registry.executeShutdown('SIGTERM');
 * ```
 *
 * **Auto-Discovery**
 * The registry automatically discovers providers implementing `IBootstrap` and `IShutdown`
 * interfaces via the `@provide()` decorator metadata. No manual registration required.
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Architecture**
 *
 * LifecycleRegistry:
 * - Scans `@provide()` metadata for lifecycle interfaces
 * - Stores providers in Sets for O(1) lookup
 * - Executes hooks in parallel for performance
 * - Handles errors gracefully (especially during shutdown)
 *
 * **Discovery Process**
 * 1. Scan Reflect metadata for `@provide()` decorators
 * 2. Check if provider implements `IBootstrap` or `IShutdown`
 * 3. Store in appropriate Set
 * 4. Execute hooks when requested
 *
 * **Design Decisions**
 * - Auto-discovery reduces boilerplate
 * - Parallel execution for performance
 * - Error tolerance during shutdown
 * - Singleton scope requirement enforced
 *
 * @see {@link IBootstrap} for bootstrap hooks
 * @see {@link IShutdown} for shutdown hooks
 *
 * @layer advanced
 * @audience power-users
 *
 * **Advanced Usage**
 *
 * Manual discovery and execution:
 * ```typescript
 * const registry = new LifecycleRegistry(container);
 * registry.discover();
 *
 * // Check counts
 * console.log(`Bootstrap providers: ${registry.getBootstrapCount()}`);
 * console.log(`Shutdown providers: ${registry.getShutdownCount()}`);
 *
 * // Execute bootstrap
 * await registry.executeBootstrap();
 * ```
 *
 * @public API
 */
export class LifecycleRegistry {
  private readonly logger: Logger = new Logger();
  private readonly container: interfaces.Container;
  private bootstrapProviders: Set<interfaces.Newable<IBootstrap>> = new Set();
  private shutdownProviders: Set<interfaces.Newable<IShutdown>> = new Set();
  private discovered: boolean = false;

  /**
   * Creates a new LifecycleRegistry instance.
   *
   * @param container - The InversifyJS container to discover providers from
   */
  constructor(container: interfaces.Container) {
    this.container = container;
  }

  /**
   * Discovers all providers implementing lifecycle interfaces.
   *
   * @layer public
   * @audience application-developers
   * @concept lifecycle-discovery
   * @difficulty beginner
   *
   * Scans all `@provide()` decorated classes and checks if they implement
   * `IBootstrap` or `IShutdown` interfaces.
   *
   * **Discovery Process**
   * - Scans Reflect metadata for `@provide()` decorators
   * - Checks prototype for `bootstrap()` or `shutdown()` methods
   * - Stores providers in Sets for execution
   * - Idempotent (safe to call multiple times)
   *
   * @layer internal
   * @audience framework-developers
   *
   * **Internal Behavior**
   * - Uses `METADATA_KEY.provide` to find all providers
   * - Checks `target.prototype.bootstrap` and `target.prototype.shutdown`
   * - Stores in Sets for O(1) lookup
   * - Sets `discovered` flag to prevent re-discovery
   *
   * @public API
   */
  public discover(): void {
    if (this.discovered) {
      return;
    }

    const provideMetadata =
      Reflect.getMetadata(METADATA_KEY.provide, Reflect) || [];

    for (const metadata of provideMetadata) {
      const target = metadata.implementationType;

      if (!target || !target.prototype) {
        continue;
      }

      // Check for IBootstrap implementation
      if (typeof target.prototype.bootstrap === "function") {
        this.bootstrapProviders.add(target);
      }

      // Check for IShutdown implementation
      if (typeof target.prototype.shutdown === "function") {
        this.shutdownProviders.add(target);
      }
    }

    this.discovered = true;

    // Note: Lifecycle discovery log is suppressed as this info is shown in the startup banner
    // The banner displays "Lifecycle Hooks: ✅" when bootstrap/shutdown providers are detected
  }

  /**
   * Executes all bootstrap lifecycle hooks.
   *
   * @layer public
   * @audience application-developers
   * @concept lifecycle-bootstrap-execution
   * @difficulty beginner
   *
   * Called after the server is fully ready and listening.
   * All bootstrap hooks are executed in parallel for performance.
   *
   * **Execution Behavior**
   * - Executes all `IBootstrap.bootstrap()` methods in parallel
   * - Waits for all hooks to complete before resolving
   * - Throws error if any hook fails (fail-fast)
   * - Gets instances from DI container
   *
   * @layer internal
   * @audience framework-developers
   *
   * **Internal Behavior**
   * - Gets provider instances from container
   * - Validates with `isBootstrap()` type guard
   * - Handles both sync and async hooks
   * - Collects promises and waits with `Promise.all()`
   * - Errors are logged and re-thrown
   *
   * @returns Promise that resolves when all bootstrap hooks complete
   * @throws Error if any bootstrap hook fails
   *
   * @public API
   */
  public async executeBootstrap(): Promise<void> {
    if (this.bootstrapProviders.size === 0) {
      return;
    }

    const promises: Array<Promise<void>> = [];

    for (const Provider of this.bootstrapProviders) {
      try {
        // Get the instance from the container
        const instance = this.container.get<IBootstrap>(Provider);

        if (isBootstrap(instance)) {
          const result = instance.bootstrap();

          if (result instanceof Promise) {
            promises.push(
              result.catch((error) => {
                this.logger.error(
                  `Bootstrap failed for ${Provider.name}: ${error.message}`,
                  "lifecycle-registry",
                );
                throw error;
              }),
            );
          }
        }
      } catch (error) {
        this.logger.error(
          `Failed to execute bootstrap for ${Provider.name}: ${(error as Error).message}`,
          "lifecycle-registry",
        );
        throw error;
      }
    }

    await Promise.all(promises);
  }

  /**
   * Executes all shutdown lifecycle hooks.
   *
   * @layer public
   * @audience application-developers
   * @concept lifecycle-shutdown-execution
   * @difficulty beginner
   *
   * Called when the application is shutting down.
   * All shutdown hooks are executed in parallel.
   * Errors are logged but don't prevent other hooks from executing.
   *
   * **Execution Behavior**
   * - Executes all `IShutdown.shutdown()` methods in parallel
   * - Passes shutdown signal to each hook
   * - Errors are logged but don't stop execution (error-tolerant)
   * - Waits for all hooks to complete
   *
   * @layer internal
   * @audience framework-developers
   *
   * **Internal Behavior**
   * - Gets provider instances from container
   * - Validates with `isShutdown()` type guard
   * - Handles both sync and async hooks
   * - Errors are caught and logged, but not re-thrown
   * - Uses `Promise.all()` to wait for completion
   *
   * **Design Decision: Error Tolerance**
   * Unlike bootstrap hooks, shutdown hooks don't fail-fast. This ensures
   * all cleanup operations have a chance to run, even if one fails.
   *
   * @param signal - The signal that triggered the shutdown (SIGTERM, SIGINT, etc.)
   * @returns Promise that resolves when all shutdown hooks complete
   *
   * @public API
   */
  public async executeShutdown(signal?: NodeJS.Signals): Promise<void> {
    if (this.shutdownProviders.size === 0) {
      return;
    }

    const promises: Array<Promise<void>> = [];

    for (const Provider of this.shutdownProviders) {
      try {
        // Get the instance from the container
        const instance = this.container.get<IShutdown>(Provider);

        if (isShutdown(instance)) {
          const result = instance.shutdown(signal);

          if (result instanceof Promise) {
            promises.push(
              result.catch((error) => {
                // Log error but don't throw - we want all shutdown hooks to run
                this.logger.error(
                  `Shutdown failed for ${Provider.name}: ${error.message}`,
                  "lifecycle-registry",
                );
              }),
            );
          }
        }
      } catch (error) {
        // Log error but continue with other providers
        this.logger.error(
          `Failed to execute shutdown for ${Provider.name}: ${(error as Error).message}`,
          "lifecycle-registry",
        );
      }
    }

    // Wait for all shutdown hooks to complete
    await Promise.all(promises);
  }

  /**
   * Gets the count of discovered bootstrap providers.
   *
   * @returns Number of providers implementing IBootstrap
   * @public API
   */
  public getBootstrapCount(): number {
    return this.bootstrapProviders.size;
  }

  /**
   * Gets the count of discovered shutdown providers.
   *
   * @returns Number of providers implementing IShutdown
   * @public API
   */
  public getShutdownCount(): number {
    return this.shutdownProviders.size;
  }

  /**
   * Clears all discovered providers.
   * Useful for testing.
   *
   * @internal
   */
  public clear(): void {
    this.bootstrapProviders.clear();
    this.shutdownProviders.clear();
    this.discovered = false;
  }
}
