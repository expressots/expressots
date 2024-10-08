import "reflect-metadata";
import {
  BindingScopeEnum,
  Container,
  ContainerModule,
  interfaces,
} from "inversify";
import { buildProviderModule, provide } from "inversify-binding-decorators";

/**
 * Represents a single binding in the dependency injection container.
 */
interface Binding {
  /**
   * Unique identifier for this binding.
   */
  id: number;

  /**
   * Indicates whether this binding is activated.
   */
  activated: boolean;

  /**
   * Symbol used to identify the service.
   */
  serviceIdentifier: symbol;

  /**
   * Scope of the binding (e.g., 'Singleton', 'Transient', 'Request').
   */
  scope: string;

  /**
   * Type of the binding (e.g., 'Instance', 'Factory', 'Provider').
   */
  type: string;

  /**
   * Object used to match or constrain the binding.
   */
  constraint: object;

  /**
   * The actual implementation type of the service.
   */
  implementationType: object;

  /**
   * Cached instance, used if the binding's scope allows it.
   */
  cache: object | null;

  /**
   * Optional factory to create the service instance.
   */
  factory: object | null;

  /**
   * Optional provider to create the service instance.
   */
  provider: object | null;

  /**
   * Function to run when activating a new instance.
   */
  onActivation: object | null;

  /**
   * Function to run when deactivating an instance.
   */
  onDeactivation: object | null;

  /**
   * Optional dynamic value that can be used to resolve the service.
   */
  dynamicValue: object | null;

  /**
   * Module ID where the binding is defined, useful for debugging.
   */
  moduleId: number;
}

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

  /**
   * Allows auto-binding of injectable classes.
   */
  autoBindInjectable?: boolean;
}

/**
 * The AppContainer class provides a container for managing dependency injection.
 * It allows the creation of a container with custom options, including default binding scope
 * and the ability to skip base class checks. The container can be loaded with multiple
 * ContainerModule instances, facilitating modular and organized code.
 *
 * @example
 * ```typescript
 * const container = new AppContainer();
 * container.create([new MyModule()]);
 */
@provide(AppContainer)
class AppContainer {
  private container!: Container;
  private options: ContainerOptions;

  /**
   * Constructs the AppContainer instance.
   * @param options - The options for creating the container with default request scope.
   * @option options.defaultScope - The default scope for bindings in the container.
   * @option options.skipBaseClassChecks - Allows skipping of base class checks when working with derived classes.
   * @option options.autoBindInjectable - Allows auto-binding of injectable classes.
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
   * @returns The configured dependency injection container.
   */
  public create(modules: Array<ContainerModule>): Container {
    const containerOptions: interfaces.ContainerOptions = {
      autoBindInjectable: this.options.autoBindInjectable
        ? this.options.autoBindInjectable
        : true,
      ...this.options,
    };

    this.container = new Container(containerOptions);
    this.container.bind(Container).toConstantValue(this.container);
    this.container.load(buildProviderModule(), ...modules);

    return this.container;
  }

  /**
   * Retrieves the binding dictionary of the container.
   * @returns(void) Print table of the binding dictionary of the container.
   */
  public viewContainerBindings(): void {
    const dictionary = this.container["_bindingDictionary"]._map;
    const entries: Array<[string, Array<Binding>]> = Array.from(
      dictionary.entries(),
    );

    const table = entries
      .map(([identifier, bindings]) => {
        return bindings.map((binding) => ({
          "Service Identifier": identifier,
          Scope: binding.scope,
          Type: binding.type,
          Cache: binding.cache !== null ? "Yes" : "No",
        }));
      })
      .flat();

    console.table(table);
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
