import "reflect-metadata";
import { GUARD_METADATA_KEY } from "./guard-constants";
import type { IGuard, GuardClass, GuardMetadata } from "./guard.interface";

/**
 * Decorator to mark a class as a guard (for auto-discovery).
 *
 * @layer public
 * @audience application-developers
 * @concept guard-decorator
 * @difficulty beginner
 *
 * @summary Quick Start
 * Mark your guard class with `@Guard()` to enable auto-discovery.
 *
 * @example
 * ```typescript
 * @Guard({ priority: 1, cacheable: true })
 * @provide(AuthenticatedGuard)
 * export class AuthenticatedGuard implements IGuard {
 *   async canActivate(context: GuardContext): Promise<GuardResult> {
 *     const isAuthenticated = await context.principal.isAuthenticated();
 *     return isAuthenticated ? GuardResult.allow() : GuardResult.deny();
 *   }
 * }
 * ```
 *
 * @param options - Guard options
 * @param options.priority - Execution priority (lower = earlier). Default: 100
 * @param options.cacheable - Whether result can be cached. Default: false
 * @returns ClassDecorator
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Behavior**
 * - Registers guard metadata for auto-discovery
 * - Stores metadata in global registry via Reflect
 * - GuardRegistry discovers guards during initialization
 *
 * **Priority System**
 * - Lower priority = earlier execution
 * - Authentication guards typically use priority 1-10
 * - Authorization guards typically use priority 50-100
 * - Resource guards typically use priority 100+
 *
 * @see {@link GuardRegistry} for auto-discovery mechanism
 * @see {@link UseGuards} for applying guards to routes
 *
 * @public API
 */
export function Guard(options?: {
  priority?: number;
  cacheable?: boolean;
}): ClassDecorator {
  return (target: NewableFunction) => {
    const metadata: GuardMetadata = {
      priority: options?.priority ?? 100,
      cacheable: options?.cacheable ?? false,
      guard: target,
    };

    Reflect.defineMetadata(GUARD_METADATA_KEY.guard, metadata, target);

    // Register in global registry for auto-discovery
    const existingGuards =
      (Reflect.getMetadata(
        GUARD_METADATA_KEY.guard,
        Reflect,
      ) as Array<GuardMetadata>) || [];

    const newGuards = [...existingGuards, metadata];
    Reflect.defineMetadata(GUARD_METADATA_KEY.guard, newGuards, Reflect);
  };
}

/**
 * Apply guards at controller or method level.
 *
 * @layer public
 * @audience application-developers
 * @concept guard-application
 * @difficulty beginner
 *
 * @summary Quick Start
 * Apply guards to protect routes. Can be used at controller or method level.
 *
 * @example
 * ```typescript
 * // Controller-level guards
 * @UseGuards(AuthenticatedGuard, RoleGuard)
 * @controller("/users")
 * export class UserController {
 *   @Get("/")
 *   getUsers() {
 *     // Both guards apply to all methods
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Method-level guards (overrides controller-level)
 * @controller("/users")
 * export class UserController {
 *   @Get("/:id")
 *   @UseGuards(ResourceOwnerGuard) // Only this guard applies
 *   getUser(@param("id") id: string) {
 *     // Only ResourceOwnerGuard applies
 *   }
 * }
 * ```
 *
 * @param guards - Guard classes or instances to apply
 * @returns ClassDecorator & MethodDecorator
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Behavior**
 * - Stores guard metadata on controller/method
 * - Method-level guards override controller-level guards
 * - Guards are resolved and executed by GuardExecutor
 * - Execution order follows guard priority
 *
 * **Guard Resolution**
 * - GuardRegistry resolves guard instances
 * - Supports both guard classes and instances
 * - Factory functions (RequireAuth, RequireRole) create instances dynamically
 *
 * @see {@link Guard} for creating guards
 * @see {@link GuardExecutor} for execution logic
 *
 * @layer advanced
 * @audience power-users
 *
 * **Advanced Usage**
 *
 * Combining multiple guards:
 * ```typescript
 * @UseGuards(AuthenticatedGuard, RequireRole("admin"), RequirePermission("users:read"))
 * ```
 *
 * Conditional guards:
 * ```typescript
 * @UseGuards(ConditionalGuard(() => process.env.NODE_ENV === "production"))
 * ```
 *
 * @public API
 */
export function UseGuards(
  ...guards: Array<IGuard | GuardClass>
): ClassDecorator & MethodDecorator {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    target: any,
    propertyKey?: string | symbol,
  ) => {
    if (propertyKey) {
      // Method-level guards
      const existingGuards =
        (Reflect.getMetadata(
          GUARD_METADATA_KEY.methodGuards,
          target.constructor,
          propertyKey,
        ) as Array<IGuard | GuardClass>) || [];

      const newGuards = [...existingGuards, ...guards];
      Reflect.defineMetadata(
        GUARD_METADATA_KEY.methodGuards,
        newGuards,
        target.constructor,
        propertyKey,
      );
    } else {
      // Controller-level guards
      const existingGuards =
        (Reflect.getMetadata(
          GUARD_METADATA_KEY.controllerGuards,
          target,
        ) as Array<IGuard | GuardClass>) || [];

      const newGuards = [...existingGuards, ...guards];
      Reflect.defineMetadata(
        GUARD_METADATA_KEY.controllerGuards,
        newGuards,
        target,
      );
    }
  };
}
