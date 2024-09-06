/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { BindingScopeEnum, ContainerModule, interfaces } from "../di/inversify";
import { provide } from "inversify-binding-decorators";
import { provideSingleton, provideTransient } from "../decorator";

/**
 * Key to be used for storing and retrieving binding type metadata.
 */
export const BINDING_TYPE_METADATA_KEY = "binding-type";

/**
 * The scope decorator is a higher order function that can be used to decorate a class with a binding type.
 * @param binding An instance of interfaces.BindingScope which represents the binding type.
 * @returns A decorator function that can be used to decorate a class with a binding type.
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
@provide(BaseModule)
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
    switch (bindingType) {
      case BindingScopeEnum.Singleton:
        bind(symbol).to(target).inSingletonScope();
        break;
      case BindingScopeEnum.Transient:
        bind(symbol).to(target).inTransientScope();
        provideTransient(target);
        break;
      case BindingScopeEnum.Request:
        bind(symbol).to(target).inRequestScope();
        break;
      default:
        bind(symbol).to(target).inRequestScope();
        break;
    }
  }

  /**
   * Create an InversifyJS ContainerModule for the provided controllers.
   * @param controllers - An array of controller classes.
   * @param scope - An optional binding scope to be used for all controllers.
   * @returns A ContainerModule with the controller bindings.
   */
  public static createContainerModule(
    controllers: Array<any>,
    scope?: interfaces.BindingScope,
  ): ContainerModule {
    const symbols = BaseModule.createSymbols(controllers);

    return new ContainerModule((bind) => {
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
    });
  }
}

const CreateModule = BaseModule.createContainerModule;

export { CreateModule, scope };
