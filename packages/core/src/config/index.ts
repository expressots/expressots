/**
 * Enhanced Configuration Module
 *
 * @module config
 *
 * Type-safe, zero-config environment configuration for ExpressoTS.
 *
 * UNIQUE Features:
 * - Full TypeScript inference (no type casting!)
 * - Multi-environment defaults (dev/staging/prod)
 * - Helpful validation errors with examples and hints
 * - Secret management with auto-redaction
 * - Documentation generation
 * - Hot reload support
 *
 * @example
 * ```typescript
 * // 1. Define your config (one file, all type-safe!)
 * import { defineConfig, Env } from "@expressots/core";
 *
 * export const config = defineConfig({
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
 *   },
 *   features: {
 *     logLevel: Env.enum("LOG_LEVEL", ["debug", "info", "warn", "error"]),
 *     enableCache: Env.boolean("ENABLE_CACHE", { default: true }),
 *   },
 * });
 *
 * // 2. Use with FULL type safety!
 * config.values.server.port      // number
 * config.values.database.url     // string
 * config.values.auth.secret      // SecretValue (auto-redacted)
 * config.values.features.logLevel // "debug" | "info" | "warn" | "error"
 *
 * // 3. Validate at startup (automatically shows helpful errors)
 * if (!config.isValid()) {
 *   process.exit(1);
 * }
 *
 * // 4. Safe logging (secrets auto-redacted)
 * console.log(config.toObject());
 * // { server: { port: 3000 }, auth: { secret: "[REDACTED]" }, ... }
 *
 * // 5. Generate documentation
 * fs.writeFileSync("CONFIG.md", config.generateDocs("markdown"));
 * ```
 */

// ============================================================================
// Core Exports
// ============================================================================

export { defineConfig, Env } from "./define-config";

// Individual field builders (for tree-shaking)
export {
  envString,
  envNumber,
  envBoolean,
  envEnum,
  envUrl,
  envPort,
  envSecret,
  envJson,
  envArray,
} from "./env-field-builders";

// ============================================================================
// Types & Interfaces
// ============================================================================

export type {
  // Core types
  ConfigValueType,
  ConfigEnvironment,
  ConfigLogLevel,

  // Field options
  BaseFieldOptions,
  StringFieldOptions,
  NumberFieldOptions,
  BooleanFieldOptions,
  EnumFieldOptions,
  UrlFieldOptions,
  PortFieldOptions,
  SecretFieldOptions,
  JsonFieldOptions,
  ArrayFieldOptions,

  // Config field
  ConfigField,

  // Validation
  ConfigValidationError,
  ConfigValidationResult,

  // Schema
  ConfigSchemaValue,
  ConfigSchema,

  // Options
  DefineConfigOptions,
  ConfigChangeEvent,

  // Secret value
  SecretValue,

  // Resolved types
  ResolvedConfig,
  IConfigInstance,
} from "./config.interfaces";

// ============================================================================
// Secret Value
// ============================================================================

export { createSecretValue, isSecretValue } from "./secret-value";

