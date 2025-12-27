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
  isHealthCheck,
  isMetrics,
} from "./provider.interface";

/**
 * Registry for auto-discovering and managing providers.
 * Enables health checks, metrics collection, and introspection.
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

  constructor(container: interfaces.Container) {
    this.container = container;
  }

  /**
   * Discover all providers from metadata.
   * Call this after the container is fully initialized.
   */
  public discover(): void {
    if (this.discovered) {
      return;
    }

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

      const info: ProviderInfo = {
        name: providerMeta.name || target.name,
        target,
        scope: this.detectScope(target),
        capabilities,
        version: providerMeta.version,
        description: providerMeta.description,
      };

      this.providers.set(target, info);
    }

    this.discovered = true;
  }

  /**
   * Detect provider capabilities from prototype.
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
   * Detect the scope of a provider.
   */
  private detectScope(
    target: new (...args: Array<unknown>) => unknown,
  ): "Singleton" | "Request" | "Transient" | string {
    try {
      if (this.container.isBound(target)) {
        // Try to get binding scope from container internals
        const bindings = (
          this.container as unknown as {
            _bindingDictionary: { _map: Map<unknown, Array<unknown>> };
          }
        )._bindingDictionary?._map?.get(target);
        if (bindings && Array.isArray(bindings) && bindings.length > 0) {
          const binding = bindings[0] as { scope?: string };
          if (binding.scope) {
            return binding.scope as "Singleton" | "Request" | "Transient";
          }
        }
      }
    } catch {
      // Ignore errors in scope detection
    }

    // Default to Request scope
    return BindingScopeEnum.Request;
  }

  /**
   * Try to get an instance of a singleton provider.
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
   * Get provider metadata (name, version, description) if available.
   */
  private getProviderMetadata(
    target: new (...args: Array<unknown>) => unknown,
    instance: unknown | null,
  ): { name?: string; version?: string; description?: string } {
    // Try to get from instance if it implements IProvider
    if (instance && typeof instance === "object") {
      const provider = instance as Partial<IProvider>;
      if (provider.name) {
        return {
          name: provider.name,
          version: provider.version,
          description: provider.description,
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
   * Get providers by scope.
   */
  public getByScope(scope: string): Array<ProviderInfo> {
    return this.getAll().filter((p) => p.scope === scope);
  }

  /**
   * Get providers with a specific capability.
   */
  public getWithCapability(
    capability: keyof ProviderCapabilities,
  ): Array<ProviderInfo> {
    return this.getAll().filter((p) => p.capabilities[capability]);
  }

  /**
   * Get total provider count.
   */
  public getCount(): number {
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
    return this.getAll().filter((p) => p.capabilities.hasHealthCheck);
  }

  /**
   * Get providers that expose metrics.
   */
  public getMetricsProviders(): Array<ProviderInfo> {
    return this.getAll().filter((p) => p.capabilities.hasMetrics);
  }

  /**
   * Run health checks on all IHealthCheck providers.
   * @returns Health dashboard with all results
   */
  public async checkHealth(): Promise<HealthDashboard> {
    const healthProviders = this.getHealthCheckProviders();
    const results: Array<{ name: string; result: HealthCheckResult }> = [];

    for (const providerInfo of healthProviders) {
      try {
        const instance = this.container.get(providerInfo.target);
        if (isHealthCheck(instance)) {
          const result = await Promise.resolve(instance.healthCheck());
          result.checkedAt = Date.now();
          results.push({ name: providerInfo.name, result });
        }
      } catch (error) {
        results.push({
          name: providerInfo.name,
          result: {
            status: "unhealthy",
            message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
            checkedAt: Date.now(),
          },
        });
      }
    }

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
      hasLifecycle: boolean;
      hasHealthCheck: boolean;
      hasMetrics: boolean;
    }>;
    total: number;
    remaining: number;
  } {
    const all = this.getAll();
    const entries = all.slice(0, maxDisplay).map((p) => ({
      name: p.name,
      scope: p.scope,
      hasLifecycle: p.capabilities.hasBootstrap || p.capabilities.hasShutdown,
      hasHealthCheck: p.capabilities.hasHealthCheck,
      hasMetrics: p.capabilities.hasMetrics,
    }));

    return {
      entries,
      total: all.length,
      remaining: Math.max(0, all.length - maxDisplay),
    };
  }
}
