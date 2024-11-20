import { injectable } from "../di/inversify";
import { IProvider } from "../provider";
import { AppError } from "./app-error";

/**
 * Report class is a utility class to manage and log errors within the application.
 * It is responsible for creating a standardized error object, logging it,
 * and then throwing the error for further handling.
 */
@injectable()
export class Report implements IProvider {
  name: string = "Report Provider";
  version: string = "3.0.0";
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
   *
   * @throws An object of the custom type AppError, which includes details about the error.
   */
  public error(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: Error | string | object | any,
    statusCode?: number,
    service?: string,
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

    return new AppError(message, statusCode, service);
  }
}
