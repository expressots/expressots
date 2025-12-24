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
 * Automatically discovers providers implementing `IBootstrap` and `IShutdown`
 * interfaces via the `@provide()` decorator metadata.
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
   * Scans all `@provide()` decorated classes and checks if they implement
   * `IBootstrap` or `IShutdown` interfaces.
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

    if (this.bootstrapProviders.size > 0 || this.shutdownProviders.size > 0) {
      this.logger.info(
        `Lifecycle: ${this.bootstrapProviders.size} bootstrap, ${this.shutdownProviders.size} shutdown providers`,
        "lifecycle-registry",
      );
    }
  }

  /**
   * Executes all bootstrap lifecycle hooks.
   *
   * Called after the server is fully ready and listening.
   * All bootstrap hooks are executed in parallel for performance.
   *
   * @returns Promise that resolves when all bootstrap hooks complete
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
   * Called when the application is shutting down.
   * All shutdown hooks are executed in parallel.
   * Errors are logged but don't prevent other hooks from executing.
   *
   * @param signal - The signal that triggered the shutdown
   * @returns Promise that resolves when all shutdown hooks complete
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
