import { Scope, interfaces } from "../di/inversify";
import { Logger } from "./logger/logger.provider";
import { ProviderRegistry } from "./provider-registry";
import {
  IProvider,
  ProviderInfo,
  ProviderSource,
  HealthDashboard,
  MetricsDashboard,
  ProviderCapabilities,
} from "./provider.interface";

// Re-export IProvider for backward compatibility
export { IProvider };

/**
 * Provider manager for dependency injection providers.
 *
 * @layer public
 * @audience application-developers
 * @concept provider-management
 * @difficulty beginner
 *
 * @summary Quick Start
 * Manage dependency injection providers with introspection, health checks, and metrics.
 *
 * @example
 * ```typescript
 * const manager = new ProviderManager(container);
 *
 * // Register a provider
 * manager.register(MyProvider, Scope.Singleton);
 *
 * // Discover all providers
 * manager.discover();
 *
 * // Get provider
 * const provider = manager.get(MyProvider);
 * ```
 *
 * **Features:**
 * - Provider registration with scopes
 * - Auto-discovery of providers
 * - Health checks and metrics collection
 * - Provider introspection
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Architecture**
 *
 * ProviderManager:
 * - Wraps InversifyJS container
 * - Delegates to ProviderRegistry for discovery
 * - Provides high-level API for provider management
 *
 * **Design Decisions**
 * - Thin wrapper around container and registry
 * - Backward compatible with existing code
 * - Enhanced with introspection capabilities
 *
 * @see {@link ProviderRegistry} for provider discovery
 * @see {@link IProvider} for provider interface
 *
 * @public API
 */
export class ProviderManager {
  private container: interfaces.Container;
  private logger: Logger = new Logger();
  private registry: ProviderRegistry;

  constructor(container: interfaces.Container) {
    this.container = container;
    this.registry = new ProviderRegistry(container);
  }

  /**
   * Discover all providers in the container.
   * Call this after the container is fully initialized.
   * @public API
   */
  public discover(): void {
    this.registry.discover();
  }

  /**
   * Get the provider registry instance.
   * @returns The provider registry
   * @public API
   */
  public getRegistry(): ProviderRegistry {
    return this.registry;
  }

  /**
   * Register a provider by binding it to itself with optional scope.
   * @param serviceIdentifier - The service identifier for the provider.
   * @param scope - The binding scope.
   * @public API
   */
  public register<T>(
    serviceIdentifier: interfaces.ServiceIdentifier<T>,
    scope?: interfaces.BindingScope,
  ): void;

  /**
   * Overload: Register a provider by binding a service identifier to a specific implementation with optional scope.
   * @param serviceIdentifier - The service identifier for the provider.
   * @param constructor - The implementation class.
   * @param scope - The binding scope.
   * @public API
   */
  public register<T>(
    serviceIdentifier: interfaces.ServiceIdentifier<T>,
    constructor: interfaces.Newable<T>,
    scope?: interfaces.BindingScope,
  ): void;

  /**
   * Register a provider with the container.
   * @public API
   */
  public register<T>(
    serviceIdentifier: interfaces.ServiceIdentifier<T>,
    constructorOrScope?: interfaces.Newable<T> | interfaces.BindingScope,
    scope: interfaces.BindingScope = Scope.Request,
  ): void {
    if (this.container.isBound(serviceIdentifier)) {
      this.logger.warn(
        `${(serviceIdentifier as unknown as IProvider).name} already registered`,
        "provider-manager",
      );
      return;
    }

    let binding: interfaces.BindingInWhenOnSyntax<T>;

    if (typeof constructorOrScope === "function") {
      // Overload where constructor is provided
      const constructor = constructorOrScope as interfaces.Newable<T>;
      const scopeDefinition = scope || Scope.Transient;

      binding = this.container.bind<T>(serviceIdentifier).to(constructor);
      this.applyScope(binding, scopeDefinition);
    } else {
      const scopeDefinition =
        (constructorOrScope as interfaces.BindingScope) || Scope.Transient;

      binding = this.container.bind<T>(serviceIdentifier).toSelf();
      this.applyScope(binding, scopeDefinition);
    }
  }

  /**
   * Get a provider from the container.
   * @param serviceIdentifier - The service identifier to get from the container.
   * @returns An instance of the provider.
   * @public API
   */
  public get<T>(serviceIdentifier: interfaces.ServiceIdentifier<T>): T {
    if (!this.container.isBound(serviceIdentifier)) {
      this.logger.error(
        `${this.getServiceIdentifierName(serviceIdentifier)} not registered`,
        "ProviderManager",
      );
      throw new Error(
        `Provider ${this.getServiceIdentifierName(serviceIdentifier)} not registered`,
      );
    }
    return this.container.get<T>(serviceIdentifier);
  }

  /**
   * Apply the scope to the binding.
   * @param binding - The binding to apply the scope to.
   * @param scope - The scope to apply (built-in or custom scope name).
   * @private
   */
  private applyScope<T>(
    binding: interfaces.BindingInWhenOnSyntax<T>,
    scope: interfaces.BindingScope,
  ): void {
    // Handle built-in scopes
    switch (scope) {
      case Scope.Singleton:
        binding.inSingletonScope();
        return;
      case Scope.Request:
        binding.inRequestScope();
        return;
      case Scope.Transient:
        binding.inTransientScope();
        return;
    }

    // Handle custom scopes (any string that's not a built-in scope)
    if (
      typeof scope === "string" &&
      scope !== Scope.Singleton &&
      scope !== Scope.Request &&
      scope !== Scope.Transient
    ) {
      binding.inScope(scope);
    } else {
      // Default to transient if scope is invalid
      binding.inTransientScope();
    }
  }

  /**
   * Get the name of the service identifier for logging purposes.
   * @param serviceIdentifier - The service identifier.
   * @returns The name of the service identifier.
   * @private
   */
  private getServiceIdentifierName(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    serviceIdentifier: interfaces.ServiceIdentifier<any>,
  ): string {
    if (typeof serviceIdentifier === "function") {
      return serviceIdentifier.name;
    } else if (typeof serviceIdentifier === "symbol") {
      return serviceIdentifier.toString();
    } else {
      return serviceIdentifier as string;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INTROSPECTION METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get all registered providers with metadata.
   * @returns Array of provider information
   * @public API
   */
  public getAll(): Array<ProviderInfo> {
    return this.registry.getAll();
  }

  /**
   * Get providers by scope.
   * @param scope - The scope to filter by
   * @returns Array of providers with the specified scope
   * @public API
   */
  public getByScope(scope: string): Array<ProviderInfo> {
    return this.registry.getByScope(scope);
  }

  /**
   * Get providers with a specific capability.
   * @param capability - The capability to filter by
   * @returns Array of providers with the capability
   * @public API
   */
  public getWithCapability(
    capability: keyof ProviderCapabilities,
  ): Array<ProviderInfo> {
    return this.registry.getWithCapability(capability);
  }

  /**
   * Get total provider count.
   * @returns Number of registered providers
   * @public API
   */
  public getCount(): number {
    return this.registry.getCount();
  }

  /**
   * Check if a provider is registered.
   * @param serviceIdentifier - The service identifier to check
   * @returns true if registered
   * @public API
   */
  public has<T>(serviceIdentifier: interfaces.ServiceIdentifier<T>): boolean {
    return this.container.isBound(serviceIdentifier);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HEALTH & METRICS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Run health checks on all IHealthCheck providers.
   * @returns Health dashboard with all results
   * @public API
   */
  public async checkHealth(): Promise<HealthDashboard> {
    return this.registry.checkHealth();
  }

  /**
   * Collect metrics from all IMetrics providers.
   * @returns Metrics dashboard with all metrics
   * @public API
   */
  public collectMetrics(): MetricsDashboard {
    return this.registry.collectMetrics();
  }

  /**
   * Get providers that have lifecycle hooks (bootstrap/shutdown).
   * @returns Array of providers with lifecycle hooks
   * @public API
   */
  public getLifecycleProviders(): Array<ProviderInfo> {
    return this.registry.getLifecycleProviders();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SOURCE-BASED METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get providers by source type.
   * @param source - The provider source to filter by
   * @returns Array of providers with the specified source
   * @public API
   */
  public getBySource(source: ProviderSource): Array<ProviderInfo> {
    return this.registry.getBySource(source);
  }

  /**
   * Get all built-in providers (core framework providers).
   * @returns Array of built-in providers
   * @public API
   */
  public getBuiltinProviders(): Array<ProviderInfo> {
    return this.registry.getBuiltinProviders();
  }

  /**
   * Get all user-defined providers (application providers).
   * @returns Array of user providers
   * @public API
   */
  public getUserProviders(): Array<ProviderInfo> {
    return this.registry.getUserProviders();
  }

  /**
   * Get all external providers (third-party plugins).
   * @returns Array of external providers
   * @public API
   */
  public getExternalProviders(): Array<ProviderInfo> {
    return this.registry.getExternalProviders();
  }

  /**
   * Get a formatted view for banner display.
   * @param maxDisplay - Maximum number of providers to show
   * @returns Formatted provider view with source breakdown
   * @public API
   */
  public getFormattedView(maxDisplay: number = 5): {
    entries: Array<{
      name: string;
      scope: string;
      source: ProviderSource;
      hasLifecycle: boolean;
      hasHealthCheck: boolean;
      hasMetrics: boolean;
    }>;
    total: number;
    remaining: number;
    bySource: {
      builtin: number;
      user: number;
      external: number;
    };
  } {
    return this.registry.getFormattedView(maxDisplay);
  }
}
