/**
 * ExpressoTS v4 Middleware Registry
 *
 * Singleton registry for named middleware that can be used in routes.
 *
 * @module middleware-registry
 * @public API
 */

import type { RequestHandler } from "express";
import type { RegisteredMiddleware } from "./middleware-config.js";

/**
 * ExpressoMiddleware interface for class-based middleware.
 */
interface IExpressoMiddleware {
  use: RequestHandler;
}

/**
 * Middleware entry type (can be handler, array, or class).
 */
export type MiddlewareEntry =
  | RequestHandler
  | Array<RequestHandler>
  | IExpressoMiddleware;

/**
 * Singleton middleware registry instance.
 * @internal
 */
let registryInstance: MiddlewareRegistry | null = null;

/**
 * Middleware Registry for named middleware.
 *
 * Allows registering middleware by name in app.ts and using them
 * in controllers via the use() utility function.
 *
 * @example
 * ```typescript
 * // In app.ts
 * this.Middleware.register('auth', verifyJwtMiddleware);
 *
 * // In controller
 * @httpGet('/', ...use('auth'))
 * async getUsers() { }
 * ```
 *
 * @public API
 */
export class MiddlewareRegistry {
  private registry: Map<string, RegisteredMiddleware> = new Map();

  /**
   * Register a named middleware.
   *
   * @param name - Unique name for the middleware
   * @param handler - Express handler, array of handlers, or ExpressoMiddleware class
   */
  register(name: string, handler: MiddlewareEntry): void {
    const normalizedHandler = this.normalizeHandler(handler);

    this.registry.set(name, {
      name,
      handler: normalizedHandler,
      registeredAt: new Date(),
    });
  }

  /**
   * Get a registered middleware by name.
   *
   * @param name - Middleware name
   * @returns The middleware handler(s) or undefined
   */
  get(name: string): RequestHandler | Array<RequestHandler> | undefined {
    return this.registry.get(name)?.handler;
  }

  /**
   * Check if a middleware is registered.
   *
   * @param name - Middleware name
   * @returns True if registered
   */
  has(name: string): boolean {
    return this.registry.has(name);
  }

  /**
   * Get all registered middleware names.
   *
   * @returns Array of registered names
   */
  getRegisteredNames(): Array<string> {
    return Array.from(this.registry.keys());
  }

  /**
   * Get all registered middleware entries.
   *
   * @returns Array of registered middleware
   */
  getAll(): Array<RegisteredMiddleware> {
    return Array.from(this.registry.values());
  }

  /**
   * Unregister a middleware by name.
   *
   * @param name - Middleware name
   * @returns True if removed
   */
  unregister(name: string): boolean {
    return this.registry.delete(name);
  }

  /**
   * Clear all registered middleware.
   */
  clear(): void {
    this.registry.clear();
  }

  /**
   * Normalize different handler types to RequestHandler or Array<RequestHandler>.
   */
  private normalizeHandler(
    handler: MiddlewareEntry,
  ): RequestHandler | Array<RequestHandler> {
    // If it's already a function (RequestHandler)
    if (typeof handler === "function") {
      return handler;
    }

    // If it's an array of handlers
    if (Array.isArray(handler)) {
      return handler.map((h) => {
        if (typeof h === "function") {
          return h;
        }
        // Handle ExpressoMiddleware in array
        const handlerObj = h as IExpressoMiddleware;
        if (
          handlerObj &&
          typeof handlerObj === "object" &&
          "use" in handlerObj &&
          typeof handlerObj.use === "function"
        ) {
          return handlerObj.use.bind(handlerObj);
        }
        throw new Error(`Invalid middleware in array: ${typeof h}`);
      });
    }

    // If it's an ExpressoMiddleware class instance
    const handlerObj = handler as IExpressoMiddleware;
    if (
      handlerObj &&
      typeof handlerObj === "object" &&
      "use" in handlerObj &&
      typeof handlerObj.use === "function"
    ) {
      return handlerObj.use.bind(handlerObj);
    }

    throw new Error(`Invalid middleware type: ${typeof handler}`);
  }
}

/**
 * Get the singleton middleware registry instance.
 *
 * @returns The global middleware registry
 * @public API
 */
export function getMiddlewareRegistry(): MiddlewareRegistry {
  if (!registryInstance) {
    registryInstance = new MiddlewareRegistry();
  }
  return registryInstance;
}

/**
 * Reset the middleware registry (for testing).
 *
 * @internal
 */
export function resetMiddlewareRegistry(): void {
  registryInstance = null;
}
