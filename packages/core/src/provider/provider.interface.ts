/**
 * Provider Interfaces for ExpressoTS
 *
 * These interfaces enable building rich, self-describing providers with
 * optional capabilities like health checks, metrics, and configuration.
 *
 * @module provider
 */

/**
 * Base provider interface with metadata.
 *
 * @layer public
 * @audience application-developers
 * @concept provider-base
 * @difficulty beginner
 *
 * @summary Quick Start
 * Implement this interface to provide descriptive information about your provider.
 *
 * @example
 * ```typescript
 * @provideSingleton(DatabaseProvider)
 * export class DatabaseProvider implements IProvider {
 *   readonly name = "Database Provider";
 *   readonly version = "1.0.0";
 *   readonly description = "PostgreSQL connection manager";
 *   readonly author = "ExpressoTS Team";
 *   readonly repo = "https://github.com/expressots/expressots";
 * }
 * ```
 *
 * **Metadata Fields:**
 * - `name`: Display name for the provider
 * - `version`: Semantic version (optional)
 * - `description`: Brief description (optional)
 * - `author`: Author name or organization (optional)
 * - `repo`: Repository URL (optional)
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Behavior**
 * - Metadata is used by ProviderRegistry for introspection
 * - Displayed in application banner and Studio
 * - Used for health checks and metrics collection
 *
 * @see {@link ProviderRegistry} for provider discovery
 * @see {@link IHealthCheck} for health check capability
 * @see {@link IMetrics} for metrics capability
 *
 * @public API
 */
export interface IProvider {
  /** Provider display name */
  readonly name: string;

  /** Semantic version (optional) */
  readonly version?: string;

  /** Brief description of what this provider does (optional) */
  readonly description?: string;

  /** Author name or organization (optional) */
  readonly author?: string;

  /** Repository URL (optional) */
  readonly repo?: string;
}

/**
 * Health check result returned by providers implementing IHealthCheck.
 * @public API
 */
export interface HealthCheckResult {
  /** Overall health status */
  status: "healthy" | "degraded" | "unhealthy";

  /** Optional latency in milliseconds */
  latency?: number;

  /** Optional message describing the status */
  message?: string;

  /** Additional details (shown in Studio/banner) */
  details?: Record<string, unknown>;

  /** Timestamp when the check was performed */
  checkedAt?: number;
}

/**
 * Health check interface for providers.
 *
 * @layer public
 * @audience application-developers
 * @concept provider-health-check
 * @difficulty intermediate
 *
 * @summary Quick Start
 * Implement this interface to enable health checks for your provider.
 *
 * @example
 * ```typescript
 * @provideSingleton(CacheProvider)
 * export class CacheProvider implements IHealthCheck {
 *   async healthCheck(): Promise<HealthCheckResult> {
 *     const pingStart = Date.now();
 *     const isAlive = await this.redis.ping();
 *     return {
 *       status: isAlive ? 'healthy' : 'unhealthy',
 *       latency: Date.now() - pingStart,
 *       details: { connections: this.redis.status.connected }
 *     };
 *   }
 * }
 * ```
 *
 * **Health Status:**
 * - `healthy`: Provider is operating normally
 * - `degraded`: Provider is functioning but with reduced performance
 * - `unhealthy`: Provider is not functioning correctly
 *
 * **Auto-Discovery:**
 * Providers implementing `IHealthCheck` are automatically discovered
 * and included in health check endpoints and dashboards.
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Behavior**
 * - Detected by ProviderRegistry during discovery
 * - Health checks executed in parallel for performance
 * - Results aggregated in HealthDashboard
 *
 * @see {@link ProviderRegistry.getHealthDashboard} for aggregated health checks
 * @see {@link HealthCheckResult} for result structure
 *
 * @public API
 */
export interface IHealthCheck {
  /**
   * Perform a health check on this provider.
   * @returns Health check result or Promise of result
   */
  healthCheck(): HealthCheckResult | Promise<HealthCheckResult>;
}

/**
 * Type guard to check if an object implements IHealthCheck
 * @param obj - The object to check
 * @returns true if the object implements IHealthCheck
 * @internal
 */
export function isHealthCheck(obj: unknown): obj is IHealthCheck {
  return (
    obj !== null &&
    typeof obj === "object" &&
    "healthCheck" in obj &&
    typeof (obj as IHealthCheck).healthCheck === "function"
  );
}

/**
 * Metrics type - key-value pairs of metric data.
 * @public API
 */
export type ProviderMetrics = Record<string, number | string | boolean>;

/**
 * Metrics interface for providers.
 *
 * @layer public
 * @audience application-developers
 * @concept provider-metrics
 * @difficulty intermediate
 *
 * @summary Quick Start
 * Implement this interface to expose metrics from your provider.
 *
 * @example
 * ```typescript
 * @provideSingleton(ConnectionPoolProvider)
 * export class ConnectionPoolProvider implements IMetrics {
 *   getMetrics(): ProviderMetrics {
 *     return {
 *       'pool.active': this.pool.activeConnections,
 *       'pool.idle': this.pool.idleConnections,
 *       'queries.total': this.stats.totalQueries
 *     };
 *   }
 * }
 * ```
 *
 * **Metrics Format:**
 * - Key-value pairs of metric data
 * - Values can be numbers, strings, or booleans
 * - Automatically collected and displayed in banner/Studio
 *
 * **Auto-Discovery:**
 * Providers implementing `IMetrics` are automatically discovered
 * and metrics are collected for dashboards.
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Behavior**
 * - Detected by ProviderRegistry during discovery
 * - Metrics collected on-demand
 * - Aggregated in MetricsDashboard
 *
 * @see {@link ProviderRegistry.getMetricsDashboard} for aggregated metrics
 * @see {@link ProviderMetrics} for metrics type
 *
 * @public API
 */
export interface IMetrics {
  /**
   * Get current metrics for this provider.
   * @returns Key-value pairs of metric data
   */
  getMetrics(): ProviderMetrics;
}

/**
 * Type guard to check if an object implements IMetrics
 * @param obj - The object to check
 * @returns true if the object implements IMetrics
 * @internal
 */
export function isMetrics(obj: unknown): obj is IMetrics {
  return (
    obj !== null &&
    typeof obj === "object" &&
    "getMetrics" in obj &&
    typeof (obj as IMetrics).getMetrics === "function"
  );
}

/**
 * Configuration validation result.
 * @public API
 */
export interface ConfigurationResult {
  /** Whether the configuration is valid */
  valid: boolean;

  /** Validation errors (if any) */
  errors?: Array<string>;

  /** Validation warnings (if any) */
  warnings?: Array<string>;
}

/**
 * Implement for providers that require configuration validation.
 * Called before bootstrap to ensure configuration is valid.
 *
 * @example
 * ```typescript
 * @provideSingleton(EmailProvider)
 * export class EmailProvider implements IConfigurable<EmailConfig> {
 *   configure(config: EmailConfig): ConfigurationResult {
 *     if (!config.smtpHost) {
 *       return { valid: false, errors: ['SMTP host is required'] };
 *     }
 *     this.config = config;
 *     return { valid: true };
 *   }
 * }
 * ```
 * @public API
 */
export interface IConfigurable<TConfig = unknown> {
  /**
   * Configure this provider with the given configuration.
   * @param config - Configuration object
   * @returns Configuration validation result
   */
  configure(config: TConfig): ConfigurationResult;
}

/**
 * Type guard to check if an object implements IConfigurable
 * @param obj - The object to check
 * @returns true if the object implements IConfigurable
 * @internal
 */
export function isConfigurable(obj: unknown): obj is IConfigurable {
  return (
    obj !== null &&
    typeof obj === "object" &&
    "configure" in obj &&
    typeof (obj as IConfigurable).configure === "function"
  );
}

/**
 * Provider capability flags.
 * @public API
 */
export interface ProviderCapabilities {
  /** Has bootstrap() method */
  hasBootstrap: boolean;

  /** Has shutdown() method */
  hasShutdown: boolean;

  /** Has healthCheck() method */
  hasHealthCheck: boolean;

  /** Has getMetrics() method */
  hasMetrics: boolean;

  /** Has configure() method */
  hasConfigurable: boolean;
}

/**
 * Provider source types indicating where the provider originated from.
 * - builtin: Core framework providers (Logger, InMemoryDB, etc.)
 * - user: User-defined providers in application code
 * - external: Third-party package providers (plugins)
 * @public API
 */
export type ProviderSource = "builtin" | "user" | "external";

/**
 * Provider information with metadata and capabilities.
 * @public API
 */
export interface ProviderInfo {
  /** Provider name (from IProvider.name or class name) */
  name: string;

  /** Provider class constructor */
  target: new (...args: Array<unknown>) => unknown;

  /** Binding scope */
  scope: "Singleton" | "Request" | "Transient" | string;

  /** Provider capabilities */
  capabilities: ProviderCapabilities;

  /** Provider version (if IProvider) */
  version?: string;

  /** Provider description (if IProvider) */
  description?: string;

  /**
   * Provider source indicating where it originated from.
   * - builtin: Core framework providers
   * - user: User-defined providers in application code
   * - external: Third-party package providers (plugins)
   */
  source: ProviderSource;

  /** Author name or organization (optional) */
  author?: string;

  /** Repository URL (optional) */
  repo?: string;

  /** Dependencies on other providers (for load ordering) */
  dependencies?: Array<string>;

  /** Load priority (higher = later, default: 0) */
  priority?: number;
}

/**
 * Health dashboard aggregating all provider health checks.
 * @public API
 */
export interface HealthDashboard {
  /** Overall health status (worst of all providers) */
  overall: "healthy" | "degraded" | "unhealthy";

  /** Individual provider health results */
  providers: Array<{
    name: string;
    result: HealthCheckResult;
  }>;

  /** Timestamp when checks were performed */
  checkedAt: number;
}

/**
 * Metrics dashboard aggregating all provider metrics.
 * @public API
 */
export interface MetricsDashboard {
  /** Metrics by provider name */
  providers: Record<string, ProviderMetrics>;

  /** Timestamp when metrics were collected */
  collectedAt: number;
}
