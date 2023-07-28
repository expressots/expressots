import {
  BindingScopeEnum,
  Container,
  ContainerModule,
  interfaces,
} from "inversify";
import { buildProviderModule, provide } from "inversify-binding-decorators";

/**
 * The AppContainer class provides a container for managing dependency injection.
 * @provide AppContainer
 */
@provide(AppContainer)
class AppContainer {
  private container!: Container;
  /**
   * Creates and configures a new dependency injection container.
   * @param modules - An array of ContainerModule instances to load into the container.
   * @param defaultScope - The default scope to use for bindings. Scoped (Request) by default, but offers Singleton and Transient as well.
   * @returns The configured dependency injection container.
   */
  public create(
    modules: ContainerModule[],
    defaultScope: interfaces.BindingScope = BindingScopeEnum.Request,
  ): Container {
    this.container = new Container({
      autoBindInjectable: true,
      defaultScope,
    });

    this.container.load(buildProviderModule(), ...modules);

    return this.container;
  }

  /**
   * Retrieves the binding dictionary of the container.
   * @returns The binding dictionary of the container.
   */
  public getBindingDictionary(): Map<any, any> {
    return this.container["_bindingDictionary"]._map;
  }

  /**
   * Retrieves the container options.
   * @returns The container options.
   */
  public getContainerOptions(): interfaces.ContainerOptions {
    return this.container["options"];
  }

  /**
   * Retrieves the container.
   * @returns The container.
   */
  public get Container(): Container {
    return this.container;
  }
}

export { AppContainer };
