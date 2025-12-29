import "reflect-metadata";
import { INTERCEPTOR_METADATA_KEY } from "./interceptor-constants";
import type {
  IInterceptor,
  InterceptorClass,
  InterceptorMetadata,
} from "./interceptor.interface";

/**
 * Decorator to mark a class as an interceptor (for auto-discovery).
 *
 * @layer public
 * @audience application-developers
 * @concept interceptor-decorator
 * @difficulty beginner
 *
 * @summary Quick Start
 * Mark your interceptor class with `@Interceptor()` to enable auto-discovery.
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
 * @param options - Interceptor options
 * @param options.priority - Execution priority (lower = earlier, wraps later). Default: 100
 * @returns ClassDecorator
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Behavior**
 * - Registers interceptor metadata for auto-discovery
 * - Stores metadata in global registry via Reflect
 * - InterceptorRegistry discovers interceptors during initialization
 *
 * **Priority System**
 * - Lower priority = earlier execution (outermost wrapper)
 * - Logging interceptors typically use priority 1-10
 * - Caching interceptors typically use priority 20-50
 * - Transformation interceptors typically use priority 50-100+
 *
 * @see {@link InterceptorRegistry} for auto-discovery mechanism
 * @see {@link UseInterceptors} for applying interceptors to routes
 *
 * @public API
 */
export function Interceptor(options?: { priority?: number }): ClassDecorator {
  return (target: NewableFunction) => {
    const metadata: InterceptorMetadata = {
      priority: options?.priority ?? 100,
      interceptor: target,
    };

    Reflect.defineMetadata(
      INTERCEPTOR_METADATA_KEY.interceptor,
      metadata,
      target,
    );

    // Register in global registry for auto-discovery
    const existingInterceptors =
      (Reflect.getMetadata(
        INTERCEPTOR_METADATA_KEY.interceptor,
        Reflect,
      ) as Array<InterceptorMetadata>) || [];

    const newInterceptors = [...existingInterceptors, metadata];
    Reflect.defineMetadata(
      INTERCEPTOR_METADATA_KEY.interceptor,
      newInterceptors,
      Reflect,
    );
  };
}

/**
 * Apply interceptors at controller or method level.
 *
 * @layer public
 * @audience application-developers
 * @concept interceptor-application
 * @difficulty beginner
 *
 * @summary Quick Start
 * Apply interceptors to routes for cross-cutting concerns like logging, caching, transformation.
 *
 * @example
 * ```typescript
 * // Controller-level interceptors (apply to all methods)
 * @UseInterceptors(LoggingInterceptor)
 * @controller("/users")
 * export class UserController {
 *   @Get("/")
 *   getUsers() {
 *     // LoggingInterceptor applies to all methods
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Method-level interceptors
 * @controller("/users")
 * export class UserController {
 *   @Get("/:id")
 *   @UseInterceptors(CacheInterceptor, LoggingInterceptor)
 *   getUser(@param("id") id: string) {
 *     // Both interceptors apply to this method
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // With conditional interceptors
 * @Get("/data")
 * @UseInterceptors(
 *   whenInterceptor(ctx => ctx.getRequest().headers['x-cache'], CacheInterceptor),
 *   LoggingInterceptor
 * )
 * getData() {}
 * ```
 *
 * @param interceptors - Interceptor classes or instances to apply
 * @returns ClassDecorator & MethodDecorator
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Behavior**
 * - Stores interceptor metadata on controller/method
 * - Method-level interceptors are combined with controller-level
 * - Interceptors are resolved and executed by InterceptorExecutor
 * - Execution order follows interceptor priority
 *
 * **Interceptor Resolution**
 * - InterceptorRegistry resolves interceptor instances
 * - Supports both interceptor classes and instances
 * - Conditional interceptors are evaluated at runtime
 *
 * @see {@link Interceptor} for creating interceptors
 * @see {@link InterceptorExecutor} for execution logic
 *
 * @public API
 */
export function UseInterceptors(
  ...interceptors: Array<IInterceptor | InterceptorClass | unknown>
): ClassDecorator & MethodDecorator {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    target: any,
    propertyKey?: string | symbol,
  ) => {
    if (propertyKey) {
      // Method-level interceptors
      const existingInterceptors =
        (Reflect.getMetadata(
          INTERCEPTOR_METADATA_KEY.methodInterceptors,
          target.constructor,
          propertyKey,
        ) as Array<IInterceptor | InterceptorClass | unknown>) || [];

      const newInterceptors = [...existingInterceptors, ...interceptors];
      Reflect.defineMetadata(
        INTERCEPTOR_METADATA_KEY.methodInterceptors,
        newInterceptors,
        target.constructor,
        propertyKey,
      );
    } else {
      // Controller-level interceptors
      const existingInterceptors =
        (Reflect.getMetadata(
          INTERCEPTOR_METADATA_KEY.controllerInterceptors,
          target,
        ) as Array<IInterceptor | InterceptorClass | unknown>) || [];

      const newInterceptors = [...existingInterceptors, ...interceptors];
      Reflect.defineMetadata(
        INTERCEPTOR_METADATA_KEY.controllerInterceptors,
        newInterceptors,
        target,
      );
    }
  };
}
