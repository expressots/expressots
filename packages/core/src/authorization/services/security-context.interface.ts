/**
 * Interface for request-scoped security context
 * Provides permission caching within a request
 */
export interface ISecurityContext {
  /**
   * Preload all permissions for user (called once per request)
   * @param userId - User ID
   */
  preload(userId: string): Promise<void>;

  /**
   * Check if user has specific permission
   * @param permission - Permission to check
   */
  hasPermission(permission: string): Promise<boolean>;

  /**
   * Add permission to context (for preloading)
   * @param permission - Permission to add
   */
  addPermission(permission: string): void;

  /**
   * Get all permissions for user
   */
  getPermissions(): Promise<Array<string>>;
}
