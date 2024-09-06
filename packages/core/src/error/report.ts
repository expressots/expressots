import { provide } from "../di/binding-decorator";
import { Logger } from "../provider/logger/logger.provider";
import { AppError } from "./app-error";

/**
 * Report class is a utility class to manage and log errors within the application.
 * It is responsible for creating a standardized error object, logging it,
 * and then throwing the error for further handling.
 */
@provide(Report)
class Report {
  static stack: string;
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  /**
   * The Error method is responsible for generating a standardized error object,
   * logging the error, and then throwing it for further handling.
   * The error thrown is of the custom type AppError, which extends the built-in Error class.
   *
   * @param error - An instance of Error or a string that describes the error.
   * @param statusCode - The HTTP status code associated with the error (default is 500).
   * @param service - The service name associated with the error. If not specified,
   *                  it defaults to the name of the calling function.
   *
   * @throws An object of the custom type AppError, which includes details about the error.
   */
  public error(
    error: Error | string,
    statusCode?: number,
    service?: string,
  ): AppError {
    let appError: AppError = {} as AppError;

    if (error instanceof Error) {
      appError = new AppError(error.message, statusCode, service);
    } else {
      appError = new AppError(error, statusCode, service);
    }

    this.logger.error(
      appError.message,
      appError.service || "service-undefined",
    );

    return appError;
  }
}

export { Report };
