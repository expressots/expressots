import { injectable } from "../di/inversify";
import { IProvider } from "../provider";
import { AppError, type AppErrorOptions, type ValidationError } from "./app-error";
import { StatusCode } from "./status-code";

/**
 * Report class is a utility class to manage and log errors within the application.
 * It is responsible for creating a standardized error object, logging it,
 * and then throwing the error for further handling.
 *
 * Enhanced with helper methods for common error scenarios.
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
  public badRequest(message: string, details?: Record<string, unknown>): AppError {
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
  public conflict(message: string, details?: Record<string, unknown>): AppError {
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
