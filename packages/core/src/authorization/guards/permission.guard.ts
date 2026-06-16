import { Guard } from "../guard-decorators.js";
import { injectable } from "../../di/inversify.js";
import { inject } from "../../di/annotation/inject.js";
import type { IGuard, GuardContext } from "../guard.interface.js";
import { GuardResult } from "../guard.interface.js";
import { AppError } from "../../error/app-error.js";
import type { ISecurityContext } from "../services/security-context.interface.js";

/**
 * Guard that requires specific permission
 * Uses SecurityContext for permission checking (request-scoped caching)
 *
 * @example
 * ```typescript
 * @controller("/api/documents")
 * export class DocumentController {
 *   @Get("/")
 *   @UseGuards(PermissionGuard("documents:read"))
 *   listDocuments() {}
 * }
 * ```
 * Note: Guards are instantiated dynamically by GuardRegistry, not via DI
 */
@Guard({ priority: 20, cacheable: true })
@injectable()
export class PermissionGuard implements IGuard {
  constructor(private permission: string) {
    if (!permission) {
      throw new Error("PermissionGuard requires a permission string");
    }
  }

  @inject("ISecurityContext")
  private securityContext?: ISecurityContext;

  async canActivate(context: GuardContext): Promise<GuardResult> {
    // Try to use SecurityContext if available (request-scoped caching)
    if (this.securityContext) {
      const hasPermission = await this.securityContext.hasPermission(
        this.permission,
      );
      if (!hasPermission) {
        return GuardResult.deny(
          AppError.forbidden(`Missing permission: ${this.permission}`),
        );
      }
      return GuardResult.allow();
    }

    // Fallback: Check if principal has permission method
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const principal = context.principal as any;
    if (typeof principal.hasPermission === "function") {
      const hasPermission = await principal.hasPermission(this.permission);
      if (!hasPermission) {
        return GuardResult.deny(
          AppError.forbidden(`Missing permission: ${this.permission}`),
        );
      }
      return GuardResult.allow();
    }

    // No permission checking available
    return GuardResult.deny(
      AppError.forbidden(`Permission check not available: ${this.permission}`),
    );
  }

  cacheKey(context: GuardContext): string {
    const details = context.principal.details as
      | { id?: string }
      | null
      | undefined;
    return `permission:${this.permission}:${details?.id || "anonymous"}`;
  }
}

/**
 * Factory function for convenience
 * @param permission - Permission to require
 */
export const RequirePermission = (permission: string): PermissionGuard =>
  new PermissionGuard(permission);
