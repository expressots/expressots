import { interfaces } from "@expressots/core";
import { setupAuthorization, type AuthorizationConfig } from "@expressots/core";
import { ScopeExtractor } from "./scope-extractor.js";
import { GuardContextFactory } from "./guard-context-factory.js";
import { GuardMiddleware } from "./guard-middleware.js";
import { PermissionPreloaderMiddleware } from "./permission-preloader.middleware.js";
import { TYPE } from "./constants.js";
import type { AuthProvider } from "./interfaces.js";
import type { IMiddleware } from "@expressots/core";

/**
 * Express-specific authorization setup
 * Automatically registers all adapter-specific services and middleware
 *
 * @param container - DI container
 * @param config - Authorization configuration
 * @param middleware - Optional middleware manager to add PermissionPreloaderMiddleware
 * @param authProvider - Optional AuthProvider class (if not already bound)
 *
 * @example
 * ```typescript
 * export class App extends AppExpress {
 *   async configureServices(): Promise<void> {
 *     setupAuthorizationForExpress(
 *       this.config.Container,
 *       {
 *         enablePreloading: true,
 *         enableCaching: true,
 *         permissionHierarchy: {
 *           admin: ["moderator", "user"],
 *           moderator: ["user"],
 *         },
 *       },
 *       this.Middleware,
 *     );
 *   }
 * }
 * ```
 */
export function setupAuthorizationForExpress(
  container: interfaces.Container,
  config: AuthorizationConfig = {},
  middleware?: IMiddleware,
  authProvider?: new () => AuthProvider,
): void {
  // Setup core authorization system
  setupAuthorization(container, config);

  // Register adapter-specific services
  if (!container.isBound("IScopeExtractor")) {
    container.bind("IScopeExtractor").to(ScopeExtractor).inSingletonScope();
  }

  if (!container.isBound(GuardContextFactory)) {
    container.bind(GuardContextFactory).toSelf().inSingletonScope();
  }

  if (!container.isBound(GuardMiddleware)) {
    container.bind(GuardMiddleware).toSelf().inSingletonScope();
  }

  // Bind AuthProvider if provided and not already bound
  if (authProvider && !container.isBound(TYPE.AuthProvider)) {
    container.bind<AuthProvider>(TYPE.AuthProvider).to(authProvider).inSingletonScope();
  }

  // Add permission preloader middleware if enabled and middleware manager provided
  // PermissionPreloaderMiddleware extends BaseMiddleware which has a handler() method
  // The middleware system accepts BaseMiddleware instances as IExpressoMiddleware
  if (config.enablePreloading !== false && middleware) {
    // Bind PermissionPreloaderMiddleware if not already bound
    if (!container.isBound(PermissionPreloaderMiddleware)) {
      container.bind(PermissionPreloaderMiddleware).toSelf().inSingletonScope();
    }
    // Get instance from container (DI will inject dependencies)
    // Cast to IExpressoMiddleware - BaseMiddleware instances are handled specially
    // by the middleware resolution system (see inversify-express-server.ts)
    const middlewareInstance = container.get(PermissionPreloaderMiddleware);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    middleware.add(middlewareInstance as any);
  }
}
