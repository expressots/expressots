/**
 * Validation Registry
 * @module @expressots/core/validation
 *
 * Central registry for managing validation adapters
 */

import {
  IValidationAdapter,
  ValidationConfig,
  ValidationFieldError,
  ValidationOptions,
  ValidationResult,
} from "./validation.interface.js";

/**
 * Central registry for validation adapters
 *
 * Manages registered adapters, auto-detection, and validation coordination.
 *
 * @example
 * ```typescript
 * // Register an adapter
 * registry.register(new ClassValidatorAdapter());
 *
 * // Validate with auto-detection
 * const result = await registry.validate(data, CreateUserDTO);
 *
 * // Validate with specific adapter
 * const result = await registry.validate(data, zodSchema, { adapter: "zod" });
 * ```
 */
export class ValidationRegistry {
  private adapters: Map<string, IValidationAdapter> = new Map();
  private sortedAdapters: Array<IValidationAdapter> = [];
  private config: ValidationConfig = {};

  /**
   * Configure the validation registry
   * @param config - Validation configuration
   */
  configure(config: ValidationConfig): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get the current configuration
   */
  getConfig(): ValidationConfig {
    return this.config;
  }

  /**
   * Register a validation adapter
   * @param adapter - The adapter to register
   */
  register(adapter: IValidationAdapter): void {
    this.adapters.set(adapter.name, adapter);
    this.updateSortedAdapters();
  }

  /**
   * Register multiple adapters at once
   * @param adapters - Array of adapters to register
   */
  registerAll(adapters: Array<IValidationAdapter>): void {
    adapters.forEach((adapter) => this.register(adapter));
  }

  /**
   * Unregister an adapter by name
   * @param name - Name of the adapter to remove
   */
  unregister(name: string): boolean {
    const removed = this.adapters.delete(name);
    if (removed) {
      this.updateSortedAdapters();
    }
    return removed;
  }

  /**
   * Get an adapter by name
   * @param name - Name of the adapter
   */
  get(name: string): IValidationAdapter | undefined {
    return this.adapters.get(name);
  }

  /**
   * Get all registered adapters
   */
  getAll(): Array<IValidationAdapter> {
    return Array.from(this.adapters.values());
  }

  /**
   * Check if an adapter is registered
   * @param name - Name of the adapter
   */
  has(name: string): boolean {
    return this.adapters.has(name);
  }

  /**
   * Auto-detect the appropriate adapter for a schema
   * @param schema - The schema to find an adapter for
   * @returns The detected adapter, or undefined if none found
   */
  detect(schema: unknown): IValidationAdapter | undefined {
    return this.sortedAdapters.find((adapter) => adapter.canHandle(schema));
  }

  /**
   * Validate data against a schema
   * @param data - The data to validate
   * @param schema - The schema to validate against
   * @param options - Validation options (can include 'adapter' to force specific adapter)
   * @returns Validation result
   */
  async validate<T = unknown>(
    data: unknown,
    schema: unknown,
    options?: ValidationOptions & { adapter?: string },
  ): Promise<ValidationResult<T>> {
    // Merge with default options
    const mergedOptions = {
      ...this.config.defaultOptions,
      ...options,
    };

    // Get adapter (explicit or auto-detected)
    const adapter = options?.adapter
      ? this.get(options.adapter)
      : this.detect(schema);

    if (!adapter) {
      // No adapter found - return success (backward compatible)
      // This allows validation to be optional when no adapter handles the schema
      return { success: true, data: data as T };
    }

    try {
      const result = await adapter.validate(data, schema, mergedOptions);

      // Call error handler if validation failed
      if (!result.success && result.errors && this.config.onValidationError) {
        this.config.onValidationError(
          result.errors,
          mergedOptions.context || {},
        );
      }

      return result as ValidationResult<T>;
    } catch (error) {
      // Convert unexpected errors to validation errors
      return {
        success: false,
        errors: [
          {
            path: "",
            message:
              error instanceof Error
                ? error.message
                : "Validation failed unexpectedly",
            code: "validation_error",
          },
        ],
      };
    }
  }

  /**
   * Transform data using the appropriate adapter
   * @param data - The data to transform
   * @param schema - The schema defining the transformation
   * @param adapterName - Optional adapter name to use
   * @returns Transformed data
   */
  async transform<T = unknown>(
    data: unknown,
    schema: unknown,
    adapterName?: string,
  ): Promise<T> {
    const adapter = adapterName ? this.get(adapterName) : this.detect(schema);

    if (!adapter?.transform) {
      return data as T;
    }

    return (await adapter.transform(data, schema)) as T;
  }

  /**
   * Format validation errors according to configuration
   * @param errors - Array of validation errors
   * @returns Formatted error response
   */
  formatErrors(errors: Array<ValidationFieldError>): Record<string, unknown> {
    const format = this.config.errorFormat || "helpful";

    switch (format) {
      case "simple":
        return {
          message: "Validation failed",
          errors: errors.map((e) => ({
            field: e.path,
            message: e.message,
          })),
        };

      case "rfc7807":
        return {
          type: "https://expressots.com/errors/validation",
          title: "Validation Failed",
          status: 400,
          detail: `${errors.length} validation error(s) occurred`,
          errors: errors.map((e) => ({
            field: e.path,
            message: e.message,
            code: e.code,
          })),
        };

      case "helpful":
      default:
        return {
          type: "validation-error",
          title: "Validation Failed",
          status: 400,
          errors: errors.map((e) => ({
            field: e.path,
            message: e.message,
            code: e.code,
            received: e.received,
            expected: e.expected,
            example: e.example,
            hint: e.hint,
          })),
        };
    }
  }

  /**
   * Clear all registered adapters
   */
  clear(): void {
    this.adapters.clear();
    this.sortedAdapters = [];
  }

  /**
   * Update the sorted adapters array (sorted by priority, descending)
   */
  private updateSortedAdapters(): void {
    this.sortedAdapters = Array.from(this.adapters.values()).sort(
      (a, b) => b.priority - a.priority,
    );
  }
}
