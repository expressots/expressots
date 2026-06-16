import { StatusCode } from "./status-code.js";

/**
 * Validation error structure for detailed validation failures
 */
export interface ValidationError {
  property: string;
  messages: Array<string>;
  value?: unknown;
}

/**
 * RFC 7807 Problem Details structure
 */
export interface ProblemDetails {
  type?: string;
  title: string;
  status: number;
  detail?: string | Record<string, unknown>;
  instance?: string;
  timestamp?: string;
  errorCode?: string;
  service?: string;
  validationErrors?: Array<ValidationError>;
  [key: string]: unknown;
}

/**
 * Options for creating an AppError with enhanced metadata
 */
export interface AppErrorOptions {
  errorCode?: string;
  details?: Record<string, unknown>;
  instance?: string;
  type?: string;
  validationErrors?: Array<ValidationError>;
  requestId?: string;
}

/**
 * Application error class with RFC 7807 Problem Details support.
 *
 * @layer public
 * @audience application-developers
 * @concept error-handling
 * @difficulty beginner
 *
 * @summary Quick Start
 * Create application errors with HTTP status codes and rich metadata.
 *
 * @example
 * ```typescript
 * // Simple error
 * throw new AppError("User not found", 404);
 *
 * // With helper methods
 * throw AppError.notFound("User", "123");
 * throw AppError.badRequest("Invalid input", { field: "email" });
 * ```
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Architecture**
 *
 * AppError extends Error with:
 * - HTTP status code mapping
 * - RFC 7807 Problem Details format
 * - Rich metadata (errorCode, details, validationErrors)
 * - Request correlation (requestId)
 * - Timestamp tracking
 *
 * **Design Decisions**
 * - Extends native Error for stack traces
 * - RFC 7807 compliance for API consistency
 * - Helper methods for common HTTP errors
 * - Validation error support
 *
 * @see {@link StatusCode} for HTTP status codes
 * @see {@link Report} for error reporting utility
 *
 * @layer advanced
 * @audience power-users
 *
 * **Advanced Usage**
 *
 * With validation errors:
 * ```typescript
 * throw AppError.validationFailed([
 *   { property: "email", messages: ["Invalid email format"] },
 *   { property: "age", messages: ["Must be 18 or older"] }
 * ]);
 * ```
 *
 * With custom metadata:
 * ```typescript
 * throw new AppError("Custom error", 400, "MyService", {
 *   errorCode: "CUSTOM_ERROR",
 *   details: { userId: 123 },
 *   requestId: "req-123"
 * });
 * ```
 *
 * @public API
 */
class AppError extends Error {
  /**
   * The HTTP status code associated with the error.
   * Commonly used to define the HTTP response status code.
   */
  public statusCode: number;

  /**
   * The service identifier associated with the error.
   * This property can be used to trace the origin of the error in the application.
   * It is optional and can be left undefined.
   */
  public service?: string;

  /**
   * Application-specific error code for programmatic error handling
   */
  public errorCode?: string;

  /**
   * Additional error context and details
   */
  public details?: Record<string, unknown>;

  /**
   * URI reference that identifies the specific occurrence of the problem (RFC 7807)
   */
  public instance?: string;

  /**
   * A URI reference that identifies the problem type (RFC 7807)
   */
  public type?: string;

  /**
   * Timestamp when the error occurred
   */
  public timestamp: Date;

  /**
   * Request correlation ID for tracing
   */
  public requestId?: string;

  /**
   * Validation errors for validation failures
   */
  public validationErrors?: Array<ValidationError>;

  /**
   * @param {string} message - The error message to be displayed.
   * @param {number} [statusCode=500] - The HTTP status code associated with the error (default: 500).
   * @param {string} [service] - The service identifier associated with the error.
   * @param {AppErrorOptions} [options] - Additional error metadata options.
   */
  constructor(
    message: string,
    statusCode?: number,
    service?: string,
    options?: AppErrorOptions,
  ) {
    super(message);
    this.statusCode = statusCode || StatusCode.InternalServerError;
    if (message === null) {
      this.message = "";
    }
    this.service = service !== undefined ? service : undefined;
    this.errorCode = options?.errorCode;
    this.details = options?.details;
    this.instance = options?.instance;
    this.type =
      options?.type || `https://expressots.dev/errors/${this.statusCode}`;
    this.timestamp = new Date();
    this.requestId = options?.requestId;
    this.validationErrors = options?.validationErrors;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Creates a BadRequest (400) error
   */
  static badRequest(
    message: string,
    details?: Record<string, unknown>,
  ): AppError {
    return new AppError(message, StatusCode.BadRequest, undefined, {
      type: "https://expressots.dev/errors/bad-request",
      details,
    });
  }

  /**
   * Creates a NotFound (404) error
   */
  static notFound(resource: string, id?: string): AppError {
    return new AppError(
      `${resource}${id ? ` with id ${id}` : ""} not found`,
      StatusCode.NotFound,
      undefined,
      {
        type: "https://expressots.dev/errors/not-found",
        details: { resource, id },
      },
    );
  }

  /**
   * Creates an Unauthorized (401) error
   */
  static unauthorized(message: string = "Unauthorized"): AppError {
    return new AppError(message, StatusCode.Unauthorized, undefined, {
      type: "https://expressots.dev/errors/unauthorized",
    });
  }

  /**
   * Creates a Forbidden (403) error
   */
  static forbidden(message: string = "Forbidden"): AppError {
    return new AppError(message, StatusCode.Forbidden, undefined, {
      type: "https://expressots.dev/errors/forbidden",
    });
  }

  /**
   * Creates an UnprocessableEntity (422) validation error
   */
  static validationFailed(errors: Array<ValidationError>): AppError {
    return new AppError(
      "Validation failed",
      StatusCode.UnprocessableEntity,
      undefined,
      {
        type: "https://expressots.dev/errors/validation-failed",
        validationErrors: errors,
      },
    );
  }

  /**
   * Creates a Conflict (409) error
   */
  static conflict(
    message: string,
    details?: Record<string, unknown>,
  ): AppError {
    return new AppError(message, StatusCode.Conflict, undefined, {
      type: "https://expressots.dev/errors/conflict",
      details,
    });
  }

  /**
   * Converts the error to RFC 7807 Problem Details format
   */
  toProblemDetails(): ProblemDetails {
    const problem: ProblemDetails = {
      type: this.type,
      title: this.message,
      status: this.statusCode,
      instance: this.instance,
      timestamp: this.timestamp.toISOString(),
    };

    if (this.errorCode) {
      problem.errorCode = this.errorCode;
    }

    if (this.service) {
      problem.service = this.service;
    }

    if (this.details) {
      problem.detail = this.details;
    }

    if (this.validationErrors) {
      problem.validationErrors = this.validationErrors;
    }

    return problem;
  }
}

export { AppError };
