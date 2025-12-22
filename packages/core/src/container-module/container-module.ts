/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { BindingScopeEnum, ContainerModule, interfaces } from "../di/inversify";
import { provideSingleton, provideTransient } from "../decorator";
import { provide } from "../di/binding-decorator";

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
export type BindingsCallback = SimpleBindingsCallback | ExtendedBindingsCallback;

/**
 * Combines multiple ContainerModules into a single ContainerModule.
 * This simplifies module composition without requiring users to know
 * the full ContainerModuleCallBack signature.
 *
 * @param modules - ContainerModules to combine
 * @returns A single ContainerModule that loads all provided modules
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
 * @public API
 */
export function combineModules(...modules: Array<ContainerModule>): ContainerModule {
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
 * This provides a cleaner API than using `new ContainerModule()` directly,
 * as users only need to provide the `bind` parameter.
 *
 * @param callback - A callback that receives the `bind` function
 * @returns A ContainerModule
 *
 * @example
 * ```typescript
 * const customModule = createModule((bind) => {
 *   bind<ILogger>("ILogger").to(ConsoleLogger).inSingletonScope();
 *   bind<ICache>("ICache").to(RedisCache);
 * });
 * ```
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
 * The scope decorator is a higher order function that can be used to decorate a class with a binding type.
 * @param binding An instance of interfaces.BindingScope which represents the binding type.
 * @returns A decorator function that can be used to decorate a class with a binding type.
 * @public API
 */
const scope = (binding: interfaces.BindingScope) => {
  return function (target: any) {
    if (!Reflect.hasMetadata(BINDING_TYPE_METADATA_KEY, target)) {
      Reflect.defineMetadata(BINDING_TYPE_METADATA_KEY, binding, target);

      switch (binding) {
        case BindingScopeEnum.Singleton:
          provideSingleton(target);
          break;
        case BindingScopeEnum.Transient:
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
 * The BaseModule class provides methods for creating InversifyJS container modules.
 * @provide BaseModule
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

  public static bindToScope(
    symbol: symbol,
    target: new () => any,
    bindingType: interfaces.BindingScope,
    bind: interfaces.Bind,
  ) {
    // Handle built-in scopes
    switch (bindingType) {
      case BindingScopeEnum.Singleton:
        bind(symbol).to(target).inSingletonScope();
        return;
      case BindingScopeEnum.Transient:
        bind(symbol).to(target).inTransientScope();
        provideTransient(target);
        return;
      case BindingScopeEnum.Request:
        bind(symbol).to(target).inRequestScope();
        return;
    }

    // Handle custom scopes (any string that's not a built-in scope)
    if (
      typeof bindingType === "string" &&
      bindingType !== BindingScopeEnum.Singleton &&
      bindingType !== BindingScopeEnum.Request &&
      bindingType !== BindingScopeEnum.Transient
    ) {
      bind(symbol).to(target).inScope(bindingType);
    } else {
      // Default to request scope if scope is invalid
      bind(symbol).to(target).inRequestScope();
    }
  }

  /**
   * Create an InversifyJS ContainerModule for the provided controllers.
   * @param controllers - An array of controller classes.
   * @param scopeOrBindings - An optional binding scope or custom bindings callback.
   * @param customBindings - An optional callback for additional custom bindings.
   * @returns A ContainerModule with the controller bindings.
   *
   * @example
   * ```typescript
   * // Simple usage - just controllers
   * const module = CreateModule([UserController, AuthController]);
   *
   * // With scope
   * const module = CreateModule([UserController], BindingScopeEnum.Singleton);
   *
   * // With custom bindings (simple callback)
   * const module = CreateModule([UserController], (bind) => {
   *   bind<ILogger>("ILogger").to(ConsoleLogger);
   * });
   *
   * // With scope AND custom bindings
   * const module = CreateModule([UserController], BindingScopeEnum.Singleton, (bind) => {
   *   bind<ILogger>("ILogger").to(ConsoleLogger);
   * });
   * ```
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

const CreateModule = BaseModule.createContainerModule;

export { CreateModule, scope };
