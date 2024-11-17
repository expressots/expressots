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
