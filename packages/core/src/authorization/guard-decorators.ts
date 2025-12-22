import "reflect-metadata";
import { GUARD_METADATA_KEY } from "./guard-constants";
import type { IGuard, GuardClass, GuardMetadata } from "./guard.interface";

/**
 * Decorator to mark a class as a guard (for auto-discovery)
 * Similar to @Catch() for exception filters
 *
 * @param options - Guard options (priority, cacheable)
 * @returns ClassDecorator
 * @public API
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
 * Apply guards at controller or method level
 * Similar to @UseFilters() for exception filters
 *
 * @param guards - Guard classes or instances to apply
 * @returns ClassDecorator & MethodDecorator
 * @public API
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
