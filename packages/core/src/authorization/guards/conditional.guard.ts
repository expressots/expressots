import type { IGuard, GuardContext, GuardClass } from "../guard.interface.js";
import { GuardResult } from "../guard.interface.js";

/**
 * Guard that executes conditionally (integrates with existing when/unless pattern)
 *
 * @example
 * ```typescript
 * @controller("/api/admin")
 * export class AdminController {
 *   @Get("/")
 *   @UseGuards(
 *     whenGuard(
 *       (ctx) => ctx.request.method === "POST",
 *       RequireRoles("super-admin")
 *     ),
 *     RequireRoles("admin")
 *   )
 *   adminAction() {}
 * }
 * ```
 */
export function whenGuard(
  condition: (context: GuardContext) => boolean | Promise<boolean>,
  guard: IGuard | GuardClass,
): IGuard {
  return {
    async canActivate(context: GuardContext): Promise<GuardResult> {
      const shouldExecute = await condition(context);

      if (!shouldExecute) {
        return GuardResult.allow(); // Skip guard
      }

      const guardInstance =
        typeof guard === "function" ? new (guard as GuardClass)() : guard;

      const result = await guardInstance.canActivate(context);
      return result instanceof GuardResult
        ? result
        : result
          ? GuardResult.allow()
          : GuardResult.deny();
    },
    priority: 50,
  };
}
