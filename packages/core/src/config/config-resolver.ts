/**
 * Configuration Resolver
 *
 * @module config
 *
 * Resolves and validates configuration from environment variables.
 * Provides helpful error messages with examples and hints.
 *
 * Integrates with existing:
 * - Redactor for secret handling
 * - HelpfulErrorFormatter patterns for consistent errors
 */

import {
  ArrayFieldOptions,
  BaseFieldOptions,
  BooleanFieldOptions,
  ConfigEnvironment,
  ConfigField,
  ConfigValidationError,
  DefineConfigOptions,
  EnumFieldOptions,
  JsonFieldOptions,
  NumberFieldOptions,
  PortFieldOptions,
  SecretFieldOptions,
  SecretValue,
  StringFieldOptions,
  UrlFieldOptions,
} from "./config.interfaces.js";
import { createSecretValue } from "./secret-value.js";

// ============================================================================
// Environment Detection
// ============================================================================

/**
 * Get current environment name.
 */
function getCurrentEnvironment(): ConfigEnvironment {
  const env = process.env.NODE_ENV?.toLowerCase() ?? "development";
  return env as ConfigEnvironment;
}

/**
 * Get environment-specific default value.
 */
function getEnvSpecificDefault<T>(
  options: BaseFieldOptions<T>,
  currentEnv: ConfigEnvironment,
): T | undefined {
  // Check environment-specific default first
  const envDefault = (options as Record<string, T | undefined>)[currentEnv];
  if (envDefault !== undefined) {
    return envDefault;
  }

  // Fall back to general default
  return options.default;
}

// ============================================================================
// Format Validators
// ============================================================================

const FORMAT_VALIDATORS: Record<string, (v: string) => boolean> = {
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  url: (v) => {
    try {
      new URL(v);
      return true;
    } catch {
      return false;
    }
  },
  uuid: (v) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
  alphanumeric: (v) => /^[a-zA-Z0-9]+$/.test(v),
  hostname: (v) =>
    /^(?=.{1,253}$)(([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z]{2,})$/.test(
      v,
    ),
  ip: (v) => FORMAT_VALIDATORS.ipv4(v) || FORMAT_VALIDATORS.ipv6(v),
  ipv4: (v) =>
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
      v,
    ),
  ipv6: (v) => /^(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}$/.test(v),
};

const FORMAT_EXAMPLES: Record<string, string> = {
  email: "user@example.com",
  url: "https://example.com",
  uuid: "550e8400-e29b-41d4-a716-446655440000",
  alphanumeric: "abc123",
  hostname: "api.example.com",
  ip: "192.168.1.1",
  ipv4: "192.168.1.1",
  ipv6: "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
};

// ============================================================================
// Value Resolvers
// ============================================================================

/**
 * Resolve a string field.
 */
function resolveString(
  rawValue: string | undefined,
  field: ConfigField<string>,
  path: string,
  currentEnv: ConfigEnvironment,
): { value: string | undefined; errors: Array<ConfigValidationError> } {
  const options = field.options as StringFieldOptions;
  const errors: Array<ConfigValidationError> = [];

  // Get default value
  const defaultValue = getEnvSpecificDefault(options, currentEnv);

  // Get actual value
  let value = rawValue ?? defaultValue;

  // Trim if enabled (default true)
  if (value && options.trim !== false) {
    value = value.trim();
  }

  // Check required
  if (options.required && (value === undefined || value === "")) {
    errors.push({
      envVar: field.envVar,
      path,
      code: "MISSING",
      message: `Required environment variable ${field.envVar} is not set`,
      expected: "Non-empty string",
      hint: options.hint ?? `Add ${field.envVar} to your .env file`,
      example:
        options.example ??
        (options.format ? FORMAT_EXAMPLES[options.format] : undefined),
    });
    return { value: undefined, errors };
  }

  // Skip validation if not set and not required
  if (value === undefined || value === "") {
    return { value: undefined, errors };
  }

  // Case transformations
  if (options.lowercase) {
    value = value.toLowerCase();
  }
  if (options.uppercase) {
    value = value.toUpperCase();
  }

  // Length validation
  if (options.minLength !== undefined && value.length < options.minLength) {
    errors.push({
      envVar: field.envVar,
      path,
      code: "INVALID_FORMAT",
      message: `${field.envVar} must be at least ${options.minLength} characters`,
      expected: `String with minimum ${options.minLength} characters`,
      received: `"${value}" (${value.length} characters)`,
      hint: options.hint,
    });
  }

  if (options.maxLength !== undefined && value.length > options.maxLength) {
    errors.push({
      envVar: field.envVar,
      path,
      code: "INVALID_FORMAT",
      message: `${field.envVar} must be at most ${options.maxLength} characters`,
      expected: `String with maximum ${options.maxLength} characters`,
      received: `"${value}" (${value.length} characters)`,
      hint: options.hint,
    });
  }

  // Pattern validation
  if (options.pattern && !options.pattern.test(value)) {
    errors.push({
      envVar: field.envVar,
      path,
      code: "PATTERN_MISMATCH",
      message: `${field.envVar} does not match the required pattern`,
      expected: `String matching ${options.pattern}`,
      received: `"${value}"`,
      hint: options.hint,
      example: options.example,
    });
  }

  // Format validation
  if (options.format && FORMAT_VALIDATORS[options.format]) {
    if (!FORMAT_VALIDATORS[options.format](value)) {
      errors.push({
        envVar: field.envVar,
        path,
        code: "INVALID_FORMAT",
        message: `${field.envVar} must be a valid ${options.format}`,
        expected: `Valid ${options.format} format`,
        received: `"${value}"`,
        hint: options.hint ?? `Check the format of your ${options.format}`,
        example: FORMAT_EXAMPLES[options.format],
      });
    }
  }

  // Apply transform
  if (options.transform && errors.length === 0) {
    value = options.transform(value);
  }

  return { value, errors };
}

/**
 * Resolve a number field.
 */
function resolveNumber(
  rawValue: string | undefined,
  field: ConfigField<number>,
  path: string,
  currentEnv: ConfigEnvironment,
): { value: number | undefined; errors: Array<ConfigValidationError> } {
  const options = field.options as NumberFieldOptions;
  const errors: Array<ConfigValidationError> = [];

  const defaultValue = getEnvSpecificDefault(options, currentEnv);

  // Check required
  if (options.required && rawValue === undefined) {
    errors.push({
      envVar: field.envVar,
      path,
      code: "MISSING",
      message: `Required environment variable ${field.envVar} is not set`,
      expected: "Number",
      hint: options.hint ?? `Add ${field.envVar} to your .env file`,
      example: options.example?.toString(),
    });
    return { value: undefined, errors };
  }

  // Use default if not set
  if (rawValue === undefined) {
    return { value: defaultValue, errors };
  }

  // Parse number
  const value = Number(rawValue);

  if (isNaN(value)) {
    errors.push({
      envVar: field.envVar,
      path,
      code: "INVALID_TYPE",
      message: `${field.envVar} must be a valid number`,
      expected: "Number",
      received: `"${rawValue}"`,
      hint: options.hint ?? "Remove any non-numeric characters",
      example: options.example?.toString() ?? "42",
    });
    return { value: undefined, errors };
  }

  // Integer validation
  if (options.integer && !Number.isInteger(value)) {
    errors.push({
      envVar: field.envVar,
      path,
      code: "INVALID_TYPE",
      message: `${field.envVar} must be an integer`,
      expected: "Integer",
      received: `${value}`,
      hint: "Remove any decimal places",
    });
  }

  // Positive validation
  if (options.positive && value <= 0) {
    errors.push({
      envVar: field.envVar,
      path,
      code: "OUT_OF_RANGE",
      message: `${field.envVar} must be a positive number`,
      expected: "Positive number (> 0)",
      received: `${value}`,
    });
  }

  // Range validation
  if (options.min !== undefined && value < options.min) {
    errors.push({
      envVar: field.envVar,
      path,
      code: "OUT_OF_RANGE",
      message: `${field.envVar} must be at least ${options.min}`,
      expected: `Number >= ${options.min}`,
      received: `${value}`,
    });
  }

  if (options.max !== undefined && value > options.max) {
    errors.push({
      envVar: field.envVar,
      path,
      code: "OUT_OF_RANGE",
      message: `${field.envVar} must be at most ${options.max}`,
      expected: `Number <= ${options.max}`,
      received: `${value}`,
    });
  }

  return { value, errors };
}

/**
 * Resolve a boolean field.
 */
function resolveBoolean(
  rawValue: string | undefined,
  field: ConfigField<boolean>,
  path: string,
  currentEnv: ConfigEnvironment,
): { value: boolean | undefined; errors: Array<ConfigValidationError> } {
  const options = field.options as BooleanFieldOptions;
  const errors: Array<ConfigValidationError> = [];

  const defaultValue = getEnvSpecificDefault(options, currentEnv);

  // Check required
  if (options.required && rawValue === undefined) {
    errors.push({
      envVar: field.envVar,
      path,
      code: "MISSING",
      message: `Required environment variable ${field.envVar} is not set`,
      expected: "Boolean (true/false, 1/0, yes/no, on/off)",
      hint: options.hint ?? `Add ${field.envVar} to your .env file`,
    });
    return { value: undefined, errors };
  }

  // Use default if not set
  if (rawValue === undefined) {
    return { value: defaultValue, errors };
  }

  const lowered = rawValue.toLowerCase().trim();
  const trueValues = options.trueValues ?? ["true", "1", "yes", "on"];
  const falseValues = options.falseValues ?? ["false", "0", "no", "off"];

  if (trueValues.includes(lowered)) {
    return { value: true, errors };
  }

  if (falseValues.includes(lowered)) {
    return { value: false, errors };
  }

  errors.push({
    envVar: field.envVar,
    path,
    code: "INVALID_TYPE",
    message: `${field.envVar} must be a boolean value`,
    expected: `One of: ${[...trueValues, ...falseValues].join(", ")}`,
    received: `"${rawValue}"`,
    hint: 'Use "true" or "false"',
    example: "true",
  });

  return { value: undefined, errors };
}

/**
 * Resolve an enum field.
 */
function resolveEnum<T extends string>(
  rawValue: string | undefined,
  field: ConfigField<T>,
  path: string,
  currentEnv: ConfigEnvironment,
): { value: T | undefined; errors: Array<ConfigValidationError> } {
  const options = field.options as EnumFieldOptions<T>;
  const errors: Array<ConfigValidationError> = [];

  const defaultValue = getEnvSpecificDefault(options, currentEnv) as
    | T
    | undefined;

  // Check required
  if (options.required && rawValue === undefined) {
    errors.push({
      envVar: field.envVar,
      path,
      code: "MISSING",
      message: `Required environment variable ${field.envVar} is not set`,
      expected: `One of: ${options.values.join(", ")}`,
      hint: options.hint ?? `Add ${field.envVar} to your .env file`,
      example: options.values[0],
    });
    return { value: undefined, errors };
  }

  // Use default if not set
  if (rawValue === undefined) {
    return { value: defaultValue, errors };
  }

  const value = rawValue;
  const values = options.values;

  // Case insensitive matching
  if (options.caseInsensitive) {
    const lowered = rawValue.toLowerCase();
    const match = values.find((v) => v.toLowerCase() === lowered);
    if (match) {
      return { value: match, errors };
    }
  } else {
    if (values.includes(value as T)) {
      return { value: value as T, errors };
    }
  }

  errors.push({
    envVar: field.envVar,
    path,
    code: "INVALID_ENUM",
    message: `${field.envVar} must be one of the allowed values`,
    expected: `One of: ${values.join(", ")}`,
    received: `"${rawValue}"`,
    hint:
      options.hint ?? `Check for typos. Valid values are: ${values.join(", ")}`,
    example: values[0],
  });

  return { value: undefined, errors };
}

/**
 * Resolve a URL field.
 */
function resolveUrl(
  rawValue: string | undefined,
  field: ConfigField<string>,
  path: string,
  currentEnv: ConfigEnvironment,
): { value: string | undefined; errors: Array<ConfigValidationError> } {
  const options = field.options as UrlFieldOptions;
  const errors: Array<ConfigValidationError> = [];

  const defaultValue = getEnvSpecificDefault(options, currentEnv);

  // Check required
  if (options.required && rawValue === undefined) {
    errors.push({
      envVar: field.envVar,
      path,
      code: "MISSING",
      message: `Required environment variable ${field.envVar} is not set`,
      expected: "Valid URL",
      hint: options.hint ?? `Add ${field.envVar} to your .env file`,
      example: options.example ?? "https://example.com",
    });
    return { value: undefined, errors };
  }

  // Use default if not set
  if (rawValue === undefined) {
    return { value: defaultValue, errors };
  }

  let value = rawValue.trim();

  // Parse URL
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    errors.push({
      envVar: field.envVar,
      path,
      code: "INVALID_FORMAT",
      message: `${field.envVar} must be a valid URL`,
      expected: "Valid URL format",
      received: `"${value}"`,
      hint: "Check for missing protocol (http:// or https://)",
      example: "https://example.com",
    });
    return { value: undefined, errors };
  }

  // Protocol validation
  const allowedProtocols = options.protocols ?? ["http", "https"];
  const protocol = url.protocol.replace(":", "");
  if (!allowedProtocols.includes(protocol)) {
    errors.push({
      envVar: field.envVar,
      path,
      code: "INVALID_FORMAT",
      message: `${field.envVar} must use allowed protocol: ${allowedProtocols.join(", ")}`,
      expected: `Protocol: ${allowedProtocols.join(" or ")}`,
      received: `${protocol}://...`,
      hint: options.hint,
    });
  }

  // Trailing slash handling
  if (options.trailingSlash && !value.endsWith("/")) {
    value = value + "/";
  }
  if (options.noTrailingSlash && value.endsWith("/")) {
    value = value.slice(0, -1);
  }

  return { value, errors };
}

/**
 * Resolve a port field.
 */
function resolvePort(
  rawValue: string | undefined,
  field: ConfigField<number>,
  path: string,
  currentEnv: ConfigEnvironment,
): { value: number | undefined; errors: Array<ConfigValidationError> } {
  const options = field.options as PortFieldOptions;

  // Override min/max for port
  const portOptions: NumberFieldOptions = {
    ...options,
    min: options.noPrivileged ? 1024 : (options.min ?? 1),
    max: options.max ?? 65535,
    integer: true,
  };

  const result = resolveNumber(
    rawValue,
    { ...field, options: portOptions },
    path,
    currentEnv,
  );

  // Add port-specific hints
  if (result.errors.length > 0) {
    result.errors.forEach((error) => {
      if (error.code === "OUT_OF_RANGE" && options.noPrivileged) {
        error.hint =
          "Privileged ports (< 1024) are not allowed. Use a port >= 1024.";
      }
    });
  }

  return result;
}

/**
 * Resolve a secret field.
 */
function resolveSecret(
  rawValue: string | undefined,
  field: ConfigField<string>,
  path: string,
  currentEnv: ConfigEnvironment,
): { value: SecretValue | undefined; errors: Array<ConfigValidationError> } {
  const options = field.options as SecretFieldOptions;
  const errors: Array<ConfigValidationError> = [];

  // Check required
  if (options.required && (rawValue === undefined || rawValue === "")) {
    errors.push({
      envVar: field.envVar,
      path,
      code: "MISSING",
      message: `Required secret ${field.envVar} is not set`,
      expected: "Secret value",
      received: "[NOT SET]", // Never show actual secret in errors
      hint:
        options.hint ??
        `Add ${field.envVar} to your .env file (keep it secure!)`,
    });
    return { value: undefined, errors };
  }

  // Use default if not set (less common for secrets)
  const defaultValue = getEnvSpecificDefault(options, currentEnv);
  const value = rawValue ?? defaultValue;

  if (value === undefined) {
    return { value: undefined, errors };
  }

  // Length validation (important for secrets)
  if (options.minLength !== undefined && value.length < options.minLength) {
    errors.push({
      envVar: field.envVar,
      path,
      code: "INVALID_FORMAT",
      message: `${field.envVar} must be at least ${options.minLength} characters`,
      expected: `Secret with minimum ${options.minLength} characters`,
      received: `[REDACTED] (${value.length} characters)`, // Only show length
      hint: options.hint ?? "Generate a longer secret key",
    });
  }

  // Wrap in SecretValue
  return { value: createSecretValue(value, options), errors };
}

/**
 * Resolve a JSON field.
 */
function resolveJson<T>(
  rawValue: string | undefined,
  field: ConfigField<T>,
  path: string,
  currentEnv: ConfigEnvironment,
): { value: T | undefined; errors: Array<ConfigValidationError> } {
  const options = field.options as JsonFieldOptions<T>;
  const errors: Array<ConfigValidationError> = [];

  const defaultValue = getEnvSpecificDefault(options, currentEnv);

  // Check required
  if (options.required && rawValue === undefined) {
    errors.push({
      envVar: field.envVar,
      path,
      code: "MISSING",
      message: `Required environment variable ${field.envVar} is not set`,
      expected: "Valid JSON",
      hint:
        options.hint ?? `Add ${field.envVar} with valid JSON to your .env file`,
      example: options.example ? JSON.stringify(options.example) : undefined,
    });
    return { value: undefined, errors };
  }

  // Use default if not set
  if (rawValue === undefined) {
    return { value: defaultValue, errors };
  }

  // Parse JSON
  let value: T;
  try {
    value = JSON.parse(rawValue);
  } catch (e) {
    errors.push({
      envVar: field.envVar,
      path,
      code: "INVALID_FORMAT",
      message: `${field.envVar} must be valid JSON`,
      expected: "Valid JSON",
      received: `"${rawValue.slice(0, 50)}${rawValue.length > 50 ? "..." : ""}"`,
      hint: "Check for syntax errors in your JSON",
      example: options.example
        ? JSON.stringify(options.example)
        : '{"key": "value"}',
    });
    return { value: undefined, errors };
  }

  // Custom validation
  if (options.validate) {
    const validationResult = options.validate(value);
    if (validationResult !== true) {
      errors.push({
        envVar: field.envVar,
        path,
        code: "CUSTOM",
        message:
          typeof validationResult === "string"
            ? validationResult
            : `${field.envVar} failed custom validation`,
        expected: "Valid JSON matching constraints",
        received: "[JSON Object]",
      });
    }
  }

  return { value, errors };
}

/**
 * Resolve an array field.
 */
function resolveArray<T extends string | number>(
  rawValue: string | undefined,
  field: ConfigField<Array<T>>,
  path: string,
  currentEnv: ConfigEnvironment,
): { value: Array<T> | undefined; errors: Array<ConfigValidationError> } {
  const options = field.options as ArrayFieldOptions<T>;
  const errors: Array<ConfigValidationError> = [];

  const defaultValue = getEnvSpecificDefault(options, currentEnv);

  // Check required
  if (options.required && rawValue === undefined) {
    errors.push({
      envVar: field.envVar,
      path,
      code: "MISSING",
      message: `Required environment variable ${field.envVar} is not set`,
      expected: "Comma-separated list",
      hint: options.hint ?? `Add ${field.envVar} to your .env file`,
      example: options.example?.join(options.delimiter ?? ","),
    });
    return { value: undefined, errors };
  }

  // Use default if not set
  if (rawValue === undefined) {
    return { value: defaultValue, errors };
  }

  const delimiter = options.delimiter ?? ",";
  const items = rawValue.split(delimiter).map((s) => s.trim());

  // Convert to numbers if needed
  let value: Array<T>;
  if (options.itemType === "number") {
    const numbers: Array<number> = [];
    for (const item of items) {
      const num = Number(item);
      if (isNaN(num)) {
        errors.push({
          envVar: field.envVar,
          path,
          code: "INVALID_TYPE",
          message: `${field.envVar} contains invalid number: "${item}"`,
          expected: "Comma-separated numbers",
          received: `"${rawValue}"`,
        });
        return { value: undefined, errors };
      }
      numbers.push(num);
    }
    value = numbers as Array<T>;
  } else {
    value = items as Array<T>;
  }

  // Remove duplicates if requested
  if (options.unique) {
    value = [...new Set(value)] as Array<T>;
  }

  // Length validation
  if (options.minLength !== undefined && value.length < options.minLength) {
    errors.push({
      envVar: field.envVar,
      path,
      code: "OUT_OF_RANGE",
      message: `${field.envVar} must have at least ${options.minLength} items`,
      expected: `Array with minimum ${options.minLength} items`,
      received: `Array with ${value.length} items`,
    });
  }

  if (options.maxLength !== undefined && value.length > options.maxLength) {
    errors.push({
      envVar: field.envVar,
      path,
      code: "OUT_OF_RANGE",
      message: `${field.envVar} must have at most ${options.maxLength} items`,
      expected: `Array with maximum ${options.maxLength} items`,
      received: `Array with ${value.length} items`,
    });
  }

  return { value, errors };
}

// ============================================================================
// Main Resolver
// ============================================================================

/**
 * Resolve a single configuration field.
 *
 * @internal
 */
export function resolveField(
  field: ConfigField,
  path: string,
  options: DefineConfigOptions,
): { value: unknown; errors: Array<ConfigValidationError> } {
  const currentEnv = getCurrentEnvironment();

  // Get raw value from environment
  const getEnv =
    options.getEnv ?? ((key: string): string | undefined => process.env[key]);
  const envVar = options.envPrefix
    ? `${options.envPrefix}${field.envVar}`
    : field.envVar;
  const rawValue = getEnv(envVar);

  // Resolve based on type
  switch (field.type) {
    case "string":
      return resolveString(
        rawValue,
        field as ConfigField<string>,
        path,
        currentEnv,
      );
    case "number":
      return resolveNumber(
        rawValue,
        field as ConfigField<number>,
        path,
        currentEnv,
      );
    case "boolean":
      return resolveBoolean(
        rawValue,
        field as ConfigField<boolean>,
        path,
        currentEnv,
      );
    case "enum":
      return resolveEnum(
        rawValue,
        field as ConfigField<string>,
        path,
        currentEnv,
      );
    case "url":
      return resolveUrl(
        rawValue,
        field as ConfigField<string>,
        path,
        currentEnv,
      );
    case "port":
      return resolvePort(
        rawValue,
        field as ConfigField<number>,
        path,
        currentEnv,
      );
    case "secret":
      return resolveSecret(
        rawValue,
        field as ConfigField<string>,
        path,
        currentEnv,
      );
    case "json":
      return resolveJson(rawValue, field, path, currentEnv);
    case "array":
      return resolveArray(
        rawValue,
        field as ConfigField<Array<string | number>>,
        path,
        currentEnv,
      );
    default:
      return { value: undefined, errors: [] };
  }
}

/**
 * Check if a value is a ConfigField.
 */
export function isConfigField(value: unknown): value is ConfigField {
  return (
    typeof value === "object" &&
    value !== null &&
    "envVar" in value &&
    "type" in value
  );
}

/**
 * Resolve entire configuration schema.
 *
 * @internal
 */
export function resolveSchema<T extends Record<string, unknown>>(
  schema: T,
  options: DefineConfigOptions = {},
  basePath: string = "",
): {
  values: Record<string, unknown>;
  errors: Array<ConfigValidationError>;
  warnings: Array<string>;
  fields: Array<{ path: string; field: ConfigField }>;
} {
  const values: Record<string, unknown> = {};
  const errors: Array<ConfigValidationError> = [];
  const warnings: Array<string> = [];
  const fields: Array<{ path: string; field: ConfigField }> = [];

  for (const [key, fieldOrNested] of Object.entries(schema)) {
    const currentPath = basePath ? `${basePath}.${key}` : key;

    if (isConfigField(fieldOrNested)) {
      // It's a field - resolve it
      fields.push({ path: currentPath, field: fieldOrNested });

      const result = resolveField(fieldOrNested, currentPath, options);
      values[key] = result.value;
      errors.push(...result.errors);

      // Check for deprecation warning
      const deprecated = fieldOrNested.options.deprecated;
      if (deprecated) {
        const message =
          typeof deprecated === "string"
            ? deprecated
            : `${fieldOrNested.envVar} is deprecated`;
        warnings.push(`⚠️  ${currentPath}: ${message}`);
      }
    } else if (Array.isArray(fieldOrNested)) {
      // It's a static array - preserve as-is
      values[key] = fieldOrNested;
    } else if (typeof fieldOrNested === "object" && fieldOrNested !== null) {
      // It's a nested object - recurse
      const nestedResult = resolveSchema(
        fieldOrNested as Record<string, unknown>,
        options,
        currentPath,
      );
      values[key] = nestedResult.values;
      errors.push(...nestedResult.errors);
      warnings.push(...nestedResult.warnings);
      fields.push(...nestedResult.fields);
    } else if (
      typeof fieldOrNested === "string" ||
      typeof fieldOrNested === "number" ||
      typeof fieldOrNested === "boolean" ||
      fieldOrNested === null
    ) {
      // It's a static primitive value - preserve as-is
      // This allows static configuration values like file paths, feature flags, etc.
      values[key] = fieldOrNested;
    }
  }

  return { values, errors, warnings, fields };
}
