/**
 * Interface for permission service
 * Can be tenant-scoped for multi-tenant applications
 */
export interface IPermissionService {
  /**
   * Get all permissions for a user
   * @param userId - User ID
   * @param tenantId - Optional tenant ID for multi-tenant apps
   */
  getPermissions(userId: string, tenantId?: string): Promise<Array<string>>;

  /**
   * Check if user has specific permission
   * @param userId - User ID
   * @param permission - Permission to check
   * @param tenantId - Optional tenant ID
   */
  hasPermission(userId: string, permission: string, tenantId?: string): Promise<boolean>;
}

