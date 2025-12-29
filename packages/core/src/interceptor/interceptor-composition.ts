import type {
  IInterceptor,
  InterceptorClass,
  ComposedInterceptor,
} from "./interceptor.interface";

/**
 * Compose multiple interceptors into a pipeline.
 *
 * @layer public
 * @audience application-developers
 * @concept interceptor-composition
 * @difficulty beginner
 *
 * @summary Quick Start
 * Use `pipeInterceptors()` to group interceptors that should run in sequence.
 * Each interceptor wraps the next in the pipeline.
 *
 * @example
 * ```typescript
 * // All interceptors run in sequence
 * @Get("/api/data")
 * @UseInterceptors(
 *   pipeInterceptors(
 *     ValidationInterceptor,
 *     TransformInterceptor,
 *     CacheInterceptor,
 *     LoggingInterceptor
 *   )
 * )
 * getData() {}
 * ```
 *
 * @example
 * ```typescript
 * // Reusable interceptor pipeline
 * const apiPipeline = pipeInterceptors(
 *   ValidationInterceptor,
 *   TransformInterceptor,
 *   LoggingInterceptor
 * );
 *
 * @Get("/users")
 * @UseInterceptors(apiPipeline)
 * getUsers() {}
 * ```
 *
 * @param interceptors - Interceptor classes or instances to compose
 * @returns ComposedInterceptor that can be used with @UseInterceptors()
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Behavior**
 * - Returns a marker object identified by `__isComposed: true`
 * - InterceptorExecutor flattens composed interceptors
 * - All interceptors are executed in pipeline order
 * - `mode: "pipe"` indicates sequential pipeline execution
 *
 * @public API
 */
export function pipeInterceptors(
  ...interceptors: Array<IInterceptor | InterceptorClass>
): ComposedInterceptor {
  return {
    __isComposed: true,
    interceptors,
    mode: "pipe",
  };
}

/**
 * Combine multiple interceptors with all-must-pass semantics.
 *
 * @layer public
 * @audience application-developers
 * @concept interceptor-composition
 * @difficulty beginner
 *
 * @summary Quick Start
 * Use `combineInterceptors()` to group interceptors that all must complete successfully.
 * Semantically indicates that all interceptors are required.
 *
 * @example
 * ```typescript
 * // All interceptors must pass
 * @Post("/secure")
 * @UseInterceptors(
 *   combineInterceptors(
 *     AuthInterceptor,
 *     RateLimitInterceptor,
 *     ValidationInterceptor
 *   )
 * )
 * secureEndpoint() {}
 * ```
 *
 * @example
 * ```typescript
 * // Reusable security interceptor group
 * const securityInterceptors = combineInterceptors(
 *   AuthInterceptor,
 *   RateLimitInterceptor,
 *   CSRFInterceptor
 * );
 *
 * @Post("/api")
 * @UseInterceptors(securityInterceptors)
 * handleApi() {}
 * ```
 *
 * @param interceptors - Interceptor classes or instances to combine
 * @returns ComposedInterceptor that can be used with @UseInterceptors()
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Behavior**
 * - Returns a marker object identified by `__isComposed: true`
 * - InterceptorExecutor flattens composed interceptors
 * - All interceptors are executed in pipeline order
 * - `mode: "combine"` indicates all-must-pass semantics
 *
 * **Note**: Functionally identical to `pipeInterceptors()` but semantically
 * indicates that ALL interceptors are required (similar to AND logic).
 *
 * @public API
 */
export function combineInterceptors(
  ...interceptors: Array<IInterceptor | InterceptorClass>
): ComposedInterceptor {
  return {
    __isComposed: true,
    interceptors,
    mode: "combine",
  };
}
