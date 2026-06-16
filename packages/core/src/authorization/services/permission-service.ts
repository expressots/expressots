import { injectable } from "../../di/inversify.js";
import { inject } from "../../di/annotation/inject.js";
import { Logger } from "../../provider/logger/logger.provider.js";
import type { IPermissionService } from "./permission-service.interface.js";

/**
 * Tenant-scoped permission service
 * Each tenant gets isolated permission cache
 * Note: This is bound manually in setupAuthorization() with tenant scope to allow user overrides
 */
@injectable()
export class PermissionService implements IPermissionService {
  private cache = new Map<string, Array<string>>(); // User ID -> Permissions

  constructor(@inject(Logger) private logger?: Logger) {}

  /**
   * Get all permissions for a user
   * Results are cached per tenant scope
   */
  async getPermissions(
    userId: string,
    tenantId?: string,
  ): Promise<Array<string>> {
    const cacheKey = `${tenantId || "default"}:${userId}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // In a real implementation, load from database/repository
    // For now, return empty array (to be implemented by user)
    this.logger?.warn(
      `PermissionService.getPermissions() not implemented. Override with your own implementation.`,
      "permission-service",
    );

    const permissions: Array<string> = [];
    this.cache.set(cacheKey, permissions);

    return permissions;
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(
    userId: string,
    permission: string,
    tenantId?: string,
  ): Promise<boolean> {
    const permissions = await this.getPermissions(userId, tenantId);
    return permissions.includes(permission);
  }
}
