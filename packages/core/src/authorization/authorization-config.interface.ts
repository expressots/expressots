import { Request } from "express";

/**
 * Configuration for authorization system
 */
export interface AuthorizationConfig {
  /**
   * Enable permission preloading middleware (default: true)
   */
  enablePreloading?: boolean;

  /**
   * Enable guard result caching (default: true)
   */
  enableCaching?: boolean;

  /**
   * Permission hierarchy configuration
   * Maps roles to their inherited roles/permissions
   *
   * @example
   * ```typescript
   * {
   *   "super-admin": ["admin", "moderator", "user"],
   *   "admin": ["moderator", "user"],
   *   "moderator": ["user"]
   * }
   * ```
   */
  permissionHierarchy?: Record<string, Array<string>>;

  /**
   * Custom scope extractors
   */
  scopeExtractors?: {
    /**
     * Custom tenant extractor
     */
    tenant?: (req: Request) => string | undefined;

    /**
     * Custom session extractor
     */
    session?: (req: Request) => string | undefined;
  };

  /**
   * Default guard priority (default: 100)
   */
  defaultGuardPriority?: number;
}

