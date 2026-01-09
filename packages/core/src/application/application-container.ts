import "reflect-metadata";

import { Scope, Container, ContainerModule, interfaces } from "../di/inversify";
import { buildProviderModule } from "../di/binding-decorator";
import { Logger } from "../provider";
import {
  BindingInfo,
  BindingsSummary,
  BindingsFilterOptions,
  ContainerIntrospection,
} from "./application.types";

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
 *   defaultScope: Scope.Singleton
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
 * - `defaultScope`: `Scope.Request` (one per request)
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
 *   defaultScope: Scope.Singleton,  // One instance for app lifetime
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
   *   defaultScope: Scope.Request,
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
   *   defaultScope: Scope.Singleton
   * });
   * ```
   *
   * @public API
   */
  constructor(options?: interfaces.ContainerOptions) {
    this.options = {
      defaultScope: Scope.Request,
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

  // ═══════════════════════════════════════════════════════════════════════════
  // INTROSPECTION API - V4
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Retrieves detailed information about all container bindings.
   *
   * @layer public
   * @audience application-developers, studio
   * @concept introspection
   *
   * @returns Array of binding information objects.
   *
   * @example
   * ```typescript
   * const bindings = container.getBindingsInfo();
   * bindings.forEach(b => {
   *   console.log(`${b.serviceIdentifier}: ${b.scope} (${b.type})`);
   * });
   * ```
   *
   * @public API
   */
  public getBindingsInfo(): Array<BindingInfo> {
    if (!this.container) {
      this.getLogger().error("Container not created yet.", "app-container");
      return [];
    }

    const dictionary = this.container["_bindingDictionary"]._map;
    const entries: Array<[string, Array<interfaces.Binding>]> = Array.from(
      dictionary.entries(),
    );

    return entries
      .map(([identifier, bindings]) => {
        return bindings.map(
          (binding): BindingInfo => ({
            serviceIdentifier: this.formatServiceIdentifier(identifier),
            scope: binding.scope,
            type: binding.type,
            cached: binding.cache !== null,
            moduleId: binding.moduleId,
            activated: binding.activated,
          }),
        );
      })
      .flat();
  }

  /**
   * Retrieves summary statistics about container bindings.
   *
   * @layer public
   * @audience application-developers, studio
   * @concept introspection
   *
   * @returns Summary statistics object.
   *
   * @example
   * ```typescript
   * const summary = container.getBindingsSummary();
   * console.log(`Total bindings: ${summary.total}`);
   * console.log(`Singletons: ${summary.byScope['Singleton'] || 0}`);
   * ```
   *
   * @public API
   */
  public getBindingsSummary(): BindingsSummary {
    const bindings = this.getBindingsInfo();

    return {
      total: bindings.length,
      byScope: this.groupByProperty(bindings, "scope"),
      byType: this.groupByProperty(bindings, "type"),
      cached: bindings.filter((b) => b.cached).length,
      activated: bindings.filter((b) => b.activated).length,
    };
  }

  /**
   * Filters bindings based on specified criteria.
   *
   * @layer public
   * @audience application-developers
   * @concept introspection
   *
   * @param options - Filter options
   * @returns Filtered array of binding information.
   *
   * @example
   * ```typescript
   * // Get only singleton bindings
   * const singletons = container.filterBindings({ scope: 'Singleton' });
   *
   * // Get cached bindings
   * const cached = container.filterBindings({ cached: true });
   *
   * // Find by identifier pattern
   * const controllers = container.filterBindings({ identifier: 'Controller' });
   * ```
   *
   * @public API
   */
  public filterBindings(options: BindingsFilterOptions): Array<BindingInfo> {
    let bindings = this.getBindingsInfo();

    if (options.scope) {
      bindings = bindings.filter((b) => b.scope === options.scope);
    }

    if (options.type) {
      bindings = bindings.filter((b) => b.type === options.type);
    }

    if (options.cached !== undefined) {
      bindings = bindings.filter((b) => b.cached === options.cached);
    }

    if (options.activated !== undefined) {
      bindings = bindings.filter((b) => b.activated === options.activated);
    }

    if (options.identifier) {
      const pattern = options.identifier.toLowerCase();
      bindings = bindings.filter((b) =>
        b.serviceIdentifier.toLowerCase().includes(pattern),
      );
    }

    return bindings;
  }

  /**
   * Returns a formatted string view of container bindings.
   *
   * @layer public
   * @audience application-developers
   * @concept introspection
   *
   * @param options - Optional filter options
   * @returns Formatted string representation of bindings.
   *
   * @example
   * ```typescript
   * console.log(container.getFormattedBindingsView());
   *
   * // With filter
   * console.log(container.getFormattedBindingsView({ scope: 'Singleton' }));
   * ```
   *
   * @public API
   */
  public getFormattedBindingsView(options?: BindingsFilterOptions): string {
    const bindings = options
      ? this.filterBindings(options)
      : this.getBindingsInfo();
    const summary = this.getBindingsSummary();

    const lines: Array<string> = [];

    // Header
    lines.push("═══════════════════════════════════════════════════════════");
    lines.push("  CONTAINER BINDINGS");
    lines.push("═══════════════════════════════════════════════════════════");
    lines.push("");

    // Summary
    lines.push(`  Total: ${summary.total} bindings`);
    lines.push(
      `  By Scope: ${Object.entries(summary.byScope)
        .map(([k, v]) => `${k}(${v})`)
        .join(", ")}`,
    );
    lines.push(
      `  By Type: ${Object.entries(summary.byType)
        .map(([k, v]) => `${k}(${v})`)
        .join(", ")}`,
    );
    lines.push(`  Cached: ${summary.cached} | Activated: ${summary.activated}`);
    lines.push("");
    lines.push("───────────────────────────────────────────────────────────");

    // Bindings list
    const maxIdLen = Math.min(
      50,
      Math.max(...bindings.map((b) => b.serviceIdentifier.length), 20),
    );

    lines.push(
      `  ${"Service Identifier".padEnd(maxIdLen)}  ${"Scope".padEnd(10)}  ${"Type".padEnd(14)}  Cached`,
    );
    lines.push("───────────────────────────────────────────────────────────");

    for (const binding of bindings) {
      const id =
        binding.serviceIdentifier.length > maxIdLen
          ? binding.serviceIdentifier.substring(0, maxIdLen - 3) + "..."
          : binding.serviceIdentifier.padEnd(maxIdLen);

      lines.push(
        `  ${id}  ${binding.scope.padEnd(10)}  ${binding.type.padEnd(14)}  ${binding.cached ? "Yes" : "No"}`,
      );
    }

    lines.push("═══════════════════════════════════════════════════════════");

    return lines.join("\n");
  }

  /**
   * Complete container introspection for ExpressoTS Studio and external tools.
   *
   * @layer public
   * @audience application-developers, studio
   * @concept introspection
   *
   * @returns Complete introspection data including bindings, summary, and options.
   *
   * @example
   * ```typescript
   * const data = container.introspect();
   * // Send to ExpressoTS Studio
   * studioClient.send('container:introspection', data);
   * ```
   *
   * @public API
   */
  public introspect(): ContainerIntrospection {
    return {
      bindings: this.getBindingsInfo(),
      summary: this.getBindingsSummary(),
      options: {
        defaultScope: this.options.defaultScope,
        autoBindInjectable: this.options.autoBindInjectable,
        skipBaseClassChecks: this.options.skipBaseClassChecks,
      },
      timestamp: new Date().toISOString(),
      containerId: this.container?.id ?? -1,
    };
  }

  /**
   * Displays all container bindings in a formatted table.
   *
   * @layer public
   * @audience application-developers
   * @concept debugging
   *
   * @deprecated Use getFormattedBindingsView() for string output or introspect() for data.
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
    const bindings = this.getBindingsInfo();

    const table = bindings.map((binding) => ({
      "Service Identifier": binding.serviceIdentifier,
      Scope: binding.scope,
      Type: binding.type,
      Cache: binding.cached ? "Yes" : "No",
    }));

    console.table(table);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Formats a service identifier for display.
   * @private
   */
  private formatServiceIdentifier(identifier: string): string {
    // Handle class constructors
    if (identifier.startsWith("[class ")) {
      return identifier.replace("[class ", "").replace("]", "");
    }
    // Handle Symbol identifiers
    if (identifier.startsWith("Symbol(")) {
      return identifier;
    }
    return identifier;
  }

  /**
   * Groups bindings by a property and returns counts.
   * @private
   */
  private groupByProperty<K extends keyof BindingInfo>(
    bindings: Array<BindingInfo>,
    property: K,
  ): Record<string, number> {
    return bindings.reduce(
      (acc, binding) => {
        const key = String(binding[property]);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
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
   *   defaultScope: Scope.Singleton
   * });
   * container.create([new MyModule()]);
   *
   * const options = container.getContainerOptions();
   * console.log(options.defaultScope);  // Scope.Singleton
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
