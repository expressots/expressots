/**
 * Interceptor module - AOP (Aspect-Oriented Programming) for ExpressoTS
 *
 * @module interceptor
 *
 * Interceptors provide a powerful way to handle cross-cutting concerns like:
 * - Logging
 * - Caching
 * - Response transformation
 * - Performance tracking
 * - Error handling
 *
 * @example
 * ```typescript
 * // Create a custom interceptor
 * @Interceptor({ priority: 10 })
 * @provide(MyInterceptor)
 * export class MyInterceptor implements IInterceptor {
 *   async intercept(context: ExecutionContext, next: CallHandler) {
 *     console.log('Before...');
 *     const result = await next.handle();
 *     console.log('After...');
 *     return result;
 *   }
 * }
 *
 * // Apply to a route
 * @Get("/data")
 * @UseInterceptors(MyInterceptor)
 * getData() {}
 * ```
 */

// Core interfaces and types
export * from "./interceptor.interface.js";
export * from "./interceptor-constants.js";

// Decorators
export * from "./interceptor-decorators.js";

// Registry and Executor
export * from "./interceptor-registry.js";
export * from "./interceptor-executor.js";

// Conditional interceptors
export * from "./conditional-interceptor.js";

// Composition utilities
export * from "./interceptor-composition.js";

// Execution context
export * from "./execution-context.js";

// Built-in interceptors
export * from "./interceptors/index.js";
