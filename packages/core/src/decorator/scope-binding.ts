/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { fluentProvide, METADATA_KEY } from "../di/binding-decorator";
import { ProviderSource } from "../provider/provider.interface";

// Re-export for convenience
export { ProviderSource };

/**
 * Metadata options for the @Provider decorator.
 * @public API
 */
export interface ProviderOptions {
  /** Binding scope (default: "Request") */
  scope?: "Singleton" | "Transient" | "Request" | string;
  /** Provider display name (defaults to class name) */
  name?: string;
  /** Provider version (e.g., "1.0.0") */
  version?: string;
  /** Brief description of what this provider does */
  description?: string;
  /** Author name or organization */
  author?: string;
  /** Repository URL */
  repo?: string;
  /** Provider source type (default: "user") */
  source?: ProviderSource;
  /** Dependencies on other providers (for load ordering) */
  dependencies?: Array<string>;
  /** Load priority (higher = later, default: 0) */
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
 * Provides a binding for the given identifier.
 *
 * @param identifier - The identifier (e.g., symbol, string, class) for the dependency being registered.
 * @returns A fluent interface for further configuring the binding.
 *
 * @example
 * ```typescript
 * provide(ServiceIdentifier)
 * class MyService {}
 * ```
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
 * Singleton binding ensures that the same instance of a dependency is reused within the entire container.
 *
 * @param identifier - The identifier (e.g., symbol, string, class) for the dependency being registered.
 * @param source - Optional provider source type (default: "user")
 * @returns A fluent interface for further configuring the binding.
 *
 * @example
 * ```typescript
 * provideSingleton(ServiceIdentifier)
 * class MyService {}
 * ```
 * @public API
 */
export const provideSingleton = (identifier: any, source: ProviderSource = "user") => {
  const decorator = fluentProvide(identifier).inSingletonScope().done();
  return function (target: any) {
    storeProviderMetadata(target, "Singleton", source);
    return decorator(target);
  };
};

/**
 * Provides a transient binding for the given identifier.
 *
 * Transient binding ensures that a new instance of a dependency is created every time it is resolved.
 *
 * @param identifier - The identifier (e.g., symbol, string, class) for the dependency being registered.
 * @param source - Optional provider source type (default: "user")
 * @returns A fluent interface for further configuring the binding.
 *
 * @example
 * ```typescript
 * provideTransient(ServiceIdentifier)
 * class MyService {}
 * ```
 * @public API
 */
export const provideTransient = (identifier: any, source: ProviderSource = "user") => {
  const decorator = fluentProvide(identifier).inTransientScope().done();
  return function (target: any) {
    storeProviderMetadata(target, "Transient", source);
    return decorator(target);
  };
};

/**
 * Provides a custom scope binding for the given identifier.
 *
 * Custom scope binding ensures that instances are shared within a specific custom scope
 * (e.g., "tenant", "transaction", "workflow"). Instances are cached per scope and
 * reused when resolved within the same scope context.
 *
 * @param identifier - The identifier (e.g., symbol, string, class) for the dependency being registered.
 * @param scopeName - The name of the custom scope (e.g., "tenant", "transaction").
 *                    Must not conflict with built-in scope names: "Singleton", "Request", "Transient".
 * @param source - Optional provider source type (default: "user")
 * @returns A fluent interface for further configuring the binding.
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
 * @public API
 */
export const provideInScope = (identifier: any, scopeName: string, source: ProviderSource = "user") => {
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
 * Provider decorator for external providers (plugins/packages).
 *
 * This decorator is designed for third-party packages that want to integrate
 * with the ExpressoTS ecosystem. It provides rich metadata support for
 * discovery, health checks, metrics, and introspection.
 *
 * @param options - Provider configuration options
 * @returns A class decorator
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
 * export class RedisCacheProvider implements IProvider, IHealthCheck {
 *   readonly name = "Redis Cache Provider";
 *   readonly version = "1.0.0";
 *
 *   async healthCheck(): Promise<HealthCheckResult> {
 *     // Check Redis connection
 *   }
 * }
 *
 * // User provider with custom scope
 * @Provider({ scope: "Request" })
 * export class UserSessionProvider { }
 * ```
 * @public API
 */
export function Provider(options: ProviderOptions = {}) {
  const scope = options.scope || "Request";
  const source = options.source || "external";

  return function <T extends { new (...args: Array<unknown>): object }>(target: T): T {
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
