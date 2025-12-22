import { Guard } from "../guard-decorators";
import { injectable } from "../../di/inversify";
import type { IGuard, GuardContext } from "../guard.interface";
import { GuardResult } from "../guard.interface";
import { AppError } from "../../error/app-error";

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

