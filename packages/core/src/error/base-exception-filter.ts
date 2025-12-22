import { inject, injectable } from "../di/inversify";
import { Logger } from "../provider/logger/logger.provider";
import { Report } from "./report";
import type { IExceptionFilter, ExceptionContext } from "./exception-filter.interface";

/**
 * Base exception filter with common functionality
 * Provides logging and response helpers for derived filters
 */
@injectable()
export abstract class BaseExceptionFilter implements IExceptionFilter {
  @inject(Logger) protected logger?: Logger;
  @inject(Report) protected report?: Report;

  /**
   * Handles the exception - must be implemented by derived classes
   */
  abstract catch(
    exception: Error,
    context: ExceptionContext,
  ): void | Promise<void>;

  /**
   * Sends an error response
   * @param context - The exception context
   * @param statusCode - HTTP status code
   * @param body - Response body
   */
  protected sendErrorResponse(
    context: ExceptionContext,
    statusCode: number,
    body: unknown,
  ): void {
    if (!context.response.headersSent) {
      context.response.status(statusCode).json(body);
    }
  }

  /**
   * Logs the error
   * @param exception - The exception
   * @param context - The exception context
   */
  protected logError(
    exception: Error,
    context: ExceptionContext,
  ): void {
    const controllerName = context.controller?.name || "unknown";
    const handlerName = context.handler || "unknown";
    const service = context.controller?.name || "exception-filter";

    this.logger?.error(
      `Exception in ${controllerName}.${handlerName}: ${exception.message}`,
      service,
    );

    if (exception.stack) {
      this.logger?.error(exception.stack, service);
    }
  }
}

