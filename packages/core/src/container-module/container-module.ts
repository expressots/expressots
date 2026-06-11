/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Scope, ContainerModule, interfaces } from "../di/inversify.js";
import { provideSingleton, provideTransient } from "../decorator/index.js";
import { provide } from "../di/binding-decorator/index.js";

/**
 * Key to be used for storing and retrieving binding type metadata.
 */
export const BINDING_TYPE_METADATA_KEY = "binding-type";

/**
 * Simple callback type for custom bindings.
 * Only requires the `bind` parameter - the most common use case.
 */
export type SimpleBindingsCallback = (bind: interfaces.Bind) => void;

/**
 * Extended callback type for custom bindings with full container access.
 * Includes all ContainerModule parameters for advanced use cases.
 */
export type ExtendedBindingsCallback = (
  bind: interfaces.Bind,
  unbind: interfaces.Unbind,
  isBound: interfaces.IsBound,
  rebind: interfaces.Rebind,
) => void;

/**
 * Union type for bindings callbacks - supports both simple and extended signatures.
 */
export type BindingsCallback =
  | SimpleBindingsCallback
  | ExtendedBindingsCallback;

/**
 * Combines multiple ContainerModules into a single ContainerModule.
 *
 * @layer public
 * @audience application-developers
 * @concept module-composition
 * @difficulty intermediate
 *
 * @summary Quick Start
 * Combine multiple modules into a single module for easier management.
 *
 * @example
 * ```typescript
 * const controllerModule = CreateModule([UserController, AuthController]);
 * const customModule = new ContainerModule((bind) => {
 *   bind<ILogger>("ILogger").to(ConsoleLogger);
 * });
 *
 * export const AppModule = combineModules(controllerModule, customModule);
 * ```
 *
 * @param modules - ContainerModules to combine
 * @returns A single ContainerModule that loads all provided modules
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Architecture**
 *
 * Creates a new ContainerModule that loads all provided modules in order.
 * Each module's registry is called sequentially.
 *
 * **Use Cases**
 * - Combining feature modules
 * - Separating concerns (controllers, services, etc.)
 * - Reusable module composition
 *
 * @see {@link CreateModule} for creating modules from controllers
 * @see {@link createModule} for creating modules from callbacks
 *
 * @public API
 */
export function combineModules(
  ...modules: Array<ContainerModule>
): ContainerModule {
  return new ContainerModule(
    (
      bind: interfaces.Bind,
      unbind: interfaces.Unbind,
      isBound: interfaces.IsBound,
      rebind: interfaces.Rebind,
      unbindAsync: interfaces.UnbindAsync,
      onActivation: interfaces.Container["onActivation"],
      onDeactivation: interfaces.Container["onDeactivation"],
    ) => {
      for (const module of modules) {
        module.registry(
          bind,
          unbind,
          isBound,
          rebind,
          unbindAsync,
          onActivation,
          onDeactivation,
        );
      }
    },
  );
}

/**
 * Creates a ContainerModule from a simple bindings callback.
 *
 * @layer public
 * @audience application-developers
 * @concept module-creation
 * @difficulty beginner
 *
 * @summary Quick Start
 * Create a module from a simple bindings callback. Cleaner than `new ContainerModule()`.
 *
 * @example
 * ```typescript
 * const customModule = createModule((bind) => {
 *   bind<ILogger>("ILogger").to(ConsoleLogger).inSingletonScope();
 *   bind<ICache>("ICache").to(RedisCache);
 * });
 * ```
 *
 * @param callback - A callback that receives the `bind` function (and optionally unbind, isBound, rebind)
 * @returns A ContainerModule
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Architecture**
 *
 * Wraps a simple callback in a ContainerModule. Supports both:
 * - Simple callback: `(bind) => void`
 * - Extended callback: `(bind, unbind, isBound, rebind) => void`
 *
 * **Benefits**
 * - Simpler API than `new ContainerModule()`
 * - Only requires `bind` parameter (most common use case)
 * - Supports extended signature for advanced cases
 *
 * @see {@link CreateModule} for creating modules from controllers
 * @see {@link combineModules} for combining multiple modules
 *
 * @public API
 */
export function createModule(callback: BindingsCallback): ContainerModule {
  return new ContainerModule(
    (
      bind: interfaces.Bind,
      unbind: interfaces.Unbind,
      isBound: interfaces.IsBound,
      rebind: interfaces.Rebind,
    ) => {
      callback(bind, unbind, isBound, rebind);
    },
  );
}

/**
 * Decorator to set binding scope for a class.
 *
 * @layer public
 * @audience application-developers
 * @concept scope-decorator
 * @difficulty intermediate
 *
 * @summary Quick Start
 * Set the binding scope for a class using a decorator.
 *
 * @example
 * ```typescript
 * @scope(Scope.Singleton)
 * export class CacheService { }
 * ```
 *
 * @param binding - Binding scope (Singleton, Transient, Request, or custom string)
 * @returns A class decorator
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Behavior**
 * - Stores binding type in metadata
 * - Applies appropriate `@provide()` decorator based on scope
 * - Singleton → `@provideSingleton()`
 * - Transient → `@provideTransient()`
 * - Request/Other → `@provide()`
 *
 * @see {@link Scope} for built-in scopes
 *
 * @public API
 */
const scope = (binding: interfaces.BindingScope) => {
  return function (target: any) {
    if (!Reflect.hasMetadata(BINDING_TYPE_METADATA_KEY, target)) {
      Reflect.defineMetadata(BINDING_TYPE_METADATA_KEY, binding, target);

      switch (binding) {
        case Scope.Singleton:
          provideSingleton(target);
          break;
        case Scope.Transient:
          provideTransient(target);
          break;
        default:
          provide(target);
          break;
      }
    }
  };
};

/**
 * Type alias for a map of controller symbols to controller constructor functions.
 */
type controllerType = Map<symbol, new () => any>;

/**
 * Base class for creating InversifyJS container modules.
 *
 * @layer public
 * @audience application-developers
 * @concept module-base
 * @difficulty intermediate
 *
 * @summary Quick Start
 * Provides static methods for creating container modules from controllers.
 * Typically used via `CreateModule()` convenience function.
 *
 * @example
 * ```typescript
 * const module = CreateModule([UserController, AuthController]);
 * ```
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Architecture**
 *
 * BaseModule provides:
 * - `createContainerModule()` - Creates modules from controllers
 * - `bindToScope()` - Helper for binding with specific scope
 * - `createSymbols()` - Creates symbols for controllers
 *
 * **Design Decisions**
 * - Uses symbols for controller identification
 * - Supports metadata-based scope detection
 * - Flexible parameter handling (scope or bindings callback)
 *
 * @see {@link CreateModule} for the convenience function
 *
 * @public API
 */
export class BaseModule {
  /**
   * Create a map of symbols for the provided controllers.
   * @param controllers - An array of controller classes.
   * @returns A map of symbols mapped to controller constructor functions.
   */
  private static createSymbols(controllers: Array<any>): controllerType {
    const symbols = new Map<symbol, new () => any>();

    for (const controller of controllers) {
      const target = controller;
      const symbol = Symbol.for(target.name);
      symbols.set(symbol, target);
    }

    return symbols;
  }

  /**
   * Bind a controller symbol to its target class using the given scope.
   * Built-in scopes (Singleton, Transient, Request) map to their Inversify
   * equivalents; any other string is treated as a custom scope. Invalid
   * values fall back to request scope.
   *
   * @param symbol - Symbol identifying the controller binding
   * @param target - Controller class to bind
   * @param bindingType - Binding scope (built-in or custom string)
   * @param bind - The Inversify bind function from the container module
   */
  public static bindToScope(
    symbol: symbol,
    target: new () => any,
    bindingType: interfaces.BindingScope,
    bind: interfaces.Bind,
  ) {
    // Handle built-in scopes
    switch (bindingType) {
      case Scope.Singleton:
        bind(symbol).to(target).inSingletonScope();
        return;
      case Scope.Transient:
        bind(symbol).to(target).inTransientScope();
        provideTransient(target);
        return;
      case Scope.Request:
        bind(symbol).to(target).inRequestScope();
        return;
    }

    // Handle custom scopes (any string that's not a built-in scope)
    if (
      typeof bindingType === "string" &&
      bindingType !== Scope.Singleton &&
      bindingType !== Scope.Request &&
      bindingType !== Scope.Transient
    ) {
      bind(symbol).to(target).inScope(bindingType);
    } else {
      // Default to request scope if scope is invalid
      bind(symbol).to(target).inRequestScope();
    }
  }

  /**
   * Create an InversifyJS ContainerModule for the provided controllers.
   *
   * @layer public
   * @audience application-developers
   * @concept module-creation
   * @difficulty beginner
   *
   * @summary Quick Start
   * Create a container module from controllers. Supports optional scope and custom bindings.
   *
   * @example
   * ```typescript
   * // Simple usage - just controllers
   * const module = CreateModule([UserController, AuthController]);
   *
   * // With scope
   * const module = CreateModule([UserController], Scope.Singleton);
   *
   * // With custom bindings (simple callback)
   * const module = CreateModule([UserController], (bind) => {
   *   bind<ILogger>("ILogger").to(ConsoleLogger);
   * });
   *
   * // With scope AND custom bindings
   * const module = CreateModule([UserController], Scope.Singleton, (bind) => {
   *   bind<ILogger>("ILogger").to(ConsoleLogger);
   * });
   * ```
   *
   * @param controllers - An array of controller classes.
   * @param scopeOrBindings - An optional binding scope or custom bindings callback.
   * @param customBindings - An optional callback for additional custom bindings (only used if scopeOrBindings is a scope).
   * @returns A ContainerModule with the controller bindings.
   *
   * @layer internal
   * @audience framework-developers
   *
   * **Internal Behavior**
   *
   * 1. Creates symbols for each controller
   * 2. Determines scope (from parameter or metadata)
   * 3. Binds controllers with appropriate scope
   * 4. Executes custom bindings callback if provided
   *
   * **Parameter Resolution**
   * - If `scopeOrBindings` is a function → treated as bindings callback
   * - If `scopeOrBindings` is a scope → uses that scope, `customBindings` as callback
   * - If `scopeOrBindings` is undefined → uses metadata-based scope
   *
   * @see {@link scope} decorator for setting scope via metadata
   * @see {@link combineModules} for combining multiple modules
   *
   * @public API
   */
  public static createContainerModule(
    controllers: Array<any>,
    scopeOrBindings?: interfaces.BindingScope | BindingsCallback,
    customBindings?: BindingsCallback,
  ): ContainerModule {
    const symbols = BaseModule.createSymbols(controllers);

    // Determine if second param is scope or bindings callback
    let scope: interfaces.BindingScope | undefined;
    let bindings: BindingsCallback | undefined;

    if (typeof scopeOrBindings === "function") {
      // Second param is a bindings callback
      bindings = scopeOrBindings;
    } else if (scopeOrBindings !== undefined) {
      // Second param is a scope
      scope = scopeOrBindings;
      bindings = customBindings;
    }

    return new ContainerModule(
      (
        bind: interfaces.Bind,
        unbind: interfaces.Unbind,
        isBound: interfaces.IsBound,
        rebind: interfaces.Rebind,
      ) => {
        // Bind controllers
        for (const [symbol, target] of symbols) {
          if (scope) {
            BaseModule.bindToScope(symbol, target, scope, bind);
          } else {
            const bindingType = Reflect.getMetadata(
              BINDING_TYPE_METADATA_KEY,
              target,
            );
            BaseModule.bindToScope(symbol, target, bindingType, bind);
          }
        }

        // Execute custom bindings callback if provided
        if (bindings) {
          bindings(bind, unbind, isBound, rebind);
        }
      },
    );
  }
}

/**
 * Convenience alias for {@link BaseModule.createContainerModule}.
 * Creates a ContainerModule from an array of controllers, with optional
 * scope and custom bindings callback.
 *
 * @example
 * ```typescript
 * export const UserModule = CreateModule([UserController]);
 * ```
 *
 * @public API
 */
const CreateModule = BaseModule.createContainerModule;

export { CreateModule, scope };
