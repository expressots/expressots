/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { fluentProvide } from "../di/binding-decorator";

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
  return fluentProvide(identifier).done();
};

/**
 * Provides a singleton binding for the given identifier.
 *
 * Singleton binding ensures that the same instance of a dependency is reused within the entire container.
 *
 * @param identifier - The identifier (e.g., symbol, string, class) for the dependency being registered.
 * @returns A fluent interface for further configuring the binding.
 *
 * @example
 * ```typescript
 * provideSingleton(ServiceIdentifier)
 * class MyService {}
 * ```
 * @public API
 */
export const provideSingleton = (identifier: any) => {
  return fluentProvide(identifier).inSingletonScope().done();
};

/**
 * Provides a transient binding for the given identifier.
 *
 * Transient binding ensures that a new instance of a dependency is created every time it is resolved.
 *
 * @param identifier - The identifier (e.g., symbol, string, class) for the dependency being registered.
 * @returns A fluent interface for further configuring the binding.
 *
 * @example
 * ```typescript
 * provideTransient(ServiceIdentifier)
 * class MyService {}
 * ```
 * @public API
 */
export const provideTransient = (identifier: any) => {
  return fluentProvide(identifier).inTransientScope().done();
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
export const provideInScope = (identifier: any, scopeName: string) => {
  if (
    scopeName === "Singleton" ||
    scopeName === "Request" ||
    scopeName === "Transient"
  ) {
    throw new Error(
      `Cannot use built-in scope name "${scopeName}" as custom scope. Use the corresponding decorator instead (e.g., provideSingleton()).`,
    );
  }
  return fluentProvide(identifier).inScope(scopeName).done();
};
