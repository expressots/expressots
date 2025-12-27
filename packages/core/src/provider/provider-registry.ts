/**
 * Provider Registry for ExpressoTS
 *
 * Auto-discovers providers and their capabilities, enabling
 * health checks, metrics collection, and introspection.
 *
 * @module provider
 */

import { interfaces } from "../di/inversify";
import { METADATA_KEY } from "../di/binding-decorator/constants";
import { BindingScopeEnum } from "../di/inversify";
import {
  ProviderInfo,
  ProviderCapabilities,
  HealthCheckResult,
  HealthDashboard,
  MetricsDashboard,
  ProviderMetrics,
  IProvider,
  ProviderSource,
  isHealthCheck,
  isMetrics,
} from "./provider.interface";
import { ProviderOptions } from "../decorator/scope-binding";

/**
 * Registry for auto-discovering and managing providers.
 *
 * @layer public
 * @audience application-developers
 * @concept provider-registry
 * @difficulty intermediate
 *
 * @summary Quick Start
 * Auto-discovers providers and enables health checks, metrics collection, and introspection.
 *
 * @example
 * ```typescript
 * const registry = new ProviderRegistry(container);
 * registry.discover();
 *
 * // Get all providers
 * const providers = registry.getAll();
 *
 * // Get health dashboard
 * const health = await registry.getHealthDashboard();
 *
 * // Get metrics dashboard
 * const metrics = registry.getMetricsDashboard();
 * ```
 *
 * **Features:**
 * - Auto-discovery from metadata
 * - Parallel health checks for better performance
 * - Cached queries for filtered results
 * - Provider source tracking (builtin, user, external)
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Architecture**
 *
 * ProviderRegistry:
 * - Scans Reflect metadata for `@provide()` decorators
 * - Detects provider capabilities (bootstrap, shutdown, health, metrics, config)
 * - Caches filtered queries for performance
 * - Tracks provider source (builtin, user, external)
 *
 * **Design Decisions**
 * - Auto-discovery reduces boilerplate
 * - Parallel health checks for performance
 * - Cached queries reduce repeated filtering
 * - Source tracking for introspection
 *
 * @see {@link ProviderManager} for provider management
 * @see {@link IProvider} for provider interface
 *
 * @public API
 */
export class ProviderRegistry {
  private readonly container: interfaces.Container;
  private readonly providers: Map<
    new (...args: Array<unknown>) => unknown,
    ProviderInfo
  > = new Map();
  private discovered: boolean = false;

  // Caches for filtered queries (invalidated on discover)
  private cacheByScope: Map<string, Array<ProviderInfo>> = new Map();
  private cacheByCapability: Map<
    keyof ProviderCapabilities,
    Array<ProviderInfo>
  > = new Map();
  private cacheBySource: Map<ProviderSource, Array<ProviderInfo>> = new Map();

  constructor(container: interfaces.Container) {
    this.container = container;
  }

  /**
   * Invalidate all caches. Called when providers are discovered or modified.
   * @private
   */
  private invalidateCaches(): void {
    this.cacheByScope.clear();
    this.cacheByCapability.clear();
    this.cacheBySource.clear();
  }

  /**
   * Discover all providers from metadata.
   * Call this after the container is fully initialized.
   */
  public discover(): void {
    if (this.discovered) {
      return;
    }

    // Invalidate caches before discovery
    this.invalidateCaches();

    const provideMetadata =
      Reflect.getMetadata(METADATA_KEY.provide, Reflect) || [];

    for (const metadata of provideMetadata) {
      const target = metadata.implementationType;

      if (!target || !target.prototype) {
        continue;
      }

      const capabilities = this.detectCapabilities(target);
      const providerInstance = this.tryGetInstance(target);
      const providerMeta = this.getProviderMetadata(target, providerInstance);
      const decoratorMeta = this.getDecoratorMetadata(target);

      const info: ProviderInfo = {
        name: decoratorMeta.name || providerMeta.name || target.name,
        target,
        scope: this.detectScope(target),
        capabilities,
        version: decoratorMeta.version || providerMeta.version,
        description: decoratorMeta.description || providerMeta.description,
        source: this.detectSource(target),
        author: decoratorMeta.author || providerMeta.author,
        repo: decoratorMeta.repo || providerMeta.repo,
        dependencies: decoratorMeta.dependencies,
        priority: decoratorMeta.priority ?? 0,
      };

      this.providers.set(target, info);
    }

    this.discovered = true;
  }

  /**
   * Detect provider capabilities from prototype.
   * @private
   */
  private detectCapabilities(
    target: new (...args: Array<unknown>) => unknown,
  ): ProviderCapabilities {
    const proto = target.prototype;

    return {
      hasBootstrap: typeof proto.bootstrap === "function",
      hasShutdown: typeof proto.shutdown === "function",
      hasHealthCheck: typeof proto.healthCheck === "function",
      hasMetrics: typeof proto.getMetrics === "function",
      hasConfigurable: typeof proto.configure === "function",
    };
  }

  /**
   * Detect the scope of a provider from metadata.
   * Uses metadata stored by decorators instead of accessing container internals.
   * @private
   */
  private detectScope(
    target: new (...args: Array<unknown>) => unknown,
  ): "Singleton" | "Request" | "Transient" | string {
    // First, try to get scope from our decorator metadata
    const scopeFromMeta = Reflect.getMetadata(METADATA_KEY.scope, target);
    if (scopeFromMeta) {
      return scopeFromMeta;
    }

    // Fallback: try to get from decorator options metadata
    const providerMeta: ProviderOptions | undefined = Reflect.getMetadata(
      METADATA_KEY.providerMeta,
      target,
    );
    if (providerMeta?.scope) {
      return providerMeta.scope;
    }

    // Default to Request scope
    return BindingScopeEnum.Request;
  }

  /**
   * Detect the source of a provider from metadata.
   * @private
   */
  private detectSource(
    target: new (...args: Array<unknown>) => unknown,
  ): ProviderSource {
    // Get source from our decorator metadata
    const sourceFromMeta = Reflect.getMetadata(METADATA_KEY.source, target);
    if (sourceFromMeta) {
      return sourceFromMeta as ProviderSource;
    }

    // Fallback: try to get from decorator options metadata
    const providerMeta: ProviderOptions | undefined = Reflect.getMetadata(
      METADATA_KEY.providerMeta,
      target,
    );
    if (providerMeta?.source) {
      return providerMeta.source;
    }

    // Default to user source
    return "user";
  }

  /**
   * Get decorator metadata (from @Provider decorator).
   * @private
   */
  private getDecoratorMetadata(
    target: new (...args: Array<unknown>) => unknown,
  ): Partial<ProviderOptions> {
    const providerMeta: ProviderOptions | undefined = Reflect.getMetadata(
      METADATA_KEY.providerMeta,
      target,
    );
    return providerMeta || {};
  }

  /**
   * Try to get an instance of a singleton provider.
   * @private
   */
  private tryGetInstance(
    target: new (...args: Array<unknown>) => unknown,
  ): unknown | null {
    try {
      if (this.container.isBound(target)) {
        return this.container.get(target);
      }
    } catch {
      // Ignore resolution errors
    }
    return null;
  }

  /**
   * Get provider metadata (name, version, description) from instance if it implements IProvider.
   * @private
   */
  private getProviderMetadata(
    target: new (...args: Array<unknown>) => unknown,
    instance: unknown | null,
  ): Partial<IProvider> & { name?: string } {
    // Try to get from instance if it implements IProvider
    if (instance && typeof instance === "object") {
      const provider = instance as Partial<IProvider>;
      if (provider.name) {
        return {
          name: provider.name,
          version: provider.version,
          description: provider.description,
          author: provider.author,
          repo: provider.repo,
        };
      }
    }

    // Fall back to class name
    return { name: target.name };
  }

  /**
   * Get all registered providers.
   */
  public getAll(): Array<ProviderInfo> {
    if (!this.discovered) {
      this.discover();
    }
    return Array.from(this.providers.values());
  }

  /**
   * Get providers by scope (cached).
   * @param scope - The binding scope to filter by
   */
  public getByScope(scope: string): Array<ProviderInfo> {
    // Check cache first
    if (this.cacheByScope.has(scope)) {
      return this.cacheByScope.get(scope)!;
    }

    // Compute and cache
    const result = this.getAll().filter((p) => p.scope === scope);
    this.cacheByScope.set(scope, result);
    return result;
  }

  /**
   * Get providers by source (cached).
   * @param source - The provider source to filter by
   */
  public getBySource(source: ProviderSource): Array<ProviderInfo> {
    // Check cache first
    if (this.cacheBySource.has(source)) {
      return this.cacheBySource.get(source)!;
    }

    // Compute and cache
    const result = this.getAll().filter((p) => p.source === source);
    this.cacheBySource.set(source, result);
    return result;
  }

  /**
   * Get all built-in providers.
   */
  public getBuiltinProviders(): Array<ProviderInfo> {
    return this.getBySource("builtin");
  }

  /**
   * Get all user-defined providers.
   */
  public getUserProviders(): Array<ProviderInfo> {
    return this.getBySource("user");
  }

  /**
   * Get all external providers (plugins).
   */
  public getExternalProviders(): Array<ProviderInfo> {
    return this.getBySource("external");
  }

  /**
   * Get providers with a specific capability (cached).
   * @param capability - The capability to filter by
   */
  public getWithCapability(
    capability: keyof ProviderCapabilities,
  ): Array<ProviderInfo> {
    // Check cache first
    if (this.cacheByCapability.has(capability)) {
      return this.cacheByCapability.get(capability)!;
    }

    // Compute and cache
    const result = this.getAll().filter((p) => p.capabilities[capability]);
    this.cacheByCapability.set(capability, result);
    return result;
  }

  /**
   * Get total provider count.
   */
  public getCount(): number {
    if (!this.discovered) {
      this.discover();
    }
    return this.providers.size;
  }

  /**
   * Get providers that have lifecycle hooks.
   */
  public getLifecycleProviders(): Array<ProviderInfo> {
    return this.getAll().filter(
      (p) => p.capabilities.hasBootstrap || p.capabilities.hasShutdown,
    );
  }

  /**
   * Get providers that have health checks.
   */
  public getHealthCheckProviders(): Array<ProviderInfo> {
    return this.getWithCapability("hasHealthCheck");
  }

  /**
   * Get providers that expose metrics.
   */
  public getMetricsProviders(): Array<ProviderInfo> {
    return this.getWithCapability("hasMetrics");
  }

  /**
   * Run health checks on all IHealthCheck providers in parallel.
   * @returns Health dashboard with all results
   */
  public async checkHealth(): Promise<HealthDashboard> {
    const healthProviders = this.getHealthCheckProviders();

    // Run all health checks in parallel for better performance
    const healthCheckPromises = healthProviders.map(
      async (
        providerInfo,
      ): Promise<{ name: string; result: HealthCheckResult } | null> => {
        try {
          const instance = this.container.get(providerInfo.target);
          if (isHealthCheck(instance)) {
            const result = await Promise.resolve(instance.healthCheck());
            result.checkedAt = Date.now();
            return { name: providerInfo.name, result };
          }
        } catch (error) {
          return {
            name: providerInfo.name,
            result: {
              status: "unhealthy",
              message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
              checkedAt: Date.now(),
            },
          };
        }
        return null;
      },
    );

    // Wait for all health checks to complete
    const settledResults = await Promise.all(healthCheckPromises);

    // Filter out null results
    const results = settledResults.filter(
      (r): r is { name: string; result: HealthCheckResult } => r !== null,
    );

    // Determine overall status (worst of all)
    let overall: "healthy" | "degraded" | "unhealthy" = "healthy";
    for (const { result } of results) {
      if (result.status === "unhealthy") {
        overall = "unhealthy";
        break;
      }
      if (result.status === "degraded") {
        overall = "degraded";
      }
    }

    return {
      overall,
      providers: results,
      checkedAt: Date.now(),
    };
  }

  /**
   * Collect metrics from all IMetrics providers.
   * @returns Metrics dashboard with all metrics
   */
  public collectMetrics(): MetricsDashboard {
    const metricsProviders = this.getMetricsProviders();
    const metricsMap: Record<string, ProviderMetrics> = {};

    for (const providerInfo of metricsProviders) {
      try {
        const instance = this.container.get(providerInfo.target);
        if (isMetrics(instance)) {
          metricsMap[providerInfo.name] = instance.getMetrics();
        }
      } catch {
        // Skip providers that can't be resolved
      }
    }

    return {
      providers: metricsMap,
      collectedAt: Date.now(),
    };
  }

  /**
   * Get a formatted view of the provider registry for banner display.
   * @param maxDisplay - Maximum number of providers to show
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
    const all = this.getAll();
    const entries = all.slice(0, maxDisplay).map((p) => ({
      name: p.name,
      scope: p.scope,
      source: p.source,
      hasLifecycle: p.capabilities.hasBootstrap || p.capabilities.hasShutdown,
      hasHealthCheck: p.capabilities.hasHealthCheck,
      hasMetrics: p.capabilities.hasMetrics,
    }));

    return {
      entries,
      total: all.length,
      remaining: Math.max(0, all.length - maxDisplay),
      bySource: {
        builtin: this.getBuiltinProviders().length,
        user: this.getUserProviders().length,
        external: this.getExternalProviders().length,
      },
    };
  }
}
