import type { Middleware } from "./interfaces.js";

/**
 * Configuration object for composed middleware.
 * Represents a group of middleware that should be executed together.
 */
export interface ComposedMiddlewareConfig {
  /**
   * Array of middleware to execute.
   * Can be any valid ExpressoTS middleware type (function, class instance, class reference, or container-bound).
   */
  middleware: Array<Middleware>;

  /**
   * Composition type: 'combine' or 'sequence'.
   * - 'combine': All middleware execute sequentially, errors propagate normally
   * - 'sequence': Middleware execute sequentially, execution stops on error
   */
  type: "combine" | "sequence";

  /**
   * Symbol to identify composed middleware configuration objects.
   * Used internally for type checking.
   */
  [COMPOSED_MIDDLEWARE_SYMBOL]: true;
}

/**
 * Symbol to identify composed middleware configuration objects.
 * Used internally for type checking.
 */
export const COMPOSED_MIDDLEWARE_SYMBOL = Symbol("ComposedMiddleware");

/**
 * Type guard to check if an object is a ComposedMiddlewareConfig.
 */
export function isComposedMiddleware(item: unknown): item is ComposedMiddlewareConfig {
  return (
    typeof item === "object" &&
    item !== null &&
    COMPOSED_MIDDLEWARE_SYMBOL in item &&
    "middleware" in item &&
    "type" in item &&
    Array.isArray((item as ComposedMiddlewareConfig).middleware) &&
    ((item as ComposedMiddlewareConfig).type === "combine" ||
      (item as ComposedMiddlewareConfig).type === "sequence")
  );
}

/**
 * Combines multiple middleware into a single middleware that executes all of them sequentially.
 * All middleware will execute in order. If any middleware calls `next(error)`, the error
 * is propagated to Express's error handling system.
 *
 * @param middleware - Array of middleware to combine
 * @returns ComposedMiddlewareConfig object
 *
 * @example
 * ```typescript
 * // Combine multiple middleware into a reusable group
 * @Get("/api", combine(AuthMiddleware, LoggingMiddleware, RateLimitMiddleware))
 * async apiHandler() {}
 * ```
 *
 * @example
 * ```typescript
 * // Combine with conditional middleware (Phase 3)
 * @Get("/admin",
 *   when(req => req.method === "POST", combine(BodyParser, ValidationMiddleware)),
 *   combine(AuthMiddleware, LoggingMiddleware)
 * )
 * async adminHandler() {}
 * ```
 */
export function combine(...middleware: Array<Middleware>): ComposedMiddlewareConfig {
  if (middleware.length === 0) {
    throw new Error("combine() requires at least one middleware");
  }

  return {
    middleware,
    type: "combine",
    [COMPOSED_MIDDLEWARE_SYMBOL]: true,
  };
}

/**
 * Sequences multiple middleware that execute one after another.
 * Similar to `combine()`, but semantically indicates sequential execution
 * where each middleware depends on the previous one completing successfully.
 * If any middleware calls `next(error)`, execution stops and the error is propagated.
 *
 * @param middleware - Array of middleware to sequence
 * @returns ComposedMiddlewareConfig object
 *
 * @example
 * ```typescript
 * // Sequence middleware where each depends on the previous
 * @Get("/api", sequence(ValidateMiddleware, TransformMiddleware, ProcessMiddleware))
 * async apiHandler() {}
 * ```
 *
 * @example
 * ```typescript
 * // Sequence with conditional middleware
 * @Get("/data",
 *   when(req => req.method === "POST", sequence(BodyParser, ValidateMiddleware)),
 *   sequence(AuthMiddleware, ProcessMiddleware)
 * )
 * async dataHandler() {}
 * ```
 */
export function sequence(...middleware: Array<Middleware>): ComposedMiddlewareConfig {
  if (middleware.length === 0) {
    throw new Error("sequence() requires at least one middleware");
  }

  return {
    middleware,
    type: "sequence",
    [COMPOSED_MIDDLEWARE_SYMBOL]: true,
  };
}
