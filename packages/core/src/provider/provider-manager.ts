import { BindingScopeEnum, interfaces } from "../di/inversify";
import { Logger } from "./logger/logger.provider";
import { ProviderRegistry } from "./provider-registry";
import {
  IProvider,
  ProviderInfo,
  HealthDashboard,
  MetricsDashboard,
  ProviderCapabilities,
} from "./provider.interface";

// Re-export IProvider for backward compatibility
export { IProvider };

/**
 * ProviderManager Class - A class for managing dependency injection providers.
 * Enhanced with introspection, health checks, and metrics collection.
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
    scope: interfaces.BindingScope = BindingScopeEnum.Request,
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
      const scopeDefinition = scope || BindingScopeEnum.Transient;

      binding = this.container.bind<T>(serviceIdentifier).to(constructor);
      this.applyScope(binding, scopeDefinition);
    } else {
      const scopeDefinition =
        (constructorOrScope as interfaces.BindingScope) ||
        BindingScopeEnum.Transient;

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
      case BindingScopeEnum.Singleton:
        binding.inSingletonScope();
        return;
      case BindingScopeEnum.Request:
        binding.inRequestScope();
        return;
      case BindingScopeEnum.Transient:
        binding.inTransientScope();
        return;
    }

    // Handle custom scopes (any string that's not a built-in scope)
    if (
      typeof scope === "string" &&
      scope !== BindingScopeEnum.Singleton &&
      scope !== BindingScopeEnum.Request &&
      scope !== BindingScopeEnum.Transient
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

  /**
   * Get a formatted view for banner display.
   * @param maxDisplay - Maximum number of providers to show
   * @returns Formatted provider view
   * @public API
   */
  public getFormattedView(maxDisplay: number = 5): {
    entries: Array<{
      name: string;
      scope: string;
      hasLifecycle: boolean;
      hasHealthCheck: boolean;
      hasMetrics: boolean;
    }>;
    total: number;
    remaining: number;
  } {
    return this.registry.getFormattedView(maxDisplay);
  }
}
