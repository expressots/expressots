import "reflect-metadata";
import { EXCEPTION_FILTER_METADATA_KEY } from "./exception-filter-constants";
import type {
  IExceptionFilter,
  ExceptionFilterMetadata,
  ErrorConstructor,
} from "./exception-filter.interface";

/**
 * Decorator to mark a class as an exception filter for specific exception types.
 *
 * @layer public
 * @audience application-developers
 * @concept exception-filter
 * @difficulty intermediate
 *
 * @summary Quick Start
 * Create exception filters to handle specific error types.
 *
 * @example
 * ```typescript
 * @Catch(AppError)
 * export class AppErrorFilter extends BaseExceptionFilter {
 *   catch(exception: AppError, context: ExceptionContext): void {
 *     // Handle AppError
 *   }
 * }
 * ```
 *
 * @param exceptionTypes - Exception types this filter handles. If empty, handles all exceptions.
 * @returns ClassDecorator
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Behavior**
 * - Stores filter metadata in Reflect
 * - Registers in global registry for auto-discovery
 * - ExceptionFilterRegistry discovers filters during initialization
 * - Supports inheritance matching (parent filters handle child exceptions)
 *
 * **Exception Matching**
 * - Exact type match (highest priority)
 * - Parent type match (inheritance)
 * - Global catch-all (Error base class)
 *
 * @see {@link ExceptionFilterRegistry} for auto-discovery mechanism
 * @see {@link UseFilters} for applying filters to routes
 *
 * @layer advanced
 * @audience power-users
 *
 * **Advanced Usage**
 *
 * Catch multiple exception types:
 * ```typescript
 * @Catch(ValidationError, TypeError)
 * export class ValidationErrorFilter extends BaseExceptionFilter {
 *   catch(exception: Error, context: ExceptionContext): void {
 *     // Handle both ValidationError and TypeError
 *   }
 * }
 * ```
 *
 * Global catch-all filter:
 * ```typescript
 * @Catch()  // No types = catch all
 * export class GlobalExceptionFilter extends BaseExceptionFilter {
 *   catch(exception: Error, context: ExceptionContext): void {
 *     // Handle all unhandled exceptions
 *   }
 * }
 * ```
 *
 * @public API
 */
export function Catch(
  ...exceptionTypes: Array<ErrorConstructor>
): ClassDecorator {
  return (target: NewableFunction) => {
    // If no exception types provided, catch all (Error base class)
    const typesToCatch = exceptionTypes.length > 0 ? exceptionTypes : [Error];

    const metadata: ExceptionFilterMetadata = {
      exceptionTypes: typesToCatch,
      filter: target,
    };

    Reflect.defineMetadata(
      EXCEPTION_FILTER_METADATA_KEY.exceptionFilter,
      metadata,
      target,
    );

    // Register filter in global registry for auto-discovery
    const existingFilters =
      (Reflect.getMetadata(
        EXCEPTION_FILTER_METADATA_KEY.exceptionFilter,
        Reflect,
      ) as Array<ExceptionFilterMetadata>) || [];

    const newFilters = [...existingFilters, metadata];
    Reflect.defineMetadata(
      EXCEPTION_FILTER_METADATA_KEY.exceptionFilter,
      newFilters,
      Reflect,
    );
  };
}

/**
 * Decorator to apply exception filters at controller or method level.
 *
 * @layer public
 * @audience application-developers
 * @concept exception-filter-application
 * @difficulty beginner
 *
 * @summary Quick Start
 * Apply exception filters to protect routes with custom error handling.
 *
 * @example
 * ```typescript
 * // Controller-level filter
 * @UseFilters(AppErrorFilter, ValidationErrorFilter)
 * @controller("/users")
 * export class UserController {
 *   @Get("/")
 *   getUsers() {
 *     // Both filters apply to all methods
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Method-level filter (overrides controller-level)
 * @controller("/users")
 * export class UserController {
 *   @Get("/")
 *   @UseFilters(NotFoundFilter) // Only this filter applies
 *   getUser(@param("id") id: string) {
 *     // Only NotFoundFilter applies
 *   }
 * }
 * ```
 *
 * @param filters - Exception filter classes to apply
 * @returns ClassDecorator & MethodDecorator
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Behavior**
 * - Stores filter metadata on controller/method
 * - Method-level filters override controller-level filters
 * - Filters are resolved and executed by ExceptionHandlerMiddleware
 * - Execution order: method filters → controller filters → global filters
 *
 * @see {@link Catch} for creating exception filters
 * @see {@link ExceptionHandlerMiddleware} for execution logic
 *
 * @public API
 */
export function UseFilters(
  ...filters: Array<new (...args: Array<unknown>) => IExceptionFilter>
): ClassDecorator & MethodDecorator {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    target: any,
    propertyKey?: string | symbol,
  ) => {
    if (propertyKey) {
      // Method-level filter
      const existingFilters =
        (Reflect.getMetadata(
          EXCEPTION_FILTER_METADATA_KEY.methodExceptionFilters,
          target.constructor,
          propertyKey,
        ) as Array<new (...args: Array<unknown>) => IExceptionFilter>) || [];

      const newFilters = [...existingFilters, ...filters];
      Reflect.defineMetadata(
        EXCEPTION_FILTER_METADATA_KEY.methodExceptionFilters,
        newFilters,
        target.constructor,
        propertyKey,
      );
    } else {
      // Controller-level filter
      const existingFilters =
        (Reflect.getMetadata(
          EXCEPTION_FILTER_METADATA_KEY.controllerExceptionFilters,
          target,
        ) as Array<new (...args: Array<unknown>) => IExceptionFilter>) || [];

      const newFilters = [...existingFilters, ...filters];
      Reflect.defineMetadata(
        EXCEPTION_FILTER_METADATA_KEY.controllerExceptionFilters,
        newFilters,
        target,
      );
    }
  };
}
