/**
 * Enum representing possible server environments.
 *
 * @layer public
 * @audience application-developers
 * @concept configuration
 * @difficulty beginner
 *
 * @summary
 * Predefined server environment values for type-safe environment configuration.
 *
 * @example
 * ```typescript
 * if (process.env.NODE_ENV === ServerEnvironment.Development) {
 *   // Development-specific code
 * }
 *
 * if (process.env.NODE_ENV === ServerEnvironment.Production) {
 *   // Production-specific code
 * }
 * ```
 *
 * @note
 * For more flexible environment names, use `EnvironmentName` type from `bootstrap()`.
 * This enum provides type-safe constants for common environments.
 *
 * @public API
 */
export enum ServerEnvironment {
  /**
   * Development environment.
   * Typically used for local development with debugging enabled.
   */
  Development = "development",

  /**
   * Production environment.
   * Typically used for deployed applications with optimizations enabled.
   */
  Production = "production",
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTAINER INTROSPECTION TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Represents detailed information about a single container binding.
 *
 * @layer public
 * @audience application-developers, studio
 * @concept introspection
 *
 * @summary
 * Provides structured data about a service binding in the DI container.
 * Used for debugging, analysis, and ExpressoTS Studio integration.
 *
 * @public API
 */
export interface BindingInfo {
  /**
   * The service identifier (class name, symbol, or string token).
   */
  serviceIdentifier: string;

  /**
   * The binding scope: "Request", "Singleton", "Transient", or custom scope.
   */
  scope: string;

  /**
   * The binding type: "Constructor", "ConstantValue", "DynamicValue", etc.
   */
  type: string;

  /**
   * Whether the binding has a cached instance.
   */
  cached: boolean;

  /**
   * The module ID this binding belongs to (if applicable).
   */
  moduleId?: number;

  /**
   * Whether the binding has been activated (resolved at least once).
   */
  activated: boolean;
}

/**
 * Summary statistics for container bindings.
 *
 * @layer public
 * @audience application-developers, studio
 * @concept introspection
 *
 * @summary
 * Provides aggregate statistics about bindings in the DI container.
 *
 * @public API
 */
export interface BindingsSummary {
  /**
   * Total number of bindings in the container.
   */
  total: number;

  /**
   * Count of bindings grouped by scope.
   * Example: { "Singleton": 5, "Request": 10 }
   */
  byScope: Record<string, number>;

  /**
   * Count of bindings grouped by type.
   * Example: { "Constructor": 12, "ConstantValue": 3 }
   */
  byType: Record<string, number>;

  /**
   * Number of bindings with cached instances.
   */
  cached: number;

  /**
   * Number of bindings that have been activated.
   */
  activated: number;
}

/**
 * Filter options for querying container bindings.
 *
 * @layer public
 * @audience application-developers
 * @concept introspection
 *
 * @public API
 */
export interface BindingsFilterOptions {
  /**
   * Filter by binding scope.
   */
  scope?: string;

  /**
   * Filter by binding type.
   */
  type?: string;

  /**
   * Filter by cached status.
   */
  cached?: boolean;

  /**
   * Filter by activated status.
   */
  activated?: boolean;

  /**
   * Filter by service identifier (partial match).
   */
  identifier?: string;
}

/**
 * Complete container introspection data.
 *
 * @layer public
 * @audience application-developers, studio
 * @concept introspection
 *
 * @summary
 * Provides complete container state for ExpressoTS Studio and programmatic analysis.
 * This is the primary interface for external tools to consume container information.
 *
 * @public API
 */
export interface ContainerIntrospection {
  /**
   * List of all bindings with detailed information.
   */
  bindings: Array<BindingInfo>;

  /**
   * Summary statistics about the bindings.
   */
  summary: BindingsSummary;

  /**
   * Container configuration options.
   */
  options: {
    defaultScope?: string;
    autoBindInjectable?: boolean;
    skipBaseClassChecks?: boolean;
  };

  /**
   * Timestamp when the introspection was taken.
   */
  timestamp: string;

  /**
   * Container ID.
   */
  containerId: number;
}
