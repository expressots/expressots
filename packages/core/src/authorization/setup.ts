import { interfaces } from "../di/inversify.js";
import { GuardRegistry } from "./guard-registry.js";
import { GuardExecutor } from "./guard-executor.js";
import { GuardCache } from "./services/guard-cache.js";
import { SecurityContext } from "./services/security-context.js";
import { PermissionService } from "./services/permission-service.js";
import { PermissionHierarchy } from "./services/permission-hierarchy.js";
import type { AuthorizationConfig } from "./authorization-config.interface.js";
import type { IGuardCache } from "./services/guard-cache.interface.js";
import type { ISecurityContext } from "./services/security-context.interface.js";
import type { IPermissionService } from "./services/permission-service.interface.js";

/**
 * Default authorization configuration
 */
export const defaultAuthorizationConfig: AuthorizationConfig = {
  enablePreloading: true,
  enableCaching: true,
  defaultGuardPriority: 100,
};

/**
 * Setup authorization system with optional configuration.
 *
 * @layer public
 * @audience application-developers
 * @concept authorization-setup
 * @difficulty beginner
 *
 * @summary Quick Start
 * Registers all required services and initializes guard registry.
 * Call this in your app's `configureServices()` method.
 *
 * @example
 * ```typescript
 * export class App extends AppExpress {
 *   configureServices(): void {
 *     setupAuthorization(this.container, {
 *       enablePreloading: true,
 *       enableCaching: true,
 *     });
 *   }
 * }
 * ```
 *
 * @param container - DI container from your app
 * @param config - Optional authorization configuration
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Architecture**
 *
 * This function:
 * 1. Registers core services (GuardCache, SecurityContext, GuardRegistry, GuardExecutor)
 * 2. Registers optional services (PermissionService, PermissionHierarchy)
 * 3. Configures permission hierarchy if provided
 * 4. Initializes guard registry (auto-discovers guards)
 *
 * **Service Registration:**
 * - `IGuardCache`: Singleton scope (shared cache)
 * - `ISecurityContext`: Request scope (per-request context)
 * - `GuardRegistry`: Singleton scope (shared registry)
 * - `GuardExecutor`: Singleton scope (shared executor)
 * - `IPermissionService`: Tenant scope (per-tenant permissions)
 * - `IPermissionHierarchy`: Singleton scope (shared hierarchy)
 *
 * @see {@link AuthorizationConfig} for configuration options
 * @see {@link GuardRegistry} for guard discovery
 *
 * @layer advanced
 * @audience power-users
 *
 * **Advanced Configuration**
 *
 * With permission hierarchy:
 * ```typescript
 * setupAuthorization(this.container, {
 *   permissionHierarchy: {
 *     "super-admin": ["admin", "moderator", "user"],
 *     "admin": ["moderator", "user"],
 *     "moderator": ["user"]
 *   }
 * });
 * ```
 *
 * With custom scope extractors:
 * ```typescript
 * setupAuthorization(this.container, {
 *   scopeExtractors: {
 *     tenant: (req) => req.headers["x-tenant-id"],
 *     session: (req) => req.session?.id
 *   }
 * });
 * ```
 *
 * @public API
 */
export function setupAuthorization(
  container: interfaces.Container,
  config: AuthorizationConfig = {},
): void {
  const finalConfig = { ...defaultAuthorizationConfig, ...config };

  // Register core services
  if (!container.isBound("IGuardCache")) {
    container
      .bind<IGuardCache>("IGuardCache")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .to(GuardCache as any)
      .inSingletonScope();
  }
  if (!container.isBound("ISecurityContext")) {
    container
      .bind<ISecurityContext>("ISecurityContext")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .to(SecurityContext as any)
      .inRequestScope();
  }
  if (!container.isBound(GuardRegistry)) {
    container.bind(GuardRegistry).toSelf().inSingletonScope();
  }
  if (!container.isBound(GuardExecutor)) {
    container.bind(GuardExecutor).toSelf().inSingletonScope();
  }

  // Register optional services (can be overridden by user)
  if (!container.isBound("IPermissionService")) {
    // Bind with custom scope - inScope() returns BindingWhenOnSyntax which is chainable
    (
      container
        .bind<IPermissionService>("IPermissionService")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .to(PermissionService as any) as unknown as {
        inScope: (s: string) => void;
      }
    ).inScope("tenant");
  }

  if (!container.isBound("IPermissionHierarchy")) {
    container
      .bind("IPermissionHierarchy")
      .to(PermissionHierarchy)
      .inSingletonScope();
  }

  // Configure permission hierarchy if provided
  if (finalConfig.permissionHierarchy) {
    const hierarchy = container.get<PermissionHierarchy>(
      "IPermissionHierarchy",
    );
    hierarchy.configure(finalConfig.permissionHierarchy);
  }

  // Initialize guard registry (auto-discovers guards)
  const registry = container.get<GuardRegistry>(GuardRegistry);
  registry.initialize();
}
