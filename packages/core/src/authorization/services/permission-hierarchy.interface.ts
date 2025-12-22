/**
 * Interface for permission hierarchy service
 * Handles role/permission inheritance
 */
export interface IPermissionHierarchy {
  /**
   * Resolve all roles including inherited ones
   * @param roles - Roles to resolve
   */
  resolveRoles(roles: Array<string>): Promise<Array<string>>;

  /**
   * Check if role inherits from another role
   * @param role - Child role
   * @param parentRole - Parent role
   */
  inheritsFrom(role: string, parentRole: string): boolean;

  /**
   * Configure hierarchy
   * @param hierarchy - Hierarchy configuration
   */
  configure(hierarchy: Record<string, Array<string>>): void;
}

