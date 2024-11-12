import "reflect-metadata";

import {
  BindingScopeEnum,
  Container,
  ContainerModule,
  interfaces,
} from "../di/inversify";
import { buildProviderModule } from "../di/binding-decorator";
import { Logger } from "../provider";

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
 * ```
 * @public API
 */
export class AppContainer {
  private container!: Container;
  private options: interfaces.ContainerOptions;
  private logger: Logger;

  /**
   * Constructs the AppContainer instance.
   * @param options - The options for creating the container with default request scope.
   * @option options.defaultScope - The default scope for bindings in the container.
   * @option options.skipBaseClassChecks - Allows skipping of base class checks when working with derived classes.
   * @option options.autoBindInjectable - Allows auto-binding of injectable classes.
   */
  constructor(options?: interfaces.ContainerOptions) {
    this.options = {
      defaultScope: BindingScopeEnum.Request,
      ...options,
    };
  }

  /**
   * Creates and configures a new dependency injection container.
   * @param modules - An array of ContainerModule instances to load into the container.
   * @returns The configured dependency injection container.
   * @public API
   */
  public create(modules: Array<ContainerModule>): void {
    const containerOptions: interfaces.ContainerOptions = {
      autoBindInjectable: this.options.autoBindInjectable
        ? this.options.autoBindInjectable
        : true,
      ...this.options,
    };

    this.container = new Container(containerOptions);
    this.container.bind(Container).toConstantValue(this.container);
    this.container.load(buildProviderModule(), ...modules);
  }

  /**
   * Retrieves the binding dictionary of the container.
   * @returns(void) Print table of the binding dictionary of the container.
   * @public API
   */
  public viewContainerBindings(): void {
    const dictionary = this.container["_bindingDictionary"]._map;

    const entries: Array<[string, Array<interfaces.Binding>]> = Array.from(
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
   * @public API
   */
  public getContainerOptions(): interfaces.ContainerOptions {
    this.logger = new Logger();

    if (!this.container) {
      this.logger.error("Container not created yet.", "app-container");
      return;
    }

    return this.container.options;
  }

  /**
   * Retrieves the container instance.
   * @returns The container instance.
   * @public API
   */
  public get Container(): Container {
    return this.container;
  }
}
