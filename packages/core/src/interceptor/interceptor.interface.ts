import { Request, Response } from "express";
import type { Container, interfaces } from "../di/inversify";

/**
 * Execution context providing comprehensive information for interceptor decisions.
 *
 * @layer public
 * @audience application-developers
 * @concept execution-context
 * @difficulty beginner
 *
 * @summary Quick Start
 * ExecutionContext provides access to the request, response, and DI container
 * for making interception decisions and modifications.
 *
 * @example
 * ```typescript
 * async intercept(context: ExecutionContext, next: CallHandler) {
 *   const request = context.getRequest();
 *   const startTime = Date.now();
 *   const result = await next.handle();
 *   console.log(`Request to ${request.path} took ${Date.now() - startTime}ms`);
 *   return result;
 * }
 * ```
 *
 * @public API
 */
export interface ExecutionContext {
  /**
   * Get the Express request object
   */
  getRequest(): Request;

  /**
   * Get the Express response object
   */
  getResponse(): Response;

  /**
   * Get the DI container (request-scoped child container)
   */
  getContainer(): Container;

  /**
   * Get scoped service from container
   * @param identifier - Service identifier
   * @param scopeName - Optional scope name (e.g., "tenant")
   */
  getScoped<T>(
    identifier: interfaces.ServiceIdentifier<T>,
    scopeName?: string,
  ): T;

  /**
   * Get controller class
   */
  getClass(): NewableFunction;

  /**
   * Get method/handler name
   */
  getHandler(): string;

  /**
   * Get route information
   */
  getRoute(): {
    path: string;
    method: string;
    params: Record<string, unknown>;
    query: Record<string, unknown>;
  };

  /**
   * Get/set custom data on context for passing between interceptors
   */
  getData<T = unknown>(key: string): T | undefined;
  setData<T = unknown>(key: string, value: T): void;
}

/**
 * Call handler for executing the next interceptor or the route handler.
 *
 * @layer public
 * @audience application-developers
 * @concept call-handler
 * @difficulty beginner
 *
 * @summary Quick Start
 * Use `next.handle()` to continue to the next interceptor or route handler.
 *
 * @example
 * ```typescript
 * async intercept(context: ExecutionContext, next: CallHandler) {
 *   // Before route handler
 *   console.log('Before...');
 *
 *   const result = await next.handle(); // Execute route handler
 *
 *   // After route handler
 *   console.log('After...');
 *
 *   return result; // Return (optionally transformed) result
 * }
 * ```
 *
 * @public API
 */
export interface CallHandler<T = unknown> {
  /**
   * Execute the next interceptor in the chain or the route handler.
   * @returns Promise with the result from the handler
   */
  handle(): Promise<T>;
}

/**
 * Interceptor interface for AOP (Aspect-Oriented Programming) cross-cutting concerns.
 *
 * @layer public
 * @audience application-developers
 * @concept interceptor-interface
 * @difficulty intermediate
 *
 * @summary Quick Start
 * Implement this interface to create custom interceptors for logging, caching,
 * transformation, error handling, and other cross-cutting concerns.
 *
 * @example
 * ```typescript
 * @Interceptor({ priority: 1 })
 * @provide(LoggingInterceptor)
 * export class LoggingInterceptor implements IInterceptor {
 *   async intercept(context: ExecutionContext, next: CallHandler) {
 *     const start = Date.now();
 *     const result = await next.handle();
 *     console.log(`Execution time: ${Date.now() - start}ms`);
 *     return result;
 *   }
 * }
 * ```
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Architecture**
 *
 * Interceptors are executed by InterceptorExecutor in priority order:
 * 1. Resolved from registry or container
 * 2. Sorted by priority (lower = earlier)
 * 3. Executed in pipeline (each wraps the next)
 * 4. Response can be transformed at each step
 *
 * **Execution Flow**
 * ```
 * Request → Interceptor1.before → Interceptor2.before → Handler
 *                                                         ↓
 * Response ← Interceptor1.after ← Interceptor2.after ← Result
 * ```
 *
 * @layer advanced
 * @audience power-users
 *
 * **Advanced Patterns**
 *
 * Caching interceptor:
 * ```typescript
 * @Interceptor({ priority: 1 })
 * export class CacheInterceptor implements IInterceptor {
 *   private cache = new Map();
 *   async intercept(context: ExecutionContext, next: CallHandler) {
 *     const key = context.getRequest().url;
 *     if (this.cache.has(key)) return this.cache.get(key);
 *     const result = await next.handle();
 *     this.cache.set(key, result);
 *     return result;
 *   }
 * }
 * ```
 *
 * @public API
 */
export interface IInterceptor<T = unknown> {
  /**
   * Intercept the request/response pipeline.
   *
   * @layer public
   * @audience application-developers
   *
   * @param context - Execution context with request, response, container info
   * @param next - Call handler to proceed to next interceptor or route handler
   * @returns The (optionally transformed) result
   *
   * @example
   * ```typescript
   * async intercept(context: ExecutionContext, next: CallHandler) {
   *   // Pre-processing
   *   console.log('Before handler...');
   *
   *   try {
   *     // Call next interceptor or handler
   *     const result = await next.handle();
   *
   *     // Post-processing - transform response
   *     return { data: result, timestamp: Date.now() };
   *   } catch (error) {
   *     // Error handling
   *     console.error('Handler error:', error);
   *     throw error;
   *   }
   * }
   * ```
   *
   * @public API
   */
  intercept(context: ExecutionContext, next: CallHandler<T>): Promise<T>;

  /**
   * Optional: Execution priority (lower = earlier, wraps later interceptors).
   * Default: 100
   *
   * @default 100
   *
   * Useful for interceptors that must run before others (e.g., logging before caching).
   *
   * **Common Priorities:**
   * - 1-10: Logging interceptors (wrap everything)
   * - 20-50: Caching interceptors
   * - 50-100: Transformation interceptors
   * - 100+: Response modification interceptors
   *
   * @example
   * ```typescript
   * @Interceptor({ priority: 1 })  // Runs first (outermost wrapper)
   * export class LoggingInterceptor implements IInterceptor { }
   * ```
   */
  priority?: number;
}

/**
 * Type for interceptor class constructor
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InterceptorClass = new (...args: Array<any>) => IInterceptor;

/**
 * Metadata for interceptor registration
 */
export interface InterceptorMetadata {
  /**
   * Execution priority
   */
  priority: number;

  /**
   * The interceptor class
   */
  interceptor: NewableFunction;
}

/**
 * Options for conditional interceptor execution
 */
export interface ConditionalInterceptorOptions {
  /**
   * Condition function to determine if interceptor should run
   */
  condition: (context: ExecutionContext) => boolean | Promise<boolean>;

  /**
   * The interceptor to conditionally execute
   */
  interceptor: IInterceptor | InterceptorClass;
}

/**
 * Marker interface for composed interceptors
 */
export interface ComposedInterceptor {
  __isComposed: true;
  interceptors: Array<IInterceptor | InterceptorClass>;
  mode: "pipe" | "combine";
}

/**
 * Marker interface for conditional interceptors
 */
export interface ConditionalInterceptor {
  __isConditional: true;
  condition: (context: ExecutionContext) => boolean | Promise<boolean>;
  interceptor: IInterceptor | InterceptorClass;
  type: "when" | "unless";
}

/**
 * Type guard for conditional interceptor
 */
export function isConditionalInterceptor(
  value: unknown,
): value is ConditionalInterceptor {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as ConditionalInterceptor).__isConditional === true
  );
}

/**
 * Type guard for composed interceptor
 */
export function isComposedInterceptor(
  value: unknown,
): value is ComposedInterceptor {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as ComposedInterceptor).__isComposed === true
  );
}
