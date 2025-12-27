/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { fluentProvide, METADATA_KEY } from "../di/binding-decorator";
import { ProviderSource } from "../provider/provider.interface";

// Re-export for convenience
export { ProviderSource };

/**
 * Metadata options for the @Provider decorator.
 *
 * @layer public
 * @audience application-developers
 *
 * @public API
 *
 * @example
 * ```typescript
 * @Provider({
 *   scope: "Singleton",
 *   name: "My Provider",
 *   version: "1.0.0",
 *   description: "Provides caching functionality",
 *   author: "My Team",
 *   dependencies: ["DatabaseProvider"]
 * })
 * export class MyProvider { }
 * ```
 */
export interface ProviderOptions {
  /**
   * Binding scope (default: "Request")
   *
   * @default "Request"
   *
   * **Built-in Scopes:**
   * - `"Singleton"` - One instance for app lifetime
   * - `"Transient"` - New instance every time
   * - `"Request"` - One instance per HTTP request
   *
   * **Custom Scopes:**
   * - Any string (e.g., `"tenant"`, `"transaction"`)
   */
  scope?: "Singleton" | "Transient" | "Request" | string;

  /**
   * Provider display name (defaults to class name)
   *
   * Used in provider registry and health checks.
   */
  name?: string;

  /**
   * Provider version (e.g., "1.0.0")
   *
   * Used for version tracking and compatibility checks.
   */
  version?: string;

  /**
   * Brief description of what this provider does
   *
   * Used in documentation and introspection.
   */
  description?: string;

  /**
   * Author name or organization
   *
   * Used for attribution and support.
   */
  author?: string;

  /**
   * Repository URL
   *
   * Used for linking to source code and documentation.
   */
  repo?: string;

  /**
   * Provider source type (default: "user")
   *
   * @default "user"
   *
   * **Values:**
   * - `"user"` - User-defined provider
   * - `"external"` - Third-party plugin/package
   * - `"builtin"` - Framework built-in provider
   */
  source?: ProviderSource;

  /**
   * Dependencies on other providers (for load ordering)
   *
   * Array of provider names that must be loaded before this provider.
   * Used by ProviderRegistry for dependency resolution.
   */
  dependencies?: Array<string>;

  /**
   * Load priority (higher = later, default: 0)
   *
   * @default 0
   *
   * Providers with higher priority load after those with lower priority.
   * Useful for ensuring initialization order.
   */
  priority?: number;
}

/**
 * Internal function to store provider metadata on a class.
 * @internal
 */
function storeProviderMetadata(
  target: any,
  scope: string,
  source: ProviderSource,
  options?: ProviderOptions,
): void {
  Reflect.defineMetadata(METADATA_KEY.scope, scope, target);
  Reflect.defineMetadata(METADATA_KEY.source, source, target);
  if (options) {
    Reflect.defineMetadata(METADATA_KEY.providerMeta, options, target);
  }
}

/**
 * Provides a request-scoped binding for the given identifier.
 *
 * @layer public
 * @audience application-developers
 * @concept dependency-injection
 * @difficulty beginner
 *
 * @summary Quick Start
 * Register a service with request scope (one instance per HTTP request).
 *
 * @example
 * ```typescript
 * provide(ServiceIdentifier)
 * class MyService {}
 * ```
 *
 * @param identifier - The identifier (e.g., symbol, string, class) for the dependency being registered.
 * @returns A class decorator
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Behavior**
 * - Uses `fluentProvide()` to create binding
 * - Default scope: Request (one per HTTP request)
 * - Stores provider metadata for introspection
 *
 * **Scope Behavior**
 * - Request scope: One instance per HTTP request
 * - Stateless and scalable
 * - Recommended for most services
 *
 * @see {@link provideSingleton} for singleton scope
 * @see {@link provideTransient} for transient scope
 * @see {@link provideInScope} for custom scopes
 *
 * @public API
 */
export const provide = (identifier: any) => {
  const decorator = fluentProvide(identifier).done();
  return function (target: any) {
    storeProviderMetadata(target, "Request", "user");
    return decorator(target);
  };
};

/**
 * Provides a singleton binding for the given identifier.
 *
 * @layer public
 * @audience application-developers
 * @concept dependency-injection
 * @difficulty beginner
 *
 * @summary Quick Start
 * Register a service with singleton scope (one instance for application lifetime).
 *
 * @example
 * ```typescript
 * provideSingleton(ServiceIdentifier)
 * class MyService {}
 * ```
 *
 * **Singleton Behavior:**
 * - One instance shared across entire application
 * - Created on first resolution
 * - Cached for subsequent resolutions
 * - Use for stateless services or caches
 *
 * @param identifier - The identifier (e.g., symbol, string, class) for the dependency being registered.
 * @param source - Optional provider source type (default: "user")
 * @returns A class decorator
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Behavior**
 * - Uses `fluentProvide().inSingletonScope()`
 * - Stores metadata with scope "Singleton"
 * - Supports provider source tracking
 *
 * **Use Cases**
 * - Stateless services (loggers, caches)
 * - Configuration services
 * - Shared state managers
 *
 * @see {@link provide} for request scope
 * @see {@link provideTransient} for transient scope
 *
 * @public API
 */
export const provideSingleton = (
  identifier: any,
  source: ProviderSource = "user",
) => {
  const decorator = fluentProvide(identifier).inSingletonScope().done();
  return function (target: any) {
    storeProviderMetadata(target, "Singleton", source);
    return decorator(target);
  };
};

/**
 * Provides a transient binding for the given identifier.
 *
 * @layer public
 * @audience application-developers
 * @concept dependency-injection
 * @difficulty beginner
 *
 * @summary Quick Start
 * Register a service with transient scope (new instance every time).
 *
 * @example
 * ```typescript
 * provideTransient(ServiceIdentifier)
 * class MyService {}
 * ```
 *
 * **Transient Behavior:**
 * - New instance created every time it's resolved
 * - No caching or reuse
 * - Use sparingly (performance impact)
 *
 * @param identifier - The identifier (e.g., symbol, string, class) for the dependency being registered.
 * @param source - Optional provider source type (default: "user")
 * @returns A class decorator
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Behavior**
 * - Uses `fluentProvide().inTransientScope()`
 * - Stores metadata with scope "Transient"
 * - No instance caching
 *
 * **Use Cases**
 * - Services that must be fresh each time
 * - Prototype pattern implementations
 * - Rarely needed (prefer Request scope)
 *
 * @see {@link provide} for request scope (recommended)
 * @see {@link provideSingleton} for singleton scope
 *
 * @public API
 */
export const provideTransient = (
  identifier: any,
  source: ProviderSource = "user",
) => {
  const decorator = fluentProvide(identifier).inTransientScope().done();
  return function (target: any) {
    storeProviderMetadata(target, "Transient", source);
    return decorator(target);
  };
};

/**
 * Provides a custom scope binding for the given identifier.
 *
 * @layer public
 * @audience application-developers
 * @concept dependency-injection
 * @difficulty intermediate
 *
 * @summary Quick Start
 * Register a service with a custom scope (e.g., tenant, transaction).
 *
 * @example
 * ```typescript
 * // Tenant-scoped service
 * provideInScope(TenantServiceIdentifier, "tenant")
 * class TenantConfigService {}
 *
 * // Transaction-scoped service
 * provideInScope(TransactionServiceIdentifier, "transaction")
 * class TransactionContext {}
 * ```
 *
 * **Custom Scope Behavior:**
 * - Instances shared within the same scope context
 * - Different instances for different scope values
 * - Useful for multi-tenant or transaction-scoped services
 *
 * @param identifier - The identifier (e.g., symbol, string, class) for the dependency being registered.
 * @param scopeName - The name of the custom scope (e.g., "tenant", "transaction").
 *                    Must not conflict with built-in scope names: "Singleton", "Request", "Transient".
 * @param source - Optional provider source type (default: "user")
 * @returns A class decorator
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Behavior**
 * - Validates scope name (cannot be built-in scope)
 * - Uses `fluentProvide().inScope(scopeName)`
 * - Stores metadata with custom scope name
 *
 * **Scope Validation**
 * - Throws error if scopeName is "Singleton", "Request", or "Transient"
 * - Use corresponding decorator instead (provideSingleton, provide, provideTransient)
 *
 * @see {@link provide} for request scope
 * @see {@link provideSingleton} for singleton scope
 *
 * @layer advanced
 * @audience power-users
 *
 * **Advanced Usage**
 *
 * Multi-tenant services:
 * ```typescript
 * provideInScope(IPermissionService, "tenant")
 * class PermissionService { }
 * ```
 *
 * Transaction-scoped services:
 * ```typescript
 * provideInScope(ITransactionContext, "transaction")
 * class TransactionContext { }
 * ```
 *
 * @public API
 */
export const provideInScope = (
  identifier: any,
  scopeName: string,
  source: ProviderSource = "user",
) => {
  if (
    scopeName === "Singleton" ||
    scopeName === "Request" ||
    scopeName === "Transient"
  ) {
    throw new Error(
      `Cannot use built-in scope name "${scopeName}" as custom scope. Use the corresponding decorator instead (e.g., provideSingleton()).`,
    );
  }
  const decorator = fluentProvide(identifier).inScope(scopeName).done();
  return function (target: any) {
    storeProviderMetadata(target, scopeName, source);
    return decorator(target);
  };
};

/**
 * Provider decorator with rich metadata support.
 *
 * @layer public
 * @audience application-developers
 * @concept provider-decorator
 * @difficulty intermediate
 *
 * @summary Quick Start
 * Register a provider with metadata and scope configuration.
 *
 * @example
 * ```typescript
 * // External provider (plugin)
 * @Provider({
 *   scope: "Singleton",
 *   name: "Redis Cache Provider",
 *   version: "1.0.0",
 *   author: "ExpressoTS Team",
 *   description: "Redis caching for ExpressoTS applications"
 * })
 * export class RedisCacheProvider implements IProvider {
 *   readonly name = "Redis Cache Provider";
 *   readonly version = "1.0.0";
 * }
 *
 * // User provider with custom scope
 * @Provider({ scope: "Request" })
 * export class UserSessionProvider { }
 * ```
 *
 * @param options - Provider configuration options
 * @param options.scope - Binding scope (default: "Request")
 * @param options.name - Provider display name
 * @param options.version - Provider version
 * @param options.description - Brief description
 * @param options.author - Author name or organization
 * @param options.repo - Repository URL
 * @param options.source - Provider source type (default: "external")
 * @param options.dependencies - Dependencies on other providers
 * @param options.priority - Load priority (higher = later, default: 0)
 * @returns A class decorator
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Behavior**
 * - Stores all metadata in Reflect metadata
 * - Applies appropriate binding based on scope
 * - Supports discovery and introspection
 *
 * **Metadata Storage**
 * - Scope, source, and provider metadata stored separately
 * - Used by ProviderRegistry for discovery
 * - Supports health checks and metrics
 *
 * @see {@link ProviderOptions} for all available options
 * @see {@link provide} for simple request-scoped binding
 *
 * @layer advanced
 * @audience power-users
 *
 * **Advanced Usage**
 *
 * With dependencies:
 * ```typescript
 * @Provider({
 *   scope: "Singleton",
 *   dependencies: ["DatabaseProvider", "CacheProvider"],
 *   priority: 10
 * })
 * export class MyProvider { }
 * ```
 *
 * @public API
 */
export function Provider(options: ProviderOptions = {}) {
  const scope = options.scope || "Request";
  const source = options.source || "external";

  return function <T extends { new (...args: Array<unknown>): object }>(
    target: T,
  ): T {
    // Store all metadata
    storeProviderMetadata(target, scope, source, options);

    // Apply appropriate binding based on scope
    let decorator: (target: any) => any;
    switch (scope) {
      case "Singleton":
        decorator = fluentProvide(target).inSingletonScope().done();
        break;
      case "Transient":
        decorator = fluentProvide(target).inTransientScope().done();
        break;
      case "Request":
        decorator = fluentProvide(target).done();
        break;
      default:
        // Custom scope
        decorator = fluentProvide(target).inScope(scope).done();
        break;
    }

    return decorator(target);
  };
}
