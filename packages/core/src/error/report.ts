import { injectable } from "../di/inversify.js";
import { IProvider } from "../provider/index.js";
import {
  AppError,
  type AppErrorOptions,
  type ValidationError,
} from "./app-error.js";
import { StatusCode } from "./status-code.js";

/**
 * Error reporting utility with helper methods for common error scenarios.
 *
 * @layer public
 * @audience application-developers
 * @concept error-reporting
 * @difficulty beginner
 *
 * @summary Quick Start
 * Use Report to create standardized application errors.
 *
 * @example
 * ```typescript
 * @inject(Report) private report: Report;
 *
 * // Create error
 * throw this.report.error("Something went wrong", 500, "MyService");
 *
 * // Use helper methods
 * throw this.report.badRequest("Invalid input");
 * throw this.report.notFound("User", "123");
 * ```
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Architecture**
 *
 * Report provides:
 * - Standardized error creation
 * - Helper methods for common HTTP errors
 * - AppError factory
 * - Service identification
 *
 * **Design Decisions**
 * - Injectable service (can be injected anywhere)
 * - Helper methods for common scenarios
 * - Wraps AppError creation
 *
 * @see {@link AppError} for error class
 *
 * @public API
 */
@injectable()
export class Report implements IProvider {
  name: string = "Report Provider";
  version: string = "4.0.0";
  author: string = "Richard Zampieri";
  repo: string = "https://github.com/expressots/expressots";

  static stack: string;

  /**
   * The Error method is responsible for generating a standardized error object,
   * logging the error, and then throwing it for further handling.
   * The error thrown is of the custom type AppError, which extends the built-in Error class.
   *
   * @param error - An instance of Error or a string that describes the error.
   * @param statusCode - The HTTP status code associated with the error (default is 500).
   * @param service - The service name associated with the error. If not specified,
   *                  it defaults to the name of the calling function.
   * @param options - Additional error metadata options.
   *
   * @throws An object of the custom type AppError, which includes details about the error.
   */
  public error(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: Error | string | object | any,
    statusCode?: number,
    service?: string,
    options?: AppErrorOptions,
  ): AppError {
    let message = "";

    if (error == null) {
      // error is null or undefined
      message = "";
    } else if (typeof error === "string") {
      message = error;
    } else if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === "object" && "message" in error) {
      message = error.message;
    } else {
      message = String(error);
    }

    return new AppError(message, statusCode, service, options);
  }

  /**
   * Creates a BadRequest (400) error
   * @param message - Error message
   * @param details - Additional error details
   */
  public badRequest(
    message: string,
    details?: Record<string, unknown>,
  ): AppError {
    return AppError.badRequest(message, details);
  }

  /**
   * Creates a NotFound (404) error
   * @param resource - Resource name that was not found
   * @param id - Optional resource ID
   */
  public notFound(resource: string, id?: string): AppError {
    return AppError.notFound(resource, id);
  }

  /**
   * Creates an Unauthorized (401) error
   * @param message - Error message (default: "Unauthorized")
   */
  public unauthorized(message: string = "Unauthorized"): AppError {
    return AppError.unauthorized(message);
  }

  /**
   * Creates a Forbidden (403) error
   * @param message - Error message (default: "Forbidden")
   */
  public forbidden(message: string = "Forbidden"): AppError {
    return AppError.forbidden(message);
  }

  /**
   * Creates an UnprocessableEntity (422) validation error
   * @param errors - Array of validation errors
   */
  public validationFailed(errors: Array<ValidationError>): AppError {
    return AppError.validationFailed(errors);
  }

  /**
   * Creates a Conflict (409) error
   * @param message - Error message
   * @param details - Additional error details
   */
  public conflict(
    message: string,
    details?: Record<string, unknown>,
  ): AppError {
    return AppError.conflict(message, details);
  }

  /**
   * Creates an InternalServerError (500) error
   * @param message - Error message (default: "Internal Server Error")
   * @param service - Service identifier
   */
  public internalServerError(
    message: string = "Internal Server Error",
    service?: string,
  ): AppError {
    return new AppError(message, StatusCode.InternalServerError, service, {
      type: "https://expressots.dev/errors/internal-server-error",
    });
  }
}
