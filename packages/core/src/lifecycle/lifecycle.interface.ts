/**
 * Lifecycle Interfaces for ExpressoTS
 *
 * These interfaces enable auto-discovery of provider lifecycle hooks.
 * Providers implementing these interfaces will automatically have their
 * lifecycle methods called at the appropriate times by the framework.
 *
 * @module lifecycle
 */

/**
 * Implement this interface to run initialization code after the application
 * is fully ready and listening. Called after `postServerInitialization()`.
 *
 * Unlike `@postConstruct()` which runs when the DI container creates an instance,
 * `IBootstrap` runs after the server is fully operational and ready to accept requests.
 *
 * **Important**: Use `@provideSingleton()` for providers implementing `IBootstrap`.
 * Singleton scope ensures the bootstrapped instance is the same one used throughout
 * the application lifecycle.
 *
 * @example
 * ```typescript
 * @provideSingleton(DatabaseService)
 * export class DatabaseService implements IBootstrap {
 *   async bootstrap(): Promise<void> {
 *     await this.connect();
 *     console.log('Database connected');
 *   }
 * }
 * ```
 *
 * @public API
 */
export interface IBootstrap {
  /**
   * Called after the application is fully ready and listening.
   * Use this for initialization that requires the full application context.
   *
   * @returns void or Promise<void> for async initialization
   */
  bootstrap(): void | Promise<void>;
}

/**
 * Implement this interface to run cleanup code when the application shuts down.
 * Called during `serverShutdown()` with the signal that triggered the shutdown.
 *
 * **Important**: Use `@provideSingleton()` for providers implementing `IShutdown`.
 * Singleton scope ensures the same instance used during runtime receives the
 * shutdown hook. Transient-scoped providers would create a new instance for
 * the shutdown call, missing the actual instance's state.
 *
 * @example
 * ```typescript
 * @provideSingleton(CacheService)
 * export class CacheService implements IShutdown {
 *   async shutdown(signal?: NodeJS.Signals): Promise<void> {
 *     if (signal === 'SIGTERM') {
 *       await this.flushCache(); // Graceful shutdown
 *     }
 *     await this.disconnect();
 *     console.log('Cache disconnected');
 *   }
 * }
 * ```
 *
 * @public API
 */
export interface IShutdown {
  /**
   * Called when the application is shutting down.
   * Use this for cleanup like closing connections, flushing buffers, etc.
   *
   * @param signal - The signal that triggered the shutdown (SIGTERM, SIGINT, etc.)
   * @returns void or Promise<void> for async cleanup
   */
  shutdown(signal?: NodeJS.Signals): void | Promise<void>;
}

/**
 * Type guard to check if an object implements IBootstrap
 * @param obj - The object to check
 * @returns true if the object implements IBootstrap
 * @internal
 */
export function isBootstrap(obj: unknown): obj is IBootstrap {
  return (
    obj !== null &&
    typeof obj === "object" &&
    "bootstrap" in obj &&
    typeof (obj as IBootstrap).bootstrap === "function"
  );
}

/**
 * Type guard to check if an object implements IShutdown
 * @param obj - The object to check
 * @returns true if the object implements IShutdown
 * @internal
 */
export function isShutdown(obj: unknown): obj is IShutdown {
  return (
    obj !== null &&
    typeof obj === "object" &&
    "shutdown" in obj &&
    typeof (obj as IShutdown).shutdown === "function"
  );
}
