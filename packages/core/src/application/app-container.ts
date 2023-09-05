import {
  BindingScopeEnum,
  Container,
  ContainerModule,
  interfaces,
} from "inversify";
import { buildProviderModule, provide } from "inversify-binding-decorators";

/**
 * Interface for container options that can be passed to the AppContainer class.
 */
interface ContainerOptions {
  /**
   * The default scope for bindings in the container.
   * It can be set to Request (default), Singleton, or Transient.
   */
  defaultScope?: interfaces.BindingScope;

  /**
   * Allows skipping of base class checks when working with derived classes.
   */
  skipBaseClassChecks?: boolean;
}

/**
 * The AppContainer class provides a container for managing dependency injection.
 * It allows the creation of a container with custom options, including default binding scope
 * and the ability to skip base class checks. The container can be loaded with multiple
 * ContainerModule instances, facilitating modular and organized code.
 *
 * Usage:
 * const appContainer = new AppContainer(options);
 * const container = appContainer.create(modules);
 *
 * @provide AppContainer
 */
@provide(AppContainer)
class AppContainer {
  private container!: Container;
  private options: ContainerOptions;

  /**
   * Constructs the AppContainer instance.
   * @param options - The options for creating the container. Can include custom default scope and skip base class checks setting.
   */
  constructor(options?: ContainerOptions) {
    this.options = {
      defaultScope: BindingScopeEnum.Request,
      ...options,
    };
  }

  /**
   * Creates and configures a new dependency injection container.
   * @param modules - An array of ContainerModule instances to load into the container.
   * @param defaultScope - The default scope to use for bindings. Scoped (Request) by default, but offers Singleton and Transient as well.
   * @returns The configured dependency injection container.
   */
  public create(modules: Array<ContainerModule>): Container {
    const containerOptions: interfaces.ContainerOptions = {
      autoBindInjectable: true,
      ...this.options,
    };

    this.container = new Container(containerOptions);
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
    return this.container.options;
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
