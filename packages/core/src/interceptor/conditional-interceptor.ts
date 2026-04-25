import type {
  IInterceptor,
  InterceptorClass,
  ExecutionContext,
  ConditionalInterceptor,
} from "./interceptor.interface.js";

/**
 * Create a conditional interceptor that only runs when condition is true.
 *
 * @layer public
 * @audience application-developers
 * @concept conditional-interceptor
 * @difficulty beginner
 *
 * @summary Quick Start
 * Use `whenInterceptor()` to conditionally execute an interceptor based on request context.
 *
 * @example
 * ```typescript
 * // Only cache when x-cache header is present
 * @Get("/data")
 * @UseInterceptors(
 *   whenInterceptor(ctx => ctx.getRequest().headers['x-cache'] === 'true', CacheInterceptor),
 *   LoggingInterceptor
 * )
 * getData() {}
 * ```
 *
 * @example
 * ```typescript
 * // Async condition support
 * @Get("/premium")
 * @UseInterceptors(
 *   whenInterceptor(async ctx => {
 *     const user = await getUser(ctx.getRequest());
 *     return user.isPremium;
 *   }, PremiumFeaturesInterceptor)
 * )
 * getPremiumData() {}
 * ```
 *
 * @param condition - Function returning true if interceptor should run
 * @param interceptor - Interceptor class or instance to conditionally execute
 * @returns ConditionalInterceptor that can be used with @UseInterceptors()
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Behavior**
 * - Returns a marker object identified by `__isConditional: true`
 * - InterceptorExecutor evaluates condition at runtime
 * - If condition returns true, interceptor is executed
 * - If condition returns false, interceptor is skipped
 *
 * @public API
 */
export function whenInterceptor(
  condition: (context: ExecutionContext) => boolean | Promise<boolean>,
  interceptor: IInterceptor | InterceptorClass,
): ConditionalInterceptor {
  return {
    __isConditional: true,
    condition,
    interceptor,
    type: "when",
  };
}

/**
 * Create a conditional interceptor that runs unless condition is true.
 *
 * @layer public
 * @audience application-developers
 * @concept conditional-interceptor
 * @difficulty beginner
 *
 * @summary Quick Start
 * Use `unlessInterceptor()` to skip an interceptor when condition is true.
 *
 * @example
 * ```typescript
 * // Skip caching for authenticated requests
 * @Get("/data")
 * @UseInterceptors(
 *   unlessInterceptor(ctx => ctx.getRequest().headers['authorization'], CacheInterceptor),
 *   LoggingInterceptor
 * )
 * getData() {}
 * ```
 *
 * @example
 * ```typescript
 * // Skip rate limiting for internal requests
 * @Post("/api")
 * @UseInterceptors(
 *   unlessInterceptor(ctx => ctx.getRequest().headers['x-internal'] === 'true', RateLimitInterceptor)
 * )
 * handleApi() {}
 * ```
 *
 * @param condition - Function returning true if interceptor should be SKIPPED
 * @param interceptor - Interceptor class or instance to conditionally skip
 * @returns ConditionalInterceptor that can be used with @UseInterceptors()
 *
 * @public API
 */
export function unlessInterceptor(
  condition: (context: ExecutionContext) => boolean | Promise<boolean>,
  interceptor: IInterceptor | InterceptorClass,
): ConditionalInterceptor {
  return {
    __isConditional: true,
    condition,
    interceptor,
    type: "unless",
  };
}
