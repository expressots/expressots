/**
 * Define Configuration
 *
 * @module config
 *
 * Type-safe configuration definition with zero-config defaults.
 *
 * UNIQUE Features:
 * - Full TypeScript inference (no type casting!)
 * - Multi-environment defaults
 * - Helpful validation errors
 * - Secret management with auto-redaction
 * - Documentation generation
 *
 * @example
 * ```typescript
 * import { defineConfig, Env } from "@expressots/core";
 *
 * // One-liner: Define your entire config with full type safety!
 * export const config = defineConfig({
 *   server: {
 *     port: Env.port("PORT", { default: 3000 }),
 *     host: Env.string("HOST", { default: "0.0.0.0" }),
 *   },
 *   database: {
 *     url: Env.url("DATABASE_URL", { required: true }),
 *     pool: Env.number("DB_POOL_SIZE", { default: 10 }),
 *   },
 *   auth: {
 *     secret: Env.secret("JWT_SECRET", { required: true }),
 *   },
 * });
 *
 * // Usage with FULL type safety!
 * config.values.server.port     // number
 * config.values.database.url    // string
 * config.values.auth.secret     // SecretValue (auto-redacted)
 *
 * // Validate at startup
 * if (!config.isValid()) {
 *   console.error(config.getErrors());
 *   process.exit(1);
 * }
 * ```
 */

import { resolveSchema } from "./config-resolver";
import {
  ConfigField,
  ConfigValidationError,
  ConfigValidationResult,
  DefineConfigOptions,
  IConfigInstance,
  ResolvedConfig,
} from "./config.interfaces";
import { isSecretValue } from "./secret-value";

// ============================================================================
// Error Formatter
// ============================================================================

/**
 * Format validation errors with helpful information.
 *
 * UNIQUE: Uses same patterns as HelpfulErrorFormatter for consistency!
 */
function formatValidationErrors(errors: Array<ConfigValidationError>): string {
  const lines: Array<string> = [];

  lines.push("");
  lines.push("❌ Configuration Validation Failed");
  lines.push("━".repeat(50));
  lines.push("");

  errors.forEach((error, index) => {
    lines.push(`${index + 1}. ${error.envVar} (${error.code.toLowerCase()})`);
    lines.push(`   └─ ${error.message}`);

    if (error.expected) {
      lines.push(`   ├─ Expected: ${error.expected}`);
    }

    if (error.received) {
      lines.push(`   ├─ Received: ${error.received}`);
    }

    if (error.example) {
      lines.push(`   ├─ Example: ${error.example}`);
    }

    if (error.hint) {
      lines.push(`   └─ 💡 Hint: ${error.hint}`);
    }

    lines.push("");
  });

  lines.push("━".repeat(50));
  lines.push("⚠️  Server will not start until configuration is valid.");
  lines.push("");

  return lines.join("\n");
}

/**
 * Format startup banner for configuration.
 */
function formatStartupBanner(result: ConfigValidationResult): string {
  const lines: Array<string> = [];

  lines.push("");
  lines.push("┌─────────────────────────────────────────────────┐");
  lines.push("│              CONFIGURATION LOADED               │");
  lines.push("├─────────────────────────────────────────────────┤");

  const { stats } = result;

  lines.push(
    `│  ✅ Fields:     ${String(stats.validFields).padStart(3)} valid                       │`,
  );

  if (stats.secretFields > 0) {
    lines.push(
      `│  🔐 Secrets:    ${String(stats.secretFields).padStart(3)} secured                     │`,
    );
  }

  if (stats.deprecatedFields > 0) {
    lines.push(
      `│  ⚠️  Deprecated: ${String(stats.deprecatedFields).padStart(3)} (see warnings)             │`,
    );
  }

  lines.push("└─────────────────────────────────────────────────┘");
  lines.push("");

  return lines.join("\n");
}

// ============================================================================
// Config Instance Implementation
// ============================================================================

/**
 * Configuration instance implementation.
 *
 * @internal
 */
class ConfigInstance<T extends Record<string, unknown>>
  implements IConfigInstance<T>
{
  private readonly _schema: T;
  private readonly _options: DefineConfigOptions;
  private _resolved: {
    values: Record<string, unknown>;
    errors: Array<ConfigValidationError>;
    warnings: Array<string>;
    fields: Array<{ path: string; field: ConfigField }>;
  } | null = null;
  private _validated: boolean = false;

  constructor(schema: T, options: DefineConfigOptions = {}) {
    this._schema = schema;
    this._options = {
      validateOnAccess: true,
      throwOnError: process.env.NODE_ENV === "production",
      logLevel: "info",
      ...options,
    };

    // Resolve immediately
    this._resolve();
  }

  /**
   * Resolve configuration from environment.
   */
  private _resolve(): void {
    this._resolved = resolveSchema(this._schema, this._options);
    this._validated = false;
  }

  /**
   * Get resolved configuration values.
   */
  get values(): ResolvedConfig<T> {
    if (!this._resolved) {
      this._resolve();
    }

    // Validate on first access if enabled
    if (this._options.validateOnAccess && !this._validated) {
      this._performValidation();
    }

    return this._resolved!.values as ResolvedConfig<T>;
  }

  /**
   * Perform validation and handle results.
   */
  private _performValidation(): void {
    if (this._validated) return;

    this._validated = true;
    const result = this.validate();

    // Log warnings
    if (result.warnings.length > 0 && this._options.logLevel !== "none") {
      result.warnings.forEach((warning) => {
        console.warn(warning);
      });
    }

    // Handle errors
    if (!result.valid) {
      const errorMessage = formatValidationErrors(result.errors);

      if (this._options.logLevel !== "none") {
        console.error(errorMessage);
      }

      if (this._options.throwOnError) {
        throw new Error(
          `Configuration validation failed with ${result.errors.length} error(s)`,
        );
      }
    } else if (
      this._options.logLevel === "info" ||
      this._options.logLevel === "debug"
    ) {
      console.log(formatStartupBanner(result));
    }
  }

  /**
   * Validate configuration and get result.
   */
  validate(): ConfigValidationResult {
    if (!this._resolved) {
      this._resolve();
    }

    const { errors, warnings, fields } = this._resolved!;

    // Count statistics
    const secretFields = fields.filter((f) => f.field.isSecret).length;
    const deprecatedFields = fields.filter(
      (f) => f.field.options.deprecated,
    ).length;

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      stats: {
        totalFields: fields.length,
        validFields: fields.length - errors.length,
        invalidFields: errors.length,
        secretFields,
        deprecatedFields,
      },
    };
  }

  /**
   * Check if configuration is valid.
   */
  isValid(): boolean {
    return this.validate().valid;
  }

  /**
   * Get validation errors.
   */
  getErrors(): Array<ConfigValidationError> {
    return this._resolved?.errors ?? [];
  }

  /**
   * Get a specific config value by path.
   */
  get<V = unknown>(path: string): V {
    const parts = path.split(".");
    let current: unknown = this.values;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined as V;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current as V;
  }

  /**
   * Check if a config value is set.
   */
  has(path: string): boolean {
    const value = this.get(path);
    return value !== undefined && value !== null;
  }

  /**
   * Get all config as plain object (secrets redacted).
   */
  toObject(): Record<string, unknown> {
    return this._redactSecrets(this._resolved?.values ?? {});
  }

  /**
   * Redact secrets from an object.
   */
  private _redactSecrets(
    obj: Record<string, unknown>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (isSecretValue(value)) {
        result[key] = "[REDACTED]";
      } else if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        result[key] = this._redactSecrets(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Get config as JSON string (secrets redacted).
   */
  toJSON(): string {
    return JSON.stringify(this.toObject(), null, 2);
  }

  /**
   * Reload configuration from environment.
   */
  reload(): void {
    const oldValues = this._resolved?.values;

    this._resolve();
    this._validated = false;

    // Trigger change callback if configured
    if (this._options.onConfigChange && oldValues) {
      const changes = this._detectChanges(
        oldValues,
        this._resolved!.values,
        this._resolved!.fields,
      );
      if (changes.length > 0) {
        this._options.onConfigChange({
          changes,
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Detect changes between old and new config.
   */
  private _detectChanges(
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
    fields: Array<{ path: string; field: ConfigField }>,
  ): Array<{
    path: string;
    envVar: string;
    oldValue: unknown;
    newValue: unknown;
  }> {
    const changes: Array<{
      path: string;
      envVar: string;
      oldValue: unknown;
      newValue: unknown;
    }> = [];

    for (const { path, field } of fields) {
      const oldValue = this._getByPath(oldValues, path);
      const newValue = this._getByPath(newValues, path);

      // Compare values (handle SecretValue specially)
      const oldActual = isSecretValue(oldValue) ? oldValue.value : oldValue;
      const newActual = isSecretValue(newValue) ? newValue.value : newValue;

      if (JSON.stringify(oldActual) !== JSON.stringify(newActual)) {
        changes.push({
          path,
          envVar: field.envVar,
          oldValue: field.isSecret ? "[REDACTED]" : oldActual,
          newValue: field.isSecret ? "[REDACTED]" : newActual,
        });
      }
    }

    return changes;
  }

  /**
   * Get value by dot-notation path.
   */
  private _getByPath(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split(".");
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  /**
   * Get list of all environment variables used.
   */
  getEnvVars(): Array<string> {
    return this._resolved?.fields.map((f) => f.field.envVar) ?? [];
  }

  /**
   * Generate documentation for this configuration.
   */
  generateDocs(format: "markdown" | "json" = "markdown"): string {
    if (!this._resolved) {
      this._resolve();
    }

    const { fields } = this._resolved!;

    if (format === "json") {
      return this._generateJsonDocs(fields);
    }

    return this._generateMarkdownDocs(fields);
  }

  /**
   * Generate Markdown documentation.
   */
  private _generateMarkdownDocs(
    fields: Array<{ path: string; field: ConfigField }>,
  ): string {
    const lines: Array<string> = [];

    lines.push("# Configuration Reference");
    lines.push("");
    lines.push("This document describes all configuration options.");
    lines.push("");

    // Group by top-level key
    const groups = new Map<
      string,
      Array<{ path: string; field: ConfigField }>
    >();

    for (const f of fields) {
      const topLevel = f.path.split(".")[0];
      if (!groups.has(topLevel)) {
        groups.set(topLevel, []);
      }
      groups.get(topLevel)!.push(f);
    }

    for (const [group, groupFields] of groups) {
      lines.push(
        `## ${group.charAt(0).toUpperCase() + group.slice(1)} Configuration`,
      );
      lines.push("");

      for (const { path, field } of groupFields) {
        lines.push(`### \`${field.envVar}\``);
        lines.push("");

        if (field.options.description) {
          lines.push(field.options.description);
          lines.push("");
        }

        lines.push(`- **Path**: \`${path}\``);
        lines.push(`- **Type**: \`${field.type}\``);
        lines.push(`- **Required**: ${field.options.required ? "Yes" : "No"}`);

        if (field.options.default !== undefined) {
          const defaultStr =
            typeof field.options.default === "object"
              ? JSON.stringify(field.options.default)
              : String(field.options.default);
          lines.push(`- **Default**: \`${defaultStr}\``);
        }

        if (field.options.example !== undefined) {
          lines.push(`- **Example**: \`${field.options.example}\``);
        }

        if (field.isSecret) {
          lines.push(
            "- **⚠️ Secret**: This value is sensitive and will be redacted in logs",
          );
        }

        if (field.options.deprecated) {
          const msg =
            typeof field.options.deprecated === "string"
              ? field.options.deprecated
              : "This field is deprecated";
          lines.push(`- **⚠️ Deprecated**: ${msg}`);
        }

        lines.push("");
      }
    }

    return lines.join("\n");
  }

  /**
   * Generate JSON documentation.
   */
  private _generateJsonDocs(
    fields: Array<{ path: string; field: ConfigField }>,
  ): string {
    const docs = fields.map(({ path, field }) => ({
      envVar: field.envVar,
      path,
      type: field.type,
      required: field.options.required ?? false,
      default: field.options.default,
      description: field.options.description,
      example: field.options.example,
      isSecret: field.isSecret,
      deprecated: field.options.deprecated,
    }));

    return JSON.stringify(docs, null, 2);
  }
}

// ============================================================================
// defineConfig Export
// ============================================================================

/**
 * Define a type-safe configuration schema.
 *
 * UNIQUE: Full TypeScript inference, zero boilerplate!
 *
 * @param schema - Configuration schema using Env helpers
 * @param options - Optional configuration options
 * @returns ConfigInstance with typed values
 *
 * @example
 * ```typescript
 * import { defineConfig, Env } from "@expressots/core";
 *
 * // Define your config schema
 * export const config = defineConfig({
 *   server: {
 *     port: Env.port("PORT", { default: 3000 }),
 *     host: Env.string("HOST", { default: "0.0.0.0" }),
 *   },
 *   database: {
 *     host: Env.string("DB_HOST", {
 *       development: "localhost",      // Different per environment!
 *       production: "prod-db.example.com",
 *     }),
 *     port: Env.port("DB_PORT", { default: 5432 }),
 *     ssl: Env.boolean("DB_SSL", {
 *       development: false,            // No SSL in dev
 *       production: true,              // SSL in prod
 *     }),
 *   },
 *   auth: {
 *     secret: Env.secret("JWT_SECRET", {
 *       required: true,
 *       minLength: 32,
 *     }),
 *   },
 *   features: {
 *     logLevel: Env.enum("LOG_LEVEL", ["debug", "info", "warn", "error"], {
 *       default: "info",
 *     }),
 *     enableCache: Env.boolean("ENABLE_CACHE", { default: true }),
 *   },
 * });
 *
 * // Full type safety - TypeScript knows exact types!
 * config.values.server.port       // number
 * config.values.database.host     // string
 * config.values.auth.secret       // SecretValue
 * config.values.features.logLevel // "debug" | "info" | "warn" | "error"
 *
 * // Startup validation with helpful errors
 * if (!config.isValid()) {
 *   process.exit(1);
 * }
 *
 * // Generate documentation
 * console.log(config.generateDocs("markdown"));
 * ```
 *
 * @public API
 */
export function defineConfig<T extends Record<string, unknown>>(
  schema: T,
  options: DefineConfigOptions = {},
): IConfigInstance<T> {
  return new ConfigInstance(schema, options);
}

// ============================================================================
// Re-exports for convenience
// ============================================================================

export { Env } from "./env-field-builders";
