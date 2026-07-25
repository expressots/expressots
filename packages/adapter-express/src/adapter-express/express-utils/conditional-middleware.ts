import type { Request } from "express";
import type { Middleware, MiddlewareClass } from "./interfaces.js";

/**
 * Type definition for middleware condition functions.
 * Can be synchronous (returns boolean) or asynchronous (returns Promise<boolean>).
 */
export type MiddlewareCondition = (req: Request) => boolean | Promise<boolean>;

/**
 * Configuration object for conditional middleware execution.
 * When the condition evaluates to true, the middleware is executed.
 * When false, the middleware is skipped and next() is called.
 */
export interface ConditionalMiddlewareConfig {
  /**
   * The condition function that determines whether the middleware should execute.
   * Receives the Express Request object and returns a boolean or Promise<boolean>.
   */
  condition: MiddlewareCondition;

  /**
   * The middleware to execute when the condition is true.
   * Can be any valid ExpressoTS middleware type (function, class instance, or container-bound).
   */
  middleware: Middleware;

  /**
   * Whether to skip middleware execution when condition is false.
   * Default: true (skip if condition is false, execute if true)
   * If false, the behavior is inverted (execute if condition is false).
   */
  skipOnFalse?: boolean;
}

/**
 * Symbol to identify conditional middleware configuration objects.
 * Used internally for type checking.
 */
export const CONDITIONAL_MIDDLEWARE_SYMBOL = Symbol("ConditionalMiddleware");

/**
 * Type guard to check if an object is a ConditionalMiddlewareConfig.
 */
export function isConditionalMiddleware(item: unknown): item is ConditionalMiddlewareConfig {
  return (
    typeof item === "object" &&
    item !== null &&
    "condition" in item &&
    "middleware" in item &&
    typeof (item as ConditionalMiddlewareConfig).condition === "function"
  );
}

/**
 * Creates a conditional middleware configuration that executes the middleware
 * when the condition evaluates to true.
 *
 * @param condition - Function that receives the Request and returns boolean or Promise<boolean>
 * @param middleware - The middleware to execute when condition is true
 * @returns ConditionalMiddlewareConfig object
 *
 * @example
 * ```typescript
 * // Phase 2: Class reference support - no 'new' keyword needed
 * @Get("/admin",
 *   when(req => req.hostname.startsWith("admin."), AdminMiddleware),
 *   AuthMiddleware
 * )
 * async adminHandler() {}
 * ```
 *
 * @example
 * ```typescript
 * // Async condition with class reference (Phase 2)
 * @Get("/api",
 *   when(async req => {
 *     const user = await getUser(req);
 *     return user.isAdmin;
 *   }, AdminMiddleware)
 * )
 * async apiHandler() {}
 * ```
 */
export function when(
  condition: MiddlewareCondition,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  middleware: Middleware | MiddlewareClass | any,
): ConditionalMiddlewareConfig {
  return {
    condition,
    middleware: middleware as Middleware,
    skipOnFalse: true,
  };
}

/**
 * Creates a conditional middleware configuration that executes the middleware
 * when the condition evaluates to false (inverse of `when`).
 *
 * @param condition - Function that receives the Request and returns boolean or Promise<boolean>
 * @param middleware - The middleware to execute when condition is false
 * @returns ConditionalMiddlewareConfig object
 *
 * @example
 * ```typescript
 * // Phase 2: Class reference support - no 'new' keyword needed
 * @Get("/public",
 *   unless(req => req.headers.authorization, AuthMiddleware)
 * )
 * async publicHandler() {}
 * ```
 *
 * @example
 * ```typescript
 * // Skip authentication for public routes (Phase 2: class reference)
 * @Get("/health",
 *   unless(req => req.path.startsWith("/api"), AuthMiddleware)
 * )
 * async healthCheck() {}
 * ```
 */
export function unless(
  condition: MiddlewareCondition,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  middleware: Middleware | MiddlewareClass | any,
): ConditionalMiddlewareConfig {
  return {
    condition: (req: Request): boolean | Promise<boolean> => {
      const result = condition(req);
      // Invert the condition: if condition returns Promise, return inverted Promise
      if (result instanceof Promise) {
        return result.then((value) => !value);
      }
      return !result;
    },
    middleware: middleware as Middleware,
    skipOnFalse: true,
  };
}
