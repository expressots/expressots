/**
 * Enhanced Configuration System - Interfaces
 *
 * @module config
 *
 * Type-safe configuration with:
 * - Full TypeScript inference
 * - Multi-environment support
 * - Secret management
 * - Helpful validation errors
 * - Zero-config defaults
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Supported configuration value types.
 * @public API
 */
export type ConfigValueType =
  | "string"
  | "number"
  | "boolean"
  | "enum"
  | "url"
  | "port"
  | "secret"
  | "json"
  | "array";

/**
 * Environment names for multi-environment defaults.
 * @public API
 */
export type ConfigEnvironment =
  | "development"
  | "staging"
  | "production"
  | "test"
  | string;

/**
 * Log levels for configuration system.
 */
export type ConfigLogLevel = "debug" | "info" | "warn" | "error" | "none";

// ============================================================================
// Field Options
// ============================================================================

/**
 * Base options for all configuration fields.
 * @public API
 */
export interface BaseFieldOptions<T> {
  /**
   * Default value if environment variable is not set.
   */
  default?: T;

  /**
   * Environment-specific defaults.
   * @example
   * ```typescript
   * Env.string("DB_HOST", {
   *   development: "localhost",
   *   production: "prod-db.example.com"
   * })
   * ```
   */
  development?: T;
  staging?: T;
  production?: T;
  test?: T;

  /**
   * Whether this field is required.
   * @default false
   */
  required?: boolean;

  /**
   * Human-readable description for documentation.
   */
  description?: string;

  /**
   * Example value for error messages and documentation.
   */
  example?: T;

  /**
   * Custom error message when validation fails.
   */
  errorMessage?: string;

  /**
   * Hint shown when validation fails.
   */
  hint?: string;

  /**
   * Documentation URL for this field.
   */
  docUrl?: string;

  /**
   * Deprecated - show warning when used.
   */
  deprecated?: string | boolean;

  /**
   * Transform function applied after parsing.
   */
  transform?: (value: T) => T;
}

/**
 * Options for string configuration fields.
 * @public API
 */
export interface StringFieldOptions extends BaseFieldOptions<string> {
  /**
   * Minimum string length.
   */
  minLength?: number;

  /**
   * Maximum string length.
   */
  maxLength?: number;

  /**
   * Regex pattern to match.
   */
  pattern?: RegExp;

  /**
   * Predefined format validation.
   */
  format?:
    | "email"
    | "url"
    | "uuid"
    | "alphanumeric"
    | "hostname"
    | "ip"
    | "ipv4"
    | "ipv6";

  /**
   * Trim whitespace from value.
   * @default true
   */
  trim?: boolean;

  /**
   * Convert to lowercase.
   */
  lowercase?: boolean;

  /**
   * Convert to uppercase.
   */
  uppercase?: boolean;
}

/**
 * Options for number configuration fields.
 * @public API
 */
export interface NumberFieldOptions extends BaseFieldOptions<number> {
  /**
   * Minimum value.
   */
  min?: number;

  /**
   * Maximum value.
   */
  max?: number;

  /**
   * Must be an integer.
   * @default false
   */
  integer?: boolean;

  /**
   * Must be positive.
   */
  positive?: boolean;
}

/**
 * Options for boolean configuration fields.
 * @public API
 */
export interface BooleanFieldOptions extends BaseFieldOptions<boolean> {
  /**
   * Additional strings to treat as true.
   * Default: "true", "1", "yes", "on"
   */
  trueValues?: Array<string>;

  /**
   * Additional strings to treat as false.
   * Default: "false", "0", "no", "off"
   */
  falseValues?: Array<string>;
}

/**
 * Options for enum configuration fields.
 * @public API
 */
export interface EnumFieldOptions<T extends string>
  extends BaseFieldOptions<T> {
  /**
   * Allowed values for this enum.
   */
  values: ReadonlyArray<T>;

  /**
   * Case-insensitive matching.
   * @default false
   */
  caseInsensitive?: boolean;
}

/**
 * Options for URL configuration fields.
 * @public API
 */
export interface UrlFieldOptions extends BaseFieldOptions<string> {
  /**
   * Allowed protocols.
   * @default ["http", "https"]
   */
  protocols?: Array<string>;

  /**
   * Require trailing slash.
   */
  trailingSlash?: boolean;

  /**
   * Remove trailing slash.
   */
  noTrailingSlash?: boolean;
}

/**
 * Options for port configuration fields.
 * @public API
 */
export interface PortFieldOptions extends BaseFieldOptions<number> {
  /**
   * Minimum port number.
   * @default 1
   */
  min?: number;

  /**
   * Maximum port number.
   * @default 65535
   */
  max?: number;

  /**
   * Disallow privileged ports (< 1024).
   * @default false
   */
  noPrivileged?: boolean;
}

/**
 * Options for secret configuration fields.
 * UNIQUE: Auto-redacted in logs, partial reveal in dev mode.
 *
 * @public API
 */
export interface SecretFieldOptions extends BaseFieldOptions<string> {
  /**
   * Minimum length for secrets.
   */
  minLength?: number;

  /**
   * Characters to reveal at start (for debugging).
   * @default 0
   */
  revealStart?: number;

  /**
   * Characters to reveal at end (for debugging).
   * @default 4
   */
  revealEnd?: number;

  /**
   * Allow partial reveal in development mode.
   * @default true
   */
  allowPartialReveal?: boolean;
}

/**
 * Options for JSON configuration fields.
 * @public API
 */
export interface JsonFieldOptions<T> extends BaseFieldOptions<T> {
  /**
   * Custom validator function.
   */
  validate?: (value: T) => boolean | string;
}

/**
 * Options for array configuration fields.
 * @public API
 */
export interface ArrayFieldOptions<T> extends BaseFieldOptions<Array<T>> {
  /**
   * Delimiter for parsing string to array.
   * @default ","
   */
  delimiter?: string;

  /**
   * Minimum array length.
   */
  minLength?: number;

  /**
   * Maximum array length.
   */
  maxLength?: number;

  /**
   * Type of array elements.
   */
  itemType?: "string" | "number";

  /**
   * Remove duplicates.
   * @default false
   */
  unique?: boolean;
}

// ============================================================================
// Config Field (Internal)
// ============================================================================

/**
 * Internal representation of a configuration field.
 * @internal
 */
export interface ConfigField<T = unknown, IsSecret extends boolean = boolean> {
  /**
   * Environment variable name.
   */
  envVar: string;

  /**
   * Field type.
   */
  type: ConfigValueType;

  /**
   * Configuration options.
   */
  options: BaseFieldOptions<T>;

  /**
   * Resolved value.
   */
  value?: T;

  /**
   * Is this a secret field.
   */
  isSecret: IsSecret;

  /**
   * Validation errors.
   */
  errors: Array<ConfigValidationError>;
}

/**
 * Specialized type for secret fields.
 * @internal
 */
export type SecretConfigField = ConfigField<string, true>;

// ============================================================================
// Validation & Errors
// ============================================================================

/**
 * Configuration validation error.
 * @public API
 */
export interface ConfigValidationError {
  /**
   * Environment variable name.
   */
  envVar: string;

  /**
   * Path in config schema.
   */
  path: string;

  /**
   * Error code.
   */
  code:
    | "MISSING"
    | "INVALID_TYPE"
    | "INVALID_FORMAT"
    | "OUT_OF_RANGE"
    | "PATTERN_MISMATCH"
    | "INVALID_ENUM"
    | "CUSTOM";

  /**
   * Error message.
   */
  message: string;

  /**
   * What was expected.
   */
  expected: string;

  /**
   * What was received (redacted for secrets).
   */
  received?: string;

  /**
   * Example of valid value.
   */
  example?: string;

  /**
   * Hint for fixing.
   */
  hint?: string;
}

/**
 * Result of configuration validation.
 * @public API
 */
export interface ConfigValidationResult {
  /**
   * Whether all configuration is valid.
   */
  valid: boolean;

  /**
   * Validation errors.
   */
  errors: Array<ConfigValidationError>;

  /**
   * Warnings (deprecated fields, etc.).
   */
  warnings: Array<string>;

  /**
   * Statistics.
   */
  stats: {
    totalFields: number;
    validFields: number;
    invalidFields: number;
    secretFields: number;
    deprecatedFields: number;
  };
}

// ============================================================================
// Config Schema
// ============================================================================

/**
 * Type-safe config schema value.
 * Can be a ConfigField or nested object.
 *
 * @public API
 */
export type ConfigSchemaValue =
  | ConfigField
  | { [key: string]: ConfigSchemaValue };

/**
 * Configuration schema definition.
 * @public API
 */
export interface ConfigSchema {
  [key: string]: ConfigSchemaValue;
}

// ============================================================================
// Config Options
// ============================================================================

/**
 * Options for defineConfig().
 * @public API
 */
export interface DefineConfigOptions {
  /**
   * Validate on first access.
   * @default true
   */
  validateOnAccess?: boolean;

  /**
   * Throw on validation error.
   * @default true in production, false in development
   */
  throwOnError?: boolean;

  /**
   * Log validation results.
   * @default "info"
   */
  logLevel?: ConfigLogLevel;

  /**
   * Watch .env file for changes.
   * @default false
   */
  watchForChanges?: boolean;

  /**
   * Callback when config changes.
   */
  onConfigChange?: (changes: ConfigChangeEvent) => void;

  /**
   * Environment variable prefix to strip.
   * @example "APP_" strips APP_DATABASE_HOST to DATABASE_HOST
   */
  envPrefix?: string;

  /**
   * Custom environment resolver.
   */
  getEnv?: (key: string) => string | undefined;

  /**
   * Documentation base URL for error links.
   */
  documentationUrl?: string;
}

/**
 * Event emitted when configuration changes.
 * @public API
 */
export interface ConfigChangeEvent {
  /**
   * Fields that changed.
   */
  changes: Array<{
    path: string;
    envVar: string;
    oldValue: unknown;
    newValue: unknown;
  }>;

  /**
   * Timestamp of change.
   */
  timestamp: Date;
}

// ============================================================================
// Secret Value Wrapper
// ============================================================================

/**
 * Wrapper for secret values that prevents accidental logging.
 *
 * UNIQUE: Secrets are auto-redacted but can be revealed in dev mode.
 *
 * @public API
 */
export interface SecretValue {
  /**
   * Get the secret value.
   * Use this to access the actual secret.
   */
  readonly value: string;

  /**
   * Get redacted representation for logging.
   * Shows "[REDACTED]" or partial value in dev mode.
   */
  toString(): string;

  /**
   * Get redacted representation for JSON serialization.
   * Always returns "[REDACTED]" regardless of environment.
   */
  toJSON(): string;

  /**
   * Get partial reveal for debugging.
   * Only works in development mode.
   *
   * @example
   * ```typescript
   * secret.reveal() // "sk_l...abcd"
   * ```
   */
  reveal(): string;

  /**
   * Check if value matches without revealing.
   */
  equals(other: string): boolean;

  /**
   * Check if secret is set (non-empty).
   */
  readonly isSet: boolean;

  /**
   * Length of secret (useful for validation display).
   */
  readonly length: number;
}

// ============================================================================
// Resolved Config Type
// ============================================================================

/**
 * Type helper to extract the value type from a ConfigField.
 */
type ExtractFieldValue<T> =
  T extends ConfigField<infer V, infer S>
    ? S extends true
      ? SecretValue
      : V
    : T extends Record<string, unknown>
      ? { [K in keyof T]: ExtractFieldValue<T[K]> }
      : T;

/**
 * Type helper to resolve config schema to actual values.
 *
 * UNIQUE: Full TypeScript inference - no type casting needed!
 *
 * @public API
 */
export type ResolvedConfig<T> = ExtractFieldValue<T>;

// ============================================================================
// Config Instance
// ============================================================================

/**
 * Configuration instance with validation and utilities.
 * @public API
 */
export interface IConfigInstance<T> {
  /**
   * Get the resolved configuration values.
   * Fully typed based on schema.
   */
  readonly values: ResolvedConfig<T>;

  /**
   * Validate configuration and get result.
   */
  validate(): ConfigValidationResult;

  /**
   * Check if configuration is valid.
   */
  isValid(): boolean;

  /**
   * Get validation errors.
   */
  getErrors(): Array<ConfigValidationError>;

  /**
   * Get a specific config value by path.
   * @param path - Dot-notation path (e.g., "database.host")
   */
  get<V = unknown>(path: string): V;

  /**
   * Check if a config value is set.
   * @param path - Dot-notation path
   */
  has(path: string): boolean;

  /**
   * Get all config as plain object (secrets redacted).
   */
  toObject(): Record<string, unknown>;

  /**
   * Get config as JSON string (secrets redacted).
   */
  toJSON(): string;

  /**
   * Reload configuration from environment.
   */
  reload(): void;

  /**
   * Get list of all environment variables used.
   */
  getEnvVars(): Array<string>;

  /**
   * Generate documentation for this configuration.
   */
  generateDocs(format?: "markdown" | "json"): string;
}
