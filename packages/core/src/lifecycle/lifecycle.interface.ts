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
 * Bootstrap lifecycle hook interface.
 *
 * @layer public
 * @audience application-developers
 * @concept lifecycle-bootstrap
 * @difficulty beginner
 *
 * @summary Quick Start
 * Implement this interface to run initialization code after the application is fully ready.
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
 * **When is bootstrap() called?**
 * - After the server is fully ready and listening
 * - After `postServerInitialization()` completes
 * - Before accepting requests
 *
 * **Important**: Use `@provideSingleton()` for providers implementing `IBootstrap`.
 * Singleton scope ensures the bootstrapped instance is the same one used throughout
 * the application lifecycle.
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Architecture**
 *
 * Bootstrap hooks are:
 * - Auto-discovered by `LifecycleRegistry`
 * - Executed in parallel for performance
 * - Called after server initialization
 *
 * **Design Decisions**
 * - Parallel execution for faster startup
 * - Singleton scope requirement for consistency
 * - Runs after server ready (not during DI creation)
 *
 * @see {@link LifecycleRegistry} for discovery and execution
 * @see {@link IShutdown} for shutdown hooks
 *
 * @layer advanced
 * @audience power-users
 *
 * **Advanced Usage**
 *
 * Multiple bootstrap hooks execute in parallel:
 * ```typescript
 * @provideSingleton(DatabaseService)
 * export class DatabaseService implements IBootstrap {
 *   async bootstrap(): Promise<void> {
 *     await this.connect(); // Runs in parallel with CacheService.bootstrap()
 *   }
 * }
 *
 * @provideSingleton(CacheService)
 * export class CacheService implements IBootstrap {
 *   async bootstrap(): Promise<void> {
 *     await this.warmCache(); // Runs in parallel with DatabaseService.bootstrap()
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
 * Shutdown lifecycle hook interface.
 *
 * @layer public
 * @audience application-developers
 * @concept lifecycle-shutdown
 * @difficulty beginner
 *
 * @summary Quick Start
 * Implement this interface to run cleanup code when the application shuts down.
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
 * **When is shutdown() called?**
 * - During application shutdown (SIGTERM, SIGINT, etc.)
 * - Called with the signal that triggered shutdown
 * - All shutdown hooks execute in parallel
 *
 * **Important**: Use `@provideSingleton()` for providers implementing `IShutdown`.
 * Singleton scope ensures the same instance used during runtime receives the
 * shutdown hook. Transient-scoped providers would create a new instance for
 * the shutdown call, missing the actual instance's state.
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Architecture**
 *
 * Shutdown hooks are:
 * - Auto-discovered by `LifecycleRegistry`
 * - Executed in parallel for faster shutdown
 * - Errors are logged but don't prevent other hooks from executing
 *
 * **Design Decisions**
 * - Parallel execution for faster shutdown
 * - Error tolerance (don't fail fast on shutdown)
 * - Singleton scope requirement for state consistency
 *
 * @see {@link LifecycleRegistry} for discovery and execution
 * @see {@link IBootstrap} for bootstrap hooks
 *
 * @layer advanced
 * @audience power-users
 *
 * **Advanced Usage**
 *
 * Signal-based cleanup:
 * ```typescript
 * @provideSingleton(DatabaseService)
 * export class DatabaseService implements IShutdown {
 *   async shutdown(signal?: NodeJS.Signals): Promise<void> {
 *     if (signal === 'SIGTERM') {
 *       // Graceful shutdown - finish current operations
 *       await this.finishPendingQueries();
 *     } else if (signal === 'SIGINT') {
 *       // Immediate shutdown
 *       await this.closeConnections();
 *     }
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
