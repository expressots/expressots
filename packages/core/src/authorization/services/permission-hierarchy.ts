import { injectable } from "../../di/inversify";
import type { IPermissionHierarchy } from "./permission-hierarchy.interface";

/**
 * Permission hierarchy service for role/permission inheritance
 * Handles hierarchical permissions (e.g., admin inherits user permissions)
 * Note: This is bound manually in setupAuthorization() to allow user overrides
 */
@injectable()
export class PermissionHierarchy implements IPermissionHierarchy {
  private hierarchy: Record<string, Array<string>> = {
    "super-admin": ["admin", "moderator", "user"],
    admin: ["moderator", "user"],
    moderator: ["user"],
  };

  /**
   * Resolve all roles including inherited ones
   */
  async resolveRoles(roles: Array<string>): Promise<Array<string>> {
    const allRoles = new Set<string>();

    for (const role of roles) {
      allRoles.add(role);
      const inherited = this.hierarchy[role] || [];
      inherited.forEach((r) => allRoles.add(r));
    }

    return Array.from(allRoles);
  }

  /**
   * Check if role inherits from another role
   */
  inheritsFrom(role: string, parentRole: string): boolean {
    const inherited = this.hierarchy[role] || [];
    return (
      inherited.includes(parentRole) ||
      inherited.some((r) => this.inheritsFrom(r, parentRole))
    );
  }

  /**
   * Configure hierarchy
   */
  configure(hierarchy: Record<string, Array<string>>): void {
    this.hierarchy = { ...this.hierarchy, ...hierarchy };
  }
}
