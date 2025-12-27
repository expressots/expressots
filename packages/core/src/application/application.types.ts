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
