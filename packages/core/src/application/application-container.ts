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
 * Dependency injection container wrapper for ExpressoTS applications.
 *
 * @layer public
 * @audience application-developers
 * @concept dependency-injection
 * @difficulty intermediate
 *
 * @summary Quick Start
 * AppContainer wraps InversifyJS container with ExpressoTS-specific defaults.
 * Typically used internally by the framework, but available for advanced use cases.
 *
 * @example
 * ```typescript
 * // Basic usage
 * const container = new AppContainer();
 * container.create([new MyModule()]);
 *
 * // With custom options
 * const container = new AppContainer({
 *   defaultScope: BindingScopeEnum.Singleton
 * });
 * container.create([new MyModule()]);
 * ```
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Architecture**
 *
 * AppContainer wraps InversifyJS Container with:
 * - Default request scope (one instance per HTTP request)
 * - Auto-binding of injectable classes
 * - Integration with ExpressoTS provider system
 * - Built-in provider module loading
 *
 * **Design Decisions**
 * - Request scope by default (stateless, scalable)
 * - Auto-bind injectable for convenience
 * - Wraps InversifyJS for type safety
 * - Provides debugging utilities (viewContainerBindings)
 *
 * **Default Behavior**
 * - `defaultScope`: `BindingScopeEnum.Request` (one per request)
 * - `autoBindInjectable`: `true` (automatic binding)
 * - Loads `buildProviderModule()` automatically
 *
 * @see {@link ContainerModule} for creating modules
 * @see {@link buildProviderModule} for provider registration
 *
 * @layer advanced
 * @audience power-users
 *
 * **Advanced Usage**
 *
 * Custom scope configuration:
 * ```typescript
 * const container = new AppContainer({
 *   defaultScope: BindingScopeEnum.Singleton,  // One instance for app lifetime
 *   skipBaseClassChecks: true
 * });
 * container.create([new MyModule()]);
 * ```
 *
 * Debugging container bindings:
 * ```typescript
 * container.create([new MyModule()]);
 * container.viewContainerBindings();  // Prints table of all bindings
 * ```
 *
 * Accessing underlying InversifyJS container:
 * ```typescript
 * const inversifyContainer = container.Container;
 * // Use InversifyJS APIs directly if needed
 * ```
 *
 * @public API
 */
export class AppContainer {
  private container!: Container;
  private options: interfaces.ContainerOptions;
  private logger?: Logger;

  /**
   * Constructs the AppContainer instance.
   *
   * @layer public
   * @audience application-developers
   *
   * @param options - Optional container configuration options.
   *
   * @default
   * ```typescript
   * {
   *   defaultScope: BindingScopeEnum.Request,
   *   autoBindInjectable: true
   * }
   * ```
   *
   * **Common Options:**
   * - `defaultScope`: Binding scope (Request, Singleton, Transient)
   * - `skipBaseClassChecks`: Skip base class validation
   * - `autoBindInjectable`: Auto-bind classes with @injectable()
   *
   * @example
   * ```typescript
   * // Default (request scope)
   * const container = new AppContainer();
   *
   * // Singleton scope
   * const container = new AppContainer({
   *   defaultScope: BindingScopeEnum.Singleton
   * });
   * ```
   *
   * @public API
   */
  constructor(options?: interfaces.ContainerOptions) {
    this.options = {
      defaultScope: BindingScopeEnum.Request,
      ...options,
    };
  }

  /**
   * Gets or creates the logger instance (lazy initialization).
   * @returns Logger instance
   * @private
   */
  private getLogger(): Logger {
    if (!this.logger) {
      this.logger = new Logger();
    }
    return this.logger;
  }

  /**
   * Creates and configures the dependency injection container.
   *
   * @layer public
   * @audience application-developers
   *
   * @param modules - Array of ContainerModule instances to load.
   *
   * **What Happens:**
   * 1. Creates InversifyJS container with configured options
   * 2. Binds container to itself (for injection)
   * 3. Loads built-in provider module
  4. Loads your custom modules
   *
   * @example
   * ```typescript
   * const container = new AppContainer();
   * container.create([
   *   new AppModule(),
   *   new UserModule(),
   *   new ProductModule()
   * ]);
   * ```
   *
   * @layer internal
   * @audience framework-developers
   *
   * **Implementation Details**
   * - Always loads `buildProviderModule()` first
   * - Then loads provided modules in order
   * - Container is ready for resolution after this call
   *
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
   * Displays all container bindings in a formatted table.
   *
   * @layer public
   * @audience application-developers
   * @concept debugging
   *
   * **Useful for:**
   * - Debugging dependency injection issues
   * - Understanding what's registered in the container
   * - Verifying binding scopes
   *
   * @example
   * ```typescript
   * container.create([new MyModule()]);
   * container.viewContainerBindings();
   * // Prints table showing:
   * // - Service Identifier
   * // - Scope (Request, Singleton, Transient)
   * // - Type (ConstantValue, Constructor, etc.)
   * // - Cache status
   * ```
   *
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
   * Retrieves the container configuration options.
   *
   * @layer public
   * @audience application-developers
   *
   * @returns The container options, or undefined if container not created yet.
   *
   * @example
   * ```typescript
   * const container = new AppContainer({
   *   defaultScope: BindingScopeEnum.Singleton
   * });
   * container.create([new MyModule()]);
   *
   * const options = container.getContainerOptions();
   * console.log(options.defaultScope);  // BindingScopeEnum.Singleton
   * ```
   *
   * @public API
   */
  public getContainerOptions(): interfaces.ContainerOptions | undefined {
    if (!this.container) {
      this.getLogger().error("Container not created yet.", "app-container");
      return undefined;
    }

    return this.container.options;
  }

  /**
   * Retrieves the underlying InversifyJS container instance.
   *
   * @layer public
   * @audience power-users
   *
   * **Use Cases:**
   * - Accessing InversifyJS-specific APIs
   * - Advanced container manipulation
   * - Integration with InversifyJS plugins
   *
   * @returns The InversifyJS Container instance.
   *
   * @example
   * ```typescript
   * const container = new AppContainer();
   * container.create([new MyModule()]);
   *
   * const inversifyContainer = container.Container;
   * // Use InversifyJS APIs directly
   * ```
   *
   * @public API
   */
  public get Container(): Container {
    return this.container;
  }
}
