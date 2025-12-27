import { Request, Response } from "express";
import type { Container, interfaces } from "../di/inversify";
import { AppError } from "../error/app-error";

/**
 * Principal interface for authentication
 * This is adapter-agnostic and matches the adapter's Principal interface
 */
export interface Principal<T = unknown> {
  details: T;
  isAuthenticated(): Promise<boolean>;
  isInRole(role: string): Promise<boolean>;
  isResourceOwner(resourceId: unknown): Promise<boolean>;
}

/**
 * Scope information extracted from request
 */
export interface GuardScope {
  /**
   * Tenant ID if multi-tenant application
   */
  tenant?: string;

  /**
   * Unique request ID
   */
  request: string;

  /**
   * Session ID if available
   */
  session?: string;

  /**
   * Transaction ID if available
   */
  transaction?: string;

  /**
   * Workflow ID if available
   */
  workflow?: string;
}

/**
 * Route metadata for guard context
 */
export interface RouteMetadata {
  /**
   * Controller name
   */
  controller: string;

  /**
   * Method name
   */
  method: string;

  /**
   * Route path
   */
  path: string;

  /**
   * Route parameters
   */
  params: Record<string, unknown>;

  /**
   * Query parameters
   */
  query: Record<string, unknown>;
}

/**
 * Guard context providing comprehensive information for authorization decisions
 */
export interface GuardContext {
  /**
   * Express request object
   */
  request: Request;

  /**
   * Express response object
   */
  response: Response;

  /**
   * Principal (user) from AuthProvider
   */
  principal: Principal;

  /**
   * DI container (request-scoped child container)
   */
  container: Container;

  /**
   * Scope information (extracted from request)
   */
  scope: GuardScope;

  /**
   * Route metadata
   */
  route: RouteMetadata;

  /**
   * Get scoped service from container
   * @param identifier - Service identifier
   * @param scopeName - Optional scope name (e.g., "tenant")
   */
  getScoped<T>(
    identifier: interfaces.ServiceIdentifier<T>,
    scopeName?: string,
  ): T;

  /**
   * Get tenant ID from scope
   */
  getTenantId(): string | undefined;

  /**
   * Get request ID from scope
   */
  getRequestId(): string;
}

/**
 * Guard result indicating whether access is allowed.
 *
 * @layer public
 * @audience application-developers
 * @concept guard-result
 * @difficulty beginner
 *
 * @summary Quick Start
 * Use `GuardResult.allow()` or `GuardResult.deny()` to return guard decisions.
 *
 * @example
 * ```typescript
 * async canActivate(context: GuardContext): Promise<GuardResult> {
 *   if (await context.principal.isAuthenticated()) {
 *     return GuardResult.allow();
 *   }
 *   return GuardResult.deny(AppError.unauthorized("Please login"));
 * }
 * ```
 *
 * @public API
 */
export class GuardResult {
  readonly allowed: boolean;
  readonly error?: AppError;

  private constructor(allowed: boolean, error?: AppError) {
    this.allowed = allowed;
    this.error = error;
  }

  /**
   * Create an allow result.
   *
   * @layer public
   * @audience application-developers
   *
   * @returns GuardResult with allowed = true
   *
   * @example
   * ```typescript
   * return GuardResult.allow();
   * ```
   *
   * @public API
   */
  static allow(): GuardResult {
    return new GuardResult(true);
  }

  /**
   * Create a deny result.
   *
   * @layer public
   * @audience application-developers
   *
   * @param error - Optional error to throw (defaults to forbidden)
   * @returns GuardResult with allowed = false
   *
   * @example
   * ```typescript
   * // Default error (403 Forbidden)
   * return GuardResult.deny();
   *
   * // Custom error
   * return GuardResult.deny(AppError.unauthorized("Please login"));
   * ```
   *
   * @public API
   */
  static deny(error?: AppError): GuardResult {
    return new GuardResult(false, error || AppError.forbidden("Access denied"));
  }
}

/**
 * Guard interface for authorization checks.
 *
 * @layer public
 * @audience application-developers
 * @concept guard-interface
 * @difficulty intermediate
 *
 * @summary Quick Start
 * Implement this interface to create custom guards for authorization.
 *
 * @example
 * ```typescript
 * @Guard({ priority: 1 })
 * export class AuthenticatedGuard implements IGuard {
 *   async canActivate(context: GuardContext): Promise<GuardResult> {
 *     const isAuthenticated = await context.principal.isAuthenticated();
 *     return isAuthenticated ? GuardResult.allow() : GuardResult.deny();
 *   }
 * }
 * ```
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Architecture**
 *
 * Guards are executed by GuardExecutor in priority order:
 * 1. Resolved from registry or container
 * 2. Sorted by priority (lower = earlier)
 * 3. Executed sequentially
 * 4. Early exit on deny
 * 5. Results cached if cacheable
 *
 * **Return Types**
 * - `GuardResult`: Explicit allow/deny with optional error
 * - `boolean`: `true` = allow, `false` = deny with default error
 *
 * @see {@link GuardContext} for available context information
 * @see {@link GuardResult} for result types
 * @see {@link GuardExecutor} for execution logic
 *
 * @layer advanced
 * @audience power-users
 *
 * **Advanced Patterns**
 *
 * Caching guard results:
 * ```typescript
 * @Guard({ cacheable: true })
 * export class CachedGuard implements IGuard {
 *   cacheKey = (context) => `guard:${context.principal.details.id}`;
 *   // ...
 * }
 * ```
 *
 * Priority ordering:
 * ```typescript
 * @Guard({ priority: 1 })  // Runs first (authentication)
 * export class AuthGuard implements IGuard { }
 *
 * @Guard({ priority: 50 })  // Runs after auth (authorization)
 * export class RoleGuard implements IGuard { }
 * ```
 *
 * @public API
 */
export interface IGuard {
  /**
   * Determines if the request should be allowed to proceed.
   *
   * @layer public
   * @audience application-developers
   *
   * @param context - Full guard context with request, principal, container, and scope info
   * @returns GuardResult or boolean (true = allow, false = deny with default error)
   *
   * @example
   * ```typescript
   * async canActivate(context: GuardContext): Promise<GuardResult> {
   *   const isAuthenticated = await context.principal.isAuthenticated();
   *   if (!isAuthenticated) {
   *     return GuardResult.deny(AppError.unauthorized("Please login"));
   *   }
   *   return GuardResult.allow();
   * }
   * ```
   *
   * @public API
   */
  canActivate(context: GuardContext): Promise<GuardResult | boolean>;

  /**
   * Optional: Execution priority (lower = earlier). Default: 100
   *
   * @default 100
   *
   * Useful for guards that must run before others (e.g., authentication before authorization).
   *
   * **Common Priorities:**
   * - 1-10: Authentication guards
   * - 50-100: Authorization guards (roles, permissions)
   * - 100+: Resource guards (ownership, attributes)
   *
   * @example
   * ```typescript
   * @Guard({ priority: 1 })  // Runs first
   * export class AuthenticatedGuard implements IGuard { }
   * ```
   */
  priority?: number;

  /**
   * Optional: Whether guard result can be cached within request scope.
   *
   * @default false
   *
   * When `true`, guard result is cached for the request scope.
   * Subsequent calls with same cache key return cached result.
   *
   * @example
   * ```typescript
   * @Guard({ cacheable: true })
   * export class CachedGuard implements IGuard {
   *   cacheKey = (context) => `user:${context.principal.details.id}`;
   * }
   * ```
   */
  cacheable?: boolean;

  /**
   * Optional: Custom cache key generator.
   *
   * @default `${guard.name}:${method}:${path}`
   *
   * Generates cache key for this guard. Only used if `cacheable: true`.
   *
   * @example
   * ```typescript
   * cacheKey = (context) => {
   *   return `guard:${context.principal.details.id}:${context.route.path}`;
   * }
   * ```
   */
  cacheKey?: (context: GuardContext) => string;
}

/**
 * Type for guard class constructor
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GuardClass = new (...args: Array<any>) => IGuard;

/**
 * Metadata for guard registration
 */
export interface GuardMetadata {
  /**
   * Execution priority
   */
  priority: number;

  /**
   * Whether result is cacheable
   */
  cacheable: boolean;

  /**
   * The guard class
   */
  guard: NewableFunction;
}
