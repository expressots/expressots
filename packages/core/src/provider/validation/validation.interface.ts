/**
 * Validation System Interfaces
 * @module @expressots/core/validation
 *
 * ExpressoTS Smart Validation System - Pluggable adapter architecture
 * supporting multiple validation libraries (class-validator, Zod, Yup, etc.)
 */

/**
 * Result of a validation operation
 */
export interface ValidationResult<T = unknown> {
  /** Whether validation passed */
  success: boolean;
  /** Transformed/validated data (only present if success is true) */
  data?: T;
  /** Validation errors (only present if success is false) */
  errors?: Array<ValidationFieldError>;
}

/**
 * A single validation field error with helpful information
 */
export interface ValidationFieldError {
  /** Path to the invalid field (e.g., "user.email" or "items[0].name") */
  path: string;
  /** Human-readable error message */
  message: string;
  /** Error code for programmatic handling (e.g., "invalid_email", "too_short") */
  code?: string;
  /** The invalid value that was received */
  received?: unknown;
  /** Description of expected value */
  expected?: string;
  /** Example of a valid value */
  example?: unknown;
  /** Helpful hint for fixing the error */
  hint?: string;
  /** Additional constraint information */
  constraints?: Record<string, string>;
}

/**
 * Options for validation
 */
export interface ValidationOptions {
  /** Validation group (e.g., "create", "update", "patch") */
  group?: string;
  /** Partial validation - only validate provided fields (for PATCH) */
  partial?: boolean;
  /** Remove unknown/extra fields from the data */
  stripUnknown?: boolean;
  /** Stop on first error */
  abortEarly?: boolean;
  /** Enable smart field detection based on field names */
  smartDetection?: boolean;
  /** Request context for validation */
  context?: ValidationContext;
}

/**
 * Context available during validation
 */
export interface ValidationContext {
  /** Express request object */
  request?: unknown;
  /** Authenticated principal/user */
  principal?: unknown;
  /** DI container for service access */
  container?: unknown;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Validation adapter interface - implement this to add support for a validation library
 *
 * @example
 * ```typescript
 * @provide(MyValidatorAdapter)
 * export class MyValidatorAdapter implements IValidationAdapter {
 *     readonly name = "my-validator";
 *     readonly priority = 50;
 *
 *     canHandle(schema: unknown): boolean {
 *         return schema instanceof MySchema;
 *     }
 *
 *     async validate(data: unknown, schema: unknown, options?: ValidationOptions): Promise<ValidationResult> {
 *         // Validate using your library
 *     }
 * }
 * ```
 */
export interface IValidationAdapter<TSchema = unknown> {
  /** Unique identifier for this adapter */
  readonly name: string;

  /** Priority for auto-detection (higher = checked first, default: 50) */
  readonly priority: number;

  /**
   * Check if this adapter can handle the given schema
   * @param schema - The schema to check
   * @returns true if this adapter can validate against this schema
   */
  canHandle(schema: unknown): boolean;

  /**
   * Validate data against a schema
   * @param data - The data to validate
   * @param schema - The schema to validate against
   * @param options - Validation options
   * @returns Validation result with success status, data, or errors
   */
  validate(
    data: unknown,
    schema: TSchema,
    options?: ValidationOptions,
  ): Promise<ValidationResult>;

  /**
   * Transform/coerce data without validation (optional)
   * @param data - The data to transform
   * @param schema - The schema defining the transformation
   * @returns Transformed data
   */
  transform?(data: unknown, schema: TSchema): Promise<unknown>;

  /**
   * Extract JSON Schema from the validation schema (optional, for OpenAPI generation)
   * @param schema - The validation schema
   * @returns JSON Schema representation
   */
  extractSchema?(schema: TSchema): Record<string, unknown>;
}

/**
 * Configuration for the validation system
 */
export interface ValidationConfig {
  /** Registered validation adapters */
  adapters?: Array<new (...args: Array<unknown>) => IValidationAdapter>;

  /** Enable smart field detection (email, phone, url patterns) */
  smartDetection?: boolean;

  /**
   * Enable TypeScript-first auto-detection
   * When true, automatically infers validation from TypeScript types
   * (class-validator DTOs, Zod schemas) without explicit schema
   * @default true
   */
  autoDetection?: boolean;

  /** Default validation options */
  defaultOptions?: Partial<ValidationOptions>;

  /** Error response format */
  errorFormat?: "helpful" | "simple" | "rfc7807";

  /** Custom error handler */
  onValidationError?: (
    errors: Array<ValidationFieldError>,
    context: ValidationContext,
  ) => void;
}

/**
 * Smart field detection pattern
 */
export interface SmartFieldPattern {
  /** Pattern name for identification */
  name: string;
  /** Regex patterns to match field names */
  patterns: Array<RegExp>;
  /** Validation function to apply */
  validate: (value: unknown) => ValidationFieldError | null;
  /** Example of valid value */
  example?: unknown;
  /** Hint for fixing errors */
  hint?: string;
}

/**
 * Parameter source types for universal validation
 */
export type ParameterSource = "body" | "query" | "params" | "headers";

/**
 * Metadata stored on decorated parameters for validation
 */
export interface ValidationMetadata {
  /** Parameter index */
  index: number;
  /** Parameter source (body, query, params, headers) */
  source: ParameterSource;
  /** Schema to validate against (optional - will auto-detect if not provided) */
  schema?: unknown;
  /** Validation options */
  options?: ValidationOptions;
  /** Force specific adapter by name */
  adapter?: string;
}
