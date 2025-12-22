/**
 * Helpful Error Formatter
 * @module @expressots/core/validation
 *
 * Formats validation errors with helpful information including
 * examples, hints, and received values - making debugging easier.
 */

import { provideSingleton } from "../../decorator/scope-binding";
import { ValidationFieldError } from "./validation.interface";

/**
 * Error format options
 */
export type ErrorFormat = "helpful" | "simple" | "rfc7807" | "flat";

/**
 * Formatted error response structure
 */
export interface FormattedErrorResponse {
  type?: string;
  title?: string;
  status: number;
  message?: string;
  detail?: string;
  errors: Array<Record<string, unknown>>;
  documentation?: string;
}

/**
 * Helpful Error Formatter
 *
 * Transforms validation errors into user-friendly formats with
 * examples, hints, and contextual information.
 *
 * @example
 * ```typescript
 * const formatter = new HelpfulErrorFormatter();
 *
 * // Format errors with helpful information
 * const response = formatter.format(errors, "helpful");
 * // Returns:
 * // {
 * //   type: "validation-error",
 * //   title: "Validation Failed",
 * //   status: 400,
 * //   errors: [{
 * //     field: "email",
 * //     message: "Must be a valid email address",
 * //     received: "not-an-email",
 * //     example: "user@example.com",
 * //     hint: "Check for missing @ symbol"
 * //   }]
 * // }
 * ```
 */
@provideSingleton(HelpfulErrorFormatter)
export class HelpfulErrorFormatter {
  private documentationBaseUrl?: string;

  /**
   * Set the base URL for documentation links in error responses
   * @param url - Base URL for API documentation
   */
  setDocumentationUrl(url: string): void {
    this.documentationBaseUrl = url;
  }

  /**
   * Format validation errors into a response object
   * @param errors - Array of validation errors
   * @param format - Output format (helpful, simple, rfc7807, flat)
   * @returns Formatted error response
   */
  format(
    errors: Array<ValidationFieldError>,
    format: ErrorFormat = "helpful",
  ): FormattedErrorResponse {
    switch (format) {
      case "simple":
        return this.formatSimple(errors);
      case "rfc7807":
        return this.formatRfc7807(errors);
      case "flat":
        return this.formatFlat(errors);
      case "helpful":
      default:
        return this.formatHelpful(errors);
    }
  }

  /**
   * Format errors in the "helpful" format with examples and hints
   */
  private formatHelpful(errors: Array<ValidationFieldError>): FormattedErrorResponse {
    return {
      type: "validation-error",
      title: "Validation Failed",
      status: 400,
      detail: this.getSummary(errors),
      errors: errors.map((error) => ({
        field: error.path,
        message: error.message,
        code: error.code,
        received: this.sanitizeValue(error.received),
        expected: error.expected,
        example: error.example,
        hint: error.hint,
      })),
      documentation: this.documentationBaseUrl
        ? `${this.documentationBaseUrl}/errors/validation`
        : undefined,
    };
  }

  /**
   * Format errors in a simple format (just field and message)
   */
  private formatSimple(errors: Array<ValidationFieldError>): FormattedErrorResponse {
    return {
      status: 400,
      message: "Validation failed",
      errors: errors.map((error) => ({
        field: error.path,
        message: error.message,
      })),
    };
  }

  /**
   * Format errors according to RFC 7807 (Problem Details for HTTP APIs)
   */
  private formatRfc7807(errors: Array<ValidationFieldError>): FormattedErrorResponse {
    return {
      type: "https://expressots.com/errors/validation",
      title: "Validation Failed",
      status: 400,
      detail: this.getSummary(errors),
      errors: errors.map((error) => ({
        pointer: `/${error.path.replace(/\./g, "/")}`,
        title: error.message,
        code: error.code || "validation_error",
      })),
    };
  }

  /**
   * Format errors as a flat object (field -> message)
   */
  private formatFlat(errors: Array<ValidationFieldError>): FormattedErrorResponse {
    const errorMap: Record<string, string> = {};
    errors.forEach((error) => {
      if (!errorMap[error.path]) {
        errorMap[error.path] = error.message;
      } else {
        errorMap[error.path] += `, ${error.message}`;
      }
    });

    return {
      status: 400,
      message: "Validation failed",
      errors: Object.entries(errorMap).map(([field, message]) => ({
        field,
        message,
      })),
    };
  }

  /**
   * Generate a human-readable summary of the errors
   */
  private getSummary(errors: Array<ValidationFieldError>): string {
    const count = errors.length;
    if (count === 1) {
      return `1 validation error in field "${errors[0].path}"`;
    }

    const fields = [...new Set(errors.map((e) => e.path))];
    if (fields.length === 1) {
      return `${count} validation errors in field "${fields[0]}"`;
    }

    if (fields.length <= 3) {
      return `${count} validation errors in fields: ${fields.join(", ")}`;
    }

    return `${count} validation errors in ${fields.length} fields`;
  }

  /**
   * Sanitize a value for display in error messages
   * (hide sensitive data, truncate long strings)
   */
  private sanitizeValue(value: unknown): unknown {
    if (value === undefined || value === null) {
      return value;
    }

    if (typeof value === "string") {
      // Check for sensitive field patterns
      if (value.length > 0) {
        // Truncate long strings
        if (value.length > 100) {
          return `${value.substring(0, 100)}... (truncated)`;
        }
      }
      return value;
    }

    if (Array.isArray(value)) {
      if (value.length > 10) {
        return `[Array with ${value.length} items]`;
      }
      return value.slice(0, 10).map((v) => this.sanitizeValue(v));
    }

    if (typeof value === "object") {
      return "[Object]";
    }

    return value;
  }

  /**
   * Create a custom error response with the given format
   * @param errors - Validation errors
   * @param customizer - Function to customize each error
   * @returns Customized error response
   */
  formatCustom(
    errors: Array<ValidationFieldError>,
    customizer: (error: ValidationFieldError) => Record<string, unknown>,
  ): FormattedErrorResponse {
    return {
      status: 400,
      message: "Validation failed",
      errors: errors.map(customizer),
    };
  }

  /**
   * Group errors by field path
   * @param errors - Validation errors
   * @returns Errors grouped by field
   */
  groupByField(errors: Array<ValidationFieldError>): Record<string, Array<ValidationFieldError>> {
    return errors.reduce(
      (acc, error) => {
        if (!acc[error.path]) {
          acc[error.path] = [];
        }
        acc[error.path].push(error);
        return acc;
      },
      {} as Record<string, Array<ValidationFieldError>>,
    );
  }

  /**
   * Get the first error for each field
   * @param errors - Validation errors
   * @returns First error per field
   */
  getFirstErrorPerField(errors: Array<ValidationFieldError>): Array<ValidationFieldError> {
    const seen = new Set<string>();
    return errors.filter((error) => {
      if (seen.has(error.path)) {
        return false;
      }
      seen.add(error.path);
      return true;
    });
  }
}

