/**
 * ExpressoTS v4 Middleware Utilities
 *
 * Utility functions for route-level middleware usage.
 *
 * @module middleware-utils
 * @public API
 */

import type { Request, Response, NextFunction, RequestHandler } from "express";
import { getMiddlewareRegistry } from "./middleware-registry.js";

/**
 * Get registered middleware by name for use in route decorators.
 *
 * Uses **lazy resolution** - the middleware lookup happens at request time,
 * not at decorator evaluation time. This allows you to register middleware
 * in configureServices() and use them in decorators without timing issues.
 *
 * @example
 * ```typescript
 * import { use } from '@expressots/core';
 *
 * @controller('/users')
 * export class UserController {
 *
 *   // Single middleware by name
 *   @httpGet('/', ...use('auth'))
 *   async getUsers() { }
 *
 *   // Multiple middleware by names
 *   @httpPost('/', ...use('auth', 'validate-user', 'log-action'))
 *   async createUser() { }
 *
 *   // Mix named and inline
 *   @httpDelete('/:id', ...use('admin'), validateId)
 *   async deleteUser() { }
 * }
 * ```
 *
 * @param names - Names of registered middleware
 * @returns Array of Express handlers to spread into decorator
 * @throws Error if middleware is not registered (at request time)
 *
 * @public API
 */
export function use(...names: Array<string>): Array<RequestHandler> {
  // Return lazy wrappers for each name - resolution happens at request time
  return names.map((name) => createLazyMiddleware(name));
}

/**
 * Creates a lazy middleware wrapper that resolves the actual middleware
 * at request time instead of at decorator evaluation time.
 *
 * @internal
 */
function createLazyMiddleware(name: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const registry = getMiddlewareRegistry();
    const middleware = registry.get(name);

    if (!middleware) {
      const error = new Error(
        `Middleware '${name}' not registered. ` +
          `Register it in app.ts: this.Middleware.register('${name}', handler)`,
      );
      return next(error);
    }

    // If it's an array of middleware, compose them
    if (Array.isArray(middleware)) {
      const composed = composeHandlers(middleware);
      return composed(req, res, next);
    }

    // Single middleware
    return middleware(req, res, next);
  };
}

/**
 * Internal helper to compose an array of handlers.
 * @internal
 */
function composeHandlers(handlers: Array<RequestHandler>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    let index = 0;

    const runNext: NextFunction = (err?: unknown): void => {
      if (err) return next(err);
      if (index >= handlers.length) return next();

      const handler = handlers[index++];
      try {
        const result = handler(req, res, runNext) as void | Promise<void>;
        if (result && typeof result === "object" && "catch" in result) {
          (result as Promise<void>).catch(next);
        }
      } catch (error) {
        next(error as Error);
      }
    };

    runNext();
  };
}

/**
 * Compose multiple middleware into a single handler.
 *
 * This is useful when you want to create reusable middleware chains
 * that can be applied as a single middleware.
 *
 * @example
 * ```typescript
 * import { compose } from '@expressots/core';
 *
 * // Create a reusable auth chain
 * const authChain = compose(verifyJwt, loadUser, checkPermissions);
 *
 * // Use as single middleware
 * @httpGet('/', authChain)
 * async getUsers() { }
 *
 * // Compose with use()
 * @httpPost('/admin', compose(...use('auth'), validateBody))
 * async adminAction() { }
 * ```
 *
 * @param middlewares - Middleware handlers to compose
 * @returns Single composed middleware handler
 *
 * @public API
 */
export function compose(
  ...middlewares: Array<RequestHandler | Array<RequestHandler>>
): RequestHandler {
  // Flatten arrays
  const handlers: Array<RequestHandler> = middlewares.flat();

  return (req: Request, res: Response, next: NextFunction): void => {
    let index = 0;

    const runNext: NextFunction = (err?: unknown): void => {
      if (err) {
        return next(err);
      }

      if (index >= handlers.length) {
        return next();
      }

      const handler = handlers[index++];

      try {
        const result = handler(req, res, runNext) as void | Promise<void>;

        // Handle async middleware
        if (result && typeof result === "object" && "catch" in result) {
          (result as Promise<void>).catch(next);
        }
      } catch (error) {
        next(error as Error);
      }
    };

    runNext();
  };
}

/**
 * Create a conditional middleware wrapper.
 *
 * The middleware only executes if the condition returns true.
 *
 * @example
 * ```typescript
 * import { when } from '@expressots/core';
 *
 * // Only log in development
 * const devLogger = when(
 *   (req) => process.env.NODE_ENV === 'development',
 *   loggerMiddleware
 * );
 *
 * // Skip for health checks
 * const rateLimiter = when(
 *   (req) => !req.path.startsWith('/health'),
 *   rateLimitMiddleware
 * );
 * ```
 *
 * @param condition - Function that returns true to execute middleware
 * @param middleware - Middleware to conditionally execute
 * @returns Wrapped middleware
 *
 * @public API
 */
export function when(
  condition: (req: Request) => boolean,
  middleware: RequestHandler,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (condition(req)) {
      middleware(req, res, next);
    } else {
      next();
    }
  };
}

/**
 * Create a middleware that runs in parallel (non-blocking).
 *
 * Useful for logging, analytics, or other non-critical operations
 * that shouldn't block the response.
 *
 * @example
 * ```typescript
 * import { parallel } from '@expressots/core';
 *
 * // Non-blocking analytics
 * const analytics = parallel((req, res, next) => {
 *   trackEvent(req.path);
 *   next();
 * });
 * ```
 *
 * @param middleware - Middleware to run in parallel
 * @returns Non-blocking middleware wrapper
 *
 * @public API
 */
export function parallel(middleware: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Run middleware without waiting
    setImmediate(() => {
      middleware(req, res, () => {
        // Swallow the next call - it's parallel
      });
    });

    // Continue immediately
    next();
  };
}

/**
 * Create a middleware with timeout.
 *
 * If the middleware doesn't call next() within the timeout,
 * an error is passed to the error handler.
 *
 * @example
 * ```typescript
 * import { timeout } from '@expressots/core';
 *
 * // Wrap slow middleware with 5s timeout
 * const slowMiddleware = timeout(5000, expensiveOperation);
 * ```
 *
 * @param ms - Timeout in milliseconds
 * @param middleware - Middleware to wrap
 * @returns Wrapped middleware with timeout
 *
 * @public API
 */
export function timeout(
  ms: number,
  middleware: RequestHandler,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    let called = false;

    const timer = setTimeout(() => {
      if (!called) {
        called = true;
        const error = new Error(`Middleware timeout after ${ms}ms`);
        (error as Error & { status?: number }).status = 504;
        next(error);
      }
    }, ms);

    const wrappedNext: NextFunction = (err?: unknown): void => {
      if (!called) {
        called = true;
        clearTimeout(timer);
        next(err as Error);
      }
    };

    try {
      middleware(req, res, wrappedNext);
    } catch (error) {
      if (!called) {
        called = true;
        clearTimeout(timer);
        next(error);
      }
    }
  };
}
