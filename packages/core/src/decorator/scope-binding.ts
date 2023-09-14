/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { fluentProvide } from "inversify-binding-decorators";

/**
 * Provides a singleton binding for the given identifier.
 *
 * @remarks
 * Singleton binding ensures that the same instance of a dependency is reused within the entire container.
 *
 * @param identifier - The identifier (e.g., symbol, string, class) for the dependency being registered.
 * @returns A fluent interface for further configuring the binding.
 *
 * @example
 * ```typescript
 * @provideSingleton(ServiceIdentifier)
 * class MyService {}
 * ```
 */
const provideSingleton = (identifier: any) => {
  return fluentProvide(identifier).inSingletonScope().done();
};

/**
 * Provides a transient binding for the given identifier.
 *
 * @remarks
 * Transient binding ensures that a new instance of a dependency is created every time it is resolved.
 *
 * @param identifier - The identifier (e.g., symbol, string, class) for the dependency being registered.
 * @returns A fluent interface for further configuring the binding.
 *
 * @example
 * ```typescript
 * @provideTransient(ServiceIdentifier)
 * class MyService {}
 * ```
 */
const provideTransient = (identifier: any) => {
  return fluentProvide(identifier).inTransientScope().done();
};

export { provideSingleton, provideTransient };
