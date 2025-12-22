import { Guard } from "../guard-decorators";
import { injectable } from "../../di/inversify";
import type { IGuard, GuardContext } from "../guard.interface";
import { GuardResult } from "../guard.interface";
import { AppError } from "../../error/app-error";

/**
 * Guard that requires specific roles
 * Checks if principal has any of the required roles
 *
 * @example
 * ```typescript
 * @controller("/api/admin")
 * export class AdminController {
 *   @Get("/users")
 *   @UseGuards(RoleGuard(["admin"]))
 *   getUsers() {}
 * }
 * ```
 * Note: Guards are instantiated dynamically by GuardRegistry, not via DI
 */
@Guard({ priority: 10, cacheable: true })
@injectable()
export class RoleGuard implements IGuard {
  constructor(private roles: Array<string>) {
    if (!roles || roles.length === 0) {
      throw new Error("RoleGuard requires at least one role");
    }
  }

  async canActivate(context: GuardContext): Promise<GuardResult> {
    // Check if user has any of the required roles
    const roleChecks = await Promise.all(
      this.roles.map((role) => context.principal.isInRole(role)),
    );

    const hasRole = roleChecks.some(Boolean);

    if (!hasRole) {
      return GuardResult.deny(
        AppError.forbidden(`Requires one of: ${this.roles.join(", ")}`),
      );
    }

    return GuardResult.allow();
  }

      cacheKey(context: GuardContext): string {
        const details = context.principal.details as { id?: string } | null | undefined;
        return `role:${this.roles.join(",")}:${details?.id || "anonymous"}`;
      }
}

/**
 * Factory function for convenience
 * @param roles - Roles to require
 */
export const RequireRole = (...roles: Array<string>): RoleGuard => new RoleGuard(roles);

