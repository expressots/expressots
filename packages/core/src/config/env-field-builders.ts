/**
 * Environment Field Builders
 *
 * @module config
 *
 * Type-safe builders for configuration fields.
 * Each builder creates a ConfigField with proper typing.
 *
 * @example
 * ```typescript
 * // UNIQUE: Full TypeScript inference, no type casting!
 * const config = defineConfig({
 *   port: Env.port("PORT", { default: 3000 }),
 *   dbHost: Env.string("DB_HOST", { default: "localhost" }),
 *   apiKey: Env.secret("API_KEY", { required: true }),
 *   debug: Env.boolean("DEBUG", { default: false }),
 *   logLevel: Env.enum("LOG_LEVEL", ["debug", "info", "warn", "error"]),
 * });
 *
 * // TypeScript knows the exact types!
 * config.values.port     // number
 * config.values.dbHost   // string
 * config.values.apiKey   // SecretValue
 * config.values.debug    // boolean
 * config.values.logLevel // "debug" | "info" | "warn" | "error"
 * ```
 */

import {
  ConfigField,
  SecretConfigField,
  StringFieldOptions,
  NumberFieldOptions,
  BooleanFieldOptions,
  EnumFieldOptions,
  UrlFieldOptions,
  PortFieldOptions,
  SecretFieldOptions,
  JsonFieldOptions,
  ArrayFieldOptions,
} from "./config.interfaces";

// ============================================================================
// Field Builders
// ============================================================================

/**
 * Create a string configuration field.
 *
 * @param envVar - Environment variable name
 * @param options - Field options
 * @returns ConfigField for string value
 *
 * @example
 * ```typescript
 * Env.string("DB_HOST", {
 *   default: "localhost",
 *   description: "Database host address"
 * })
 *
 * // With format validation
 * Env.string("USER_EMAIL", {
 *   format: "email",
 *   required: true
 * })
 * ```
 */
function string(
  envVar: string,
  options: StringFieldOptions = {},
): ConfigField<string, false> {
  return {
    envVar,
    type: "string",
    options: {
      trim: true, // Default to trim
      ...options,
    },
    isSecret: false as const,
    errors: [],
  };
}

/**
 * Create a number configuration field.
 *
 * @param envVar - Environment variable name
 * @param options - Field options
 * @returns ConfigField for number value
 *
 * @example
 * ```typescript
 * Env.number("MAX_CONNECTIONS", {
 *   default: 10,
 *   min: 1,
 *   max: 100
 * })
 *
 * // Integer only
 * Env.number("RETRY_COUNT", {
 *   default: 3,
 *   integer: true,
 *   positive: true
 * })
 * ```
 */
function number(
  envVar: string,
  options: NumberFieldOptions = {},
): ConfigField<number, false> {
  return {
    envVar,
    type: "number",
    options,
    isSecret: false as const,
    errors: [],
  };
}

/**
 * Create a boolean configuration field.
 *
 * Accepts: "true", "1", "yes", "on" as true
 * Accepts: "false", "0", "no", "off" as false
 *
 * @param envVar - Environment variable name
 * @param options - Field options
 * @returns ConfigField for boolean value
 *
 * @example
 * ```typescript
 * Env.boolean("ENABLE_CACHE", { default: true })
 * Env.boolean("DEBUG", { default: false })
 * ```
 */
function boolean(
  envVar: string,
  options: BooleanFieldOptions = {},
): ConfigField<boolean, false> {
  return {
    envVar,
    type: "boolean",
    options: {
      trueValues: ["true", "1", "yes", "on"],
      falseValues: ["false", "0", "no", "off"],
      ...options,
    },
    isSecret: false as const,
    errors: [],
  };
}

/**
 * Create an enum configuration field.
 *
 * UNIQUE: Full TypeScript inference for enum values!
 *
 * @param envVar - Environment variable name
 * @param values - Allowed enum values
 * @param options - Field options
 * @returns ConfigField for enum value
 *
 * @example
 * ```typescript
 * // TypeScript knows this is "debug" | "info" | "warn" | "error"
 * Env.enum("LOG_LEVEL", ["debug", "info", "warn", "error"], {
 *   default: "info"
 * })
 *
 * // Case insensitive matching
 * Env.enum("ENVIRONMENT", ["development", "staging", "production"], {
 *   caseInsensitive: true
 * })
 * ```
 */
function enumField<T extends string>(
  envVar: string,
  values: ReadonlyArray<T>,
  options: Omit<EnumFieldOptions<T>, "values"> = {},
): ConfigField<T, false> {
  return {
    envVar,
    type: "enum",
    options: {
      ...options,
      values,
    } as EnumFieldOptions<T>,
    isSecret: false as const,
    errors: [],
  };
}

/**
 * Create a URL configuration field.
 *
 * @param envVar - Environment variable name
 * @param options - Field options
 * @returns ConfigField for URL string
 *
 * @example
 * ```typescript
 * Env.url("API_BASE_URL", {
 *   required: true,
 *   protocols: ["https"] // Only HTTPS allowed
 * })
 *
 * Env.url("CALLBACK_URL", {
 *   noTrailingSlash: true
 * })
 * ```
 */
function url(envVar: string, options: UrlFieldOptions = {}): ConfigField<string, false> {
  return {
    envVar,
    type: "url",
    options: {
      protocols: ["http", "https"],
      ...options,
    },
    isSecret: false as const,
    errors: [],
  };
}

/**
 * Create a port configuration field.
 *
 * Auto-validates port range (1-65535).
 *
 * @param envVar - Environment variable name
 * @param options - Field options
 * @returns ConfigField for port number
 *
 * @example
 * ```typescript
 * Env.port("PORT", { default: 3000 })
 *
 * // Non-privileged ports only
 * Env.port("APP_PORT", {
 *   default: 8080,
 *   noPrivileged: true // Must be >= 1024
 * })
 * ```
 */
function port(envVar: string, options: PortFieldOptions = {}): ConfigField<number, false> {
  return {
    envVar,
    type: "port",
    options: {
      min: options.noPrivileged ? 1024 : 1,
      max: 65535,
      ...options,
    },
    isSecret: false as const,
    errors: [],
  };
}

/**
 * Create a secret configuration field.
 *
 * UNIQUE: Auto-redacted in logs, partial reveal in dev mode!
 *
 * Secrets:
 * - Never logged in plain text
 * - Show "[REDACTED]" when stringified
 * - Can be partially revealed in development
 * - Integrate with Logger's Redactor
 *
 * @param envVar - Environment variable name
 * @param options - Field options
 * @returns ConfigField for secret value
 *
 * @example
 * ```typescript
 * Env.secret("API_KEY", {
 *   required: true,
 *   minLength: 32,
 *   description: "API authentication key"
 * })
 *
 * // Access secret value
 * const key = config.values.apiKey.value;
 *
 * // Safe logging (shows redacted)
 * console.log(config.values.apiKey); // "[REDACTED]"
 *
 * // Partial reveal in dev
 * console.log(config.values.apiKey.reveal()); // "sk_l...abcd"
 * ```
 */
function secret(
  envVar: string,
  options: SecretFieldOptions = {},
): SecretConfigField {
  return {
    envVar,
    type: "secret",
    options: {
      revealStart: 0,
      revealEnd: 4,
      allowPartialReveal: true,
      ...options,
    },
    isSecret: true as const,
    errors: [],
  };
}

/**
 * Create a JSON configuration field.
 *
 * Parses JSON string from environment variable.
 *
 * @param envVar - Environment variable name
 * @param options - Field options
 * @returns ConfigField for parsed JSON value
 *
 * @example
 * ```typescript
 * // Parse JSON object
 * Env.json<{ host: string; port: number }>("DB_CONFIG", {
 *   default: { host: "localhost", port: 5432 }
 * })
 *
 * // With custom validator
 * Env.json<string[]>("ALLOWED_ORIGINS", {
 *   validate: (v) => Array.isArray(v) || "Must be an array"
 * })
 * ```
 */
function json<T>(
  envVar: string,
  options: JsonFieldOptions<T> = {},
): ConfigField<T, false> {
  return {
    envVar,
    type: "json",
    options,
    isSecret: false as const,
    errors: [],
  };
}

/**
 * Create an array configuration field.
 *
 * Parses comma-separated string to array.
 *
 * @param envVar - Environment variable name
 * @param options - Field options
 * @returns ConfigField for array value
 *
 * @example
 * ```typescript
 * // String array (comma-separated)
 * Env.array("ALLOWED_HOSTS", {
 *   default: ["localhost"],
 *   delimiter: ","
 * })
 * // "host1,host2,host3" → ["host1", "host2", "host3"]
 *
 * // Number array
 * Env.array("RETRY_DELAYS", {
 *   itemType: "number",
 *   default: [100, 500, 1000]
 * })
 * ```
 */
function array<T extends string | number>(
  envVar: string,
  options: ArrayFieldOptions<T> = {},
): ConfigField<Array<T>, false> {
  return {
    envVar,
    type: "array",
    options: {
      delimiter: ",",
      itemType: "string",
      ...options,
    } as ArrayFieldOptions<T>,
    isSecret: false as const,
    errors: [],
  };
}

// ============================================================================
// Env Object Export
// ============================================================================

/**
 * Environment configuration field builders.
 *
 * UNIQUE: Type-safe, zero-config environment configuration!
 *
 * @example
 * ```typescript
 * import { Env, defineConfig } from "@expressots/core";
 *
 * export const config = defineConfig({
 *   // Full TypeScript inference!
 *   server: {
 *     port: Env.port("PORT", { default: 3000 }),
 *     host: Env.string("HOST", { default: "0.0.0.0" }),
 *   },
 *   database: {
 *     url: Env.url("DATABASE_URL", { required: true }),
 *     pool: Env.number("DB_POOL_SIZE", { default: 10, min: 1, max: 100 }),
 *   },
 *   auth: {
 *     secret: Env.secret("JWT_SECRET", { required: true, minLength: 32 }),
 *     expiry: Env.string("JWT_EXPIRY", { default: "1h" }),
 *   },
 *   features: {
 *     enableCache: Env.boolean("ENABLE_CACHE", { default: true }),
 *     logLevel: Env.enum("LOG_LEVEL", ["debug", "info", "warn", "error"]),
 *   },
 * });
 *
 * // Usage with full type safety!
 * config.values.server.port    // number
 * config.values.auth.secret    // SecretValue
 * config.values.features.logLevel // "debug" | "info" | "warn" | "error"
 * ```
 *
 * @public API
 */
export const Env = {
  string,
  number,
  boolean,
  enum: enumField,
  url,
  port,
  secret,
  json,
  array,
} as const;

// Re-export individual builders for tree-shaking
export {
  string as envString,
  number as envNumber,
  boolean as envBoolean,
  enumField as envEnum,
  url as envUrl,
  port as envPort,
  secret as envSecret,
  json as envJson,
  array as envArray,
};

