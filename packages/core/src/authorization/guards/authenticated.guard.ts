import { Guard } from "../guard-decorators.js";
import { injectable } from "../../di/inversify.js";
import type { IGuard, GuardContext } from "../guard.interface.js";
import { GuardResult } from "../guard.interface.js";
import { AppError } from "../../error/app-error.js";

/**
 * Guard that requires authentication
 * Checks if principal is authenticated
 *
 * @example
 * ```typescript
 * @controller("/api/users")
 * export class UserController {
 *   @Get("/profile")
 *   @UseGuards(AuthenticatedGuard)
 *   getProfile(@principal() principal: Principal) {
 *     return principal.details;
 *   }
 * }
 * ```
 * Note: Guards are instantiated dynamically by GuardRegistry, not via DI
 */
@Guard({ priority: 1, cacheable: true })
@injectable()
export class AuthenticatedGuard implements IGuard {
  async canActivate(context: GuardContext): Promise<GuardResult> {
    const isAuthenticated = await context.principal.isAuthenticated();

    if (!isAuthenticated) {
      return GuardResult.deny(AppError.unauthorized("Authentication required"));
    }

    return GuardResult.allow();
  }
}

/**
 * Factory function for convenience
 */
export const RequireAuth = (): AuthenticatedGuard => new AuthenticatedGuard();
