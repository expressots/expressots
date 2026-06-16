import { injectable } from "../../di/inversify.js";
import { inject } from "../../di/annotation/inject.js";
import { Logger } from "../../provider/logger/logger.provider.js";
import type { ISecurityContext } from "./security-context.interface.js";
import type { IPermissionService } from "./permission-service.interface.js";

/**
 * Request-scoped security context for caching permissions
 * Provides permission checking with request-scoped caching
 * Note: This is bound manually in setupAuthorization() to allow user overrides
 */
@injectable()
export class SecurityContext implements ISecurityContext {
  private permissions = new Set<string>();
  private roles = new Set<string>();
  private loaded = false;

  constructor(
    @inject("IPermissionService")
    private permissionService?: IPermissionService,
    @inject(Logger) private logger?: Logger,
  ) {}

  /**
   * Preload all permissions for user (called once per request)
   */
  async preload(userId: string): Promise<void> {
    if (this.loaded) {
      return;
    }

    try {
      if (this.permissionService) {
        const permissions = await this.permissionService.getPermissions(userId);
        permissions.forEach((p) => this.permissions.add(p));
      }
      this.loaded = true;
    } catch (error) {
      this.logger?.error(
        `Failed to preload permissions for user ${userId}: ${error}`,
        "security-context",
      );
    }
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(permission: string): Promise<boolean> {
    return this.permissions.has(permission);
  }

  /**
   * Add permission to context
   */
  addPermission(permission: string): void {
    this.permissions.add(permission);
  }

  /**
   * Get all permissions
   */
  async getPermissions(): Promise<Array<string>> {
    return Array.from(this.permissions);
  }
}
