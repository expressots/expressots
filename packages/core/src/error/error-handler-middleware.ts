import { NextFunction, Request, Response } from "express";
import { AppError } from "./app-error";
import { StatusCode } from "./status-code";
import { beautifyStackTrace } from "./utils";

/**
 * errorHandler is a custom Express error-handling middleware function.
 * It logs the error, sets the status code, and sends a JSON response containing the status code and error message.
 * @param error - An instance of IAppError containing error details.
 * @param req - The Express request object.
 * @param res - The Express response object.
 * @param next - The Express next function for passing control to the next middleware function.
 * @param showStackTrace - A boolean value indicating whether to show the stack trace in the response.
 */
function defaultErrorHandler(
  error: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
  showStackTrace: boolean = false,
): void {
  try {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        statusCode: error.statusCode,
        error: error.message,
      });
    } else {
      res.status(StatusCode.InternalServerError).json({
        statusCode: StatusCode.InternalServerError,
        error: "An unexpected error occurred.",
      });
    }

    if (showStackTrace && error.stack) {
      beautifyStackTrace(error.stack);
    }
  } catch (error) {
    next(error);
  }
}

export default defaultErrorHandler;
