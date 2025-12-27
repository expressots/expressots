import {
  IWebServer,
  IWebServerBuilder,
  IWebServerConstructor,
} from "@expressots/shared";
import { Logger } from "../provider/logger/logger.provider";

/**
 * Type guard to check if input is a constructor type of IWebServer.
 *
 * @layer internal
 * @audience framework-developers
 *
 * @param input - Input to check.
 * @returns True if input is a constructor type of IWebServer.
 *
 * @internal
 */
export function isWebServerConstructor<T extends IWebServer>(
  input: unknown,
): input is IWebServerConstructor<T> {
  return input && typeof input === "function";
}

/**
 * Factory class for creating web server instances.
 *
 * @layer public
 * @audience application-developers
 * @concept factory-pattern
 * @difficulty beginner
 *
 * @summary Quick Start
 * Used internally by `bootstrap()` to create your application instance.
 * Typically you don't need to use this directly - use `bootstrap()` instead.
 *
 * @example
 * ```typescript
 * // Usually called internally by bootstrap()
 * const app = await AppFactory.create(MyApp);
 * ```
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Architecture**
 *
 * AppFactory is responsible for:
 * - Type-safe instantiation of IWebServer implementations
 * - Constructor validation using type guards
 * - Error handling for invalid types
 *
 * **Design Decisions**
 * - Static method pattern for simple factory behavior
 * - Type guard ensures runtime type safety
 * - Logger integration for error reporting
 * - Returns builder interface for method chaining
 *
 * **Usage in Bootstrap**
 * Called by `bootstrap()` function to create the app instance before
 * starting the server. The created instance's constructor runs:
 * - `globalConfiguration()` - App-level configuration
 * - DI container initialization
 * - Middleware registration
 *
 * @see {@link bootstrap} for the recommended way to start applications
 *
 * @layer advanced
 * @audience power-users
 *
 * **Advanced Usage**
 *
 * Direct usage (not recommended - use bootstrap instead):
 * ```typescript
 * const app = await AppFactory.create(MyApp);
 * await app.listen(3000);
 * ```
 *
 * **Why Use Bootstrap Instead?**
 * - Handles environment loading
 * - Configures port automatically
 * - Sets up graceful shutdown
 * - Displays startup banner
 * - Validates configuration
 *
 * @public API
 */
export class AppFactory {
  private static logger: Logger = new Logger();

  /**
   * Create an instance of a web server.
   *
   * @layer public
   * @audience application-developers
   *
   * @param webServerType - Constructor of a class that implements IWebServer.
   * @returns A promise that resolves to an instance of IWebServerBuilder.
   *
   * @example
   * ```typescript
   * // Typically used internally by bootstrap()
   * const app = await AppFactory.create(MyApp);
   * ```
   *
   * @layer internal
   * @audience framework-developers
   *
   * **Implementation Details**
   * - Validates constructor using type guard
   * - Instantiates the class (triggers constructor)
   * - Returns builder interface for chaining
   *
   * **Error Handling**
   * - Throws error if input is not a valid constructor
   * - Logs error before throwing
   *
   * @throws {Error} If webServerType is not a valid constructor
   *
   * @public API
   */
  public static async create<T extends IWebServer>(
    webServerType: IWebServerConstructor<T>,
  ): Promise<IWebServerBuilder> {
    if (isWebServerConstructor<T>(webServerType)) {
      const webServerInstance: T = new webServerType();
      return webServerInstance;
    } else {
      AppFactory.logger.error("Invalid web server type.", "app-factory:create");
      throw new Error("Invalid web server type.");
    }
  }
}
