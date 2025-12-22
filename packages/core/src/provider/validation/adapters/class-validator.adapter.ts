/**
 * Class-Validator Adapter
 * @module @expressots/core/validation
 *
 * Adapter for class-validator library - wraps existing ValidateDTO logic
 */

import { provide } from "../../../decorator/scope-binding";
import { packageResolver } from "../../dto-validator/package-resolver";
import {
  IValidationAdapter,
  ValidationFieldError,
  ValidationOptions,
  ValidationResult,
} from "../validation.interface";

/**
 * Validation adapter for class-validator library
 *
 * Uses the existing packageResolver pattern to optionally load
 * class-validator and class-transformer packages.
 *
 * @example
 * ```typescript
 * // Register the adapter
 * validationRegistry.register(new ClassValidatorAdapter());
 *
 * // Use with a decorated DTO class
 * class CreateUserDTO {
 *     @IsEmail()
 *     email: string;
 *
 *     @MinLength(2)
 *     name: string;
 * }
 *
 * const result = await adapter.validate(data, CreateUserDTO);
 * ```
 */
@provide(ClassValidatorAdapter)
export class ClassValidatorAdapter
  implements IValidationAdapter<NewableFunction>
{
  readonly name = "class-validator";
  readonly priority = 100; // Highest priority - check first

  // Cache for loaded packages
  private classValidator: unknown = null;
  private classTransformer: unknown = null;
  private packagesLoaded = false;

  /**
   * Check if this adapter can handle the given schema
   * Class-validator works with class constructors that have validation decorators
   */
  canHandle(schema: unknown): boolean {
    // Must be a function (class constructor)
    if (typeof schema !== "function") {
      return false;
    }

    // Check for class-validator metadata
    // class-validator stores metadata using reflect-metadata
    try {
      const metadataStorage = this.getMetadataStorage();
      if (metadataStorage) {
        const targetMetadata = metadataStorage.getTargetValidationMetadatas(
          schema as NewableFunction,
          "",
          false,
          false,
        );
        return targetMetadata && targetMetadata.length > 0;
      }
    } catch {
      // If we can't check metadata, assume it might be a DTO class
      // and let validation proceed (will succeed if no validators)
    }

    // Fallback: check if it looks like a class (has prototype)
    return schema.prototype !== undefined;
  }

  /**
   * Validate data against a class-validator decorated class
   */
  async validate(
    data: unknown,
    schema: NewableFunction,
    options?: ValidationOptions,
  ): Promise<ValidationResult> {
    // Load packages if not already loaded
    await this.ensurePackagesLoaded();

    // If packages aren't available, skip validation (backward compatible)
    if (!this.classValidator || !this.classTransformer) {
      return { success: true, data };
    }

    const cv = this.classValidator as ClassValidatorModule;
    const ct = this.classTransformer as ClassTransformerModule;

    try {
      // Transform plain object to class instance
      const instance = ct.plainToInstance(schema, data, {
        enableImplicitConversion: true,
        groups: options?.group ? [options.group] : undefined,
        excludeExtraneousValues: options?.stripUnknown,
      });

      // Validate the instance
      const errors = await cv.validate(instance as object, {
        groups: options?.group ? [options.group] : undefined,
        skipMissingProperties: options?.partial,
        whitelist: options?.stripUnknown,
        forbidNonWhitelisted: false,
        stopAtFirstError: options?.abortEarly,
      });

      if (errors.length === 0) {
        return { success: true, data: instance };
      }

      return {
        success: false,
        errors: this.mapErrors(errors),
      };
    } catch (error) {
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
   * Transform data without validation
   */
  async transform(data: unknown, schema: NewableFunction): Promise<unknown> {
    await this.ensurePackagesLoaded();

    if (!this.classTransformer) {
      return data;
    }

    const ct = this.classTransformer as ClassTransformerModule;
    return ct.plainToInstance(schema, data, {
      enableImplicitConversion: true,
    });
  }

  /**
   * Map class-validator errors to our ValidationFieldError format
   */
  private mapErrors(
    errors: Array<ClassValidatorError>,
    parentPath = "",
  ): Array<ValidationFieldError> {
    return errors.flatMap((error) => {
      const path = parentPath
        ? `${parentPath}.${error.property}`
        : error.property;

      // Handle nested errors
      if (error.children && error.children.length > 0) {
        return this.mapErrors(error.children, path);
      }

      // Get constraint messages
      const constraints = error.constraints || {};
      const messages = Object.values(constraints);
      const codes = Object.keys(constraints);

      // Create helpful error with example and hint
      const validationError: ValidationFieldError = {
        path,
        message: messages.join(", ") || "Validation failed",
        code: codes[0] || "validation_error",
        received: error.value,
        constraints,
        ...this.getHelpfulInfo(path, codes[0], error.value),
      };

      return [validationError];
    });
  }

  /**
   * Get helpful information (example and hint) based on the error type
   */
  private getHelpfulInfo(
    path: string,
    code: string | undefined,
    value: unknown,
  ): { example?: unknown; hint?: string; expected?: string } {
    const fieldName = path.split(".").pop() || path;

    // Provide helpful info based on common validation codes
    switch (code) {
      case "isEmail":
        return {
          expected: "valid email address",
          example: "user@example.com",
          hint: "Check for missing @ symbol or domain",
        };

      case "isNotEmpty":
        return {
          expected: "non-empty value",
          example: fieldName.toLowerCase().includes("email")
            ? "user@example.com"
            : "example value",
          hint: "This field is required",
        };

      case "minLength":
        return {
          expected: "string with minimum length",
          hint: `Value "${value}" is too short`,
        };

      case "maxLength":
        return {
          expected: "string within maximum length",
          hint: `Value "${value}" is too long`,
        };

      case "isInt":
      case "isNumber":
        return {
          expected: "number",
          example: 42,
          hint: "Remove quotes and non-numeric characters",
        };

      case "isBoolean":
        return {
          expected: "boolean",
          example: true,
          hint: "Use true, false, 1, or 0",
        };

      case "isUUID":
        return {
          expected: "valid UUID",
          example: "550e8400-e29b-41d4-a716-446655440000",
          hint: "UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        };

      case "isUrl":
      case "isURL":
        return {
          expected: "valid URL",
          example: "https://example.com",
          hint: "Include protocol (http:// or https://)",
        };

      case "isPhoneNumber":
        return {
          expected: "valid phone number",
          example: "+1234567890",
          hint: "Include country code",
        };

      case "isDate":
      case "isDateString":
        return {
          expected: "valid date",
          example: "2024-01-15",
          hint: "Use ISO 8601 format (YYYY-MM-DD)",
        };

      case "isArray":
        return {
          expected: "array",
          example: [],
          hint: "Provide an array value",
        };

      default:
        return {};
    }
  }

  /**
   * Ensure class-validator and class-transformer packages are loaded
   */
  private async ensurePackagesLoaded(): Promise<void> {
    if (this.packagesLoaded) {
      return;
    }

    this.classValidator = await packageResolver("class-validator");
    this.classTransformer = await packageResolver("class-transformer");
    this.packagesLoaded = true;
  }

  /**
   * Try to get the class-validator metadata storage
   */
  private getMetadataStorage(): MetadataStorage | null {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const cv = require("class-validator");
      return cv.getMetadataStorage?.() || null;
    } catch {
      return null;
    }
  }
}

// Type definitions for class-validator (to avoid dependency)
interface ClassValidatorError {
  property: string;
  value?: unknown;
  constraints?: Record<string, string>;
  children?: Array<ClassValidatorError>;
}

interface ClassValidatorModule {
  validate(
    object: object,
    options?: {
      groups?: Array<string>;
      skipMissingProperties?: boolean;
      whitelist?: boolean;
      forbidNonWhitelisted?: boolean;
      stopAtFirstError?: boolean;
    },
  ): Promise<Array<ClassValidatorError>>;
}

interface ClassTransformerModule {
  plainToInstance(
    cls: NewableFunction,
    plain: unknown,
    options?: {
      enableImplicitConversion?: boolean;
      groups?: Array<string>;
      excludeExtraneousValues?: boolean;
    },
  ): unknown;
}

interface MetadataStorage {
  getTargetValidationMetadatas(
    target: NewableFunction,
    targetName: string,
    always: boolean,
    strictGroups: boolean,
  ): Array<unknown>;
}

// Type alias for class constructor
type NewableFunction = new (...args: Array<unknown>) => unknown;
