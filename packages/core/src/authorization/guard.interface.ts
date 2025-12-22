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
  getScoped<T>(identifier: interfaces.ServiceIdentifier<T>, scopeName?: string): T;

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
 * Guard result indicating whether access is allowed
 */
export class GuardResult {
  readonly allowed: boolean;
  readonly error?: AppError;

  private constructor(allowed: boolean, error?: AppError) {
    this.allowed = allowed;
    this.error = error;
  }

  /**
   * Create an allow result
   */
  static allow(): GuardResult {
    return new GuardResult(true);
  }

  /**
   * Create a deny result
   * @param error - Optional error to throw (defaults to forbidden)
   */
  static deny(error?: AppError): GuardResult {
    return new GuardResult(false, error || AppError.forbidden("Access denied"));
  }
}

/**
 * Guard interface for authorization checks
 */
export interface IGuard {
  /**
   * Determines if the request should be allowed to proceed
   * @param context - Full guard context with request, principal, container, and scope info
   * @returns GuardResult or boolean (true = allow, false = deny with default error)
   */
  canActivate(context: GuardContext): Promise<GuardResult | boolean>;

  /**
   * Optional: Execution priority (lower = earlier). Default: 100
   * Useful for guards that must run before others (e.g., authentication before authorization)
   */
  priority?: number;

  /**
   * Optional: Whether guard result can be cached within request scope
   */
  cacheable?: boolean;

  /**
   * Optional: Custom cache key generator
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

