import { interfaces } from "../di/inversify";
import { GuardRegistry } from "./guard-registry";
import { GuardExecutor } from "./guard-executor";
import { GuardCache } from "./services/guard-cache";
import { SecurityContext } from "./services/security-context";
import { PermissionService } from "./services/permission-service";
import { PermissionHierarchy } from "./services/permission-hierarchy";
import type { AuthorizationConfig } from "./authorization-config.interface";
import type { IGuardCache } from "./services/guard-cache.interface";
import type { ISecurityContext } from "./services/security-context.interface";
import type { IPermissionService } from "./services/permission-service.interface";

/**
 * Default authorization configuration
 */
export const defaultAuthorizationConfig: AuthorizationConfig = {
  enablePreloading: true,
  enableCaching: true,
  defaultGuardPriority: 100,
};

/**
 * Setup authorization system with optional configuration
 * Registers all required services and initializes guard registry
 *
 * @param container - DI container
 * @param config - Optional configuration
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
        .to(PermissionService as any) as unknown as { inScope: (s: string) => void }
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
