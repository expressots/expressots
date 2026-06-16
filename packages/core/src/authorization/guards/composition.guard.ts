import type { IGuard, GuardContext, GuardClass } from "../guard.interface.js";
import { GuardResult } from "../guard.interface.js";

/**
 * Combine multiple guards (all must pass)
 *
 * @example
 * ```typescript
 * @controller("/api/sensitive")
 * export class SensitiveController {
 *   @Get("/")
 *   @UseGuards(
 *     combineGuards(
 *       RequireAuth(),
 *       RequireRoles("admin"),
 *       RequirePermission("sensitive:read")
 *     )
 *   )
 *   getSensitive() {}
 * }
 * ```
 */
export function combineGuards(...guards: Array<IGuard | GuardClass>): IGuard {
  return {
    async canActivate(context: GuardContext): Promise<GuardResult> {
      for (const guard of guards) {
        const guardInstance =
          typeof guard === "function" ? new (guard as GuardClass)() : guard;
        const result = await guardInstance.canActivate(context);
        const guardResult =
          result instanceof GuardResult
            ? result
            : result
              ? GuardResult.allow()
              : GuardResult.deny();

        if (!guardResult.allowed) {
          return guardResult;
        }
      }
      return GuardResult.allow();
    },
    priority: 100,
  };
}

/**
 * Sequence guards (sequential dependencies)
 * Same implementation as combineGuards but different semantic meaning
 *
 * @example
 * ```typescript
 * @controller("/api/data")
 * export class DataController {
 *   @Get("/")
 *   @UseGuards(
 *     sequenceGuards(
 *       LoggingGuard,
 *       AuditGuard,
 *       RequireAuth()
 *     )
 *   )
 *   getData() {}
 * }
 * ```
 */
export function sequenceGuards(...guards: Array<IGuard | GuardClass>): IGuard {
  return combineGuards(...guards);
}
