import { inject, injectable } from "../di/inversify";
import { Logger } from "../provider/logger/logger.provider";
import { Report } from "./report";
import type {
  IExceptionFilter,
  ExceptionContext,
} from "./exception-filter.interface";
import {
  getErrorHints,
  formatSuggestions,
  getDefaultSuggestionsConfig,
  type SuggestionsConfig,
} from "../provider/logger/logger.suggestions";

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
  protected logError(exception: Error, context: ExceptionContext): void {
    const controllerName = context.controller?.name || "unknown";
    const handlerName = context.handler || "unknown";
    const service = context.controller?.name || "exception-filter";

    this.logger?.error(
      `Exception in ${controllerName}.${handlerName}: ${exception.message}`,
      service,
    );

    // Only log stack trace if showStackTrace is explicitly enabled
    if (context.showStackTrace === true && exception.stack) {
      this.logger?.error(exception.stack, service);
    }

    // Show error suggestions if enabled
    // Get config from logger if available, otherwise use default
    let suggestionsConfig = getDefaultSuggestionsConfig();
    if (this.logger) {
      try {
        const loggerConfig = (this.logger as { getConfig?: () => { suggestions?: Partial<SuggestionsConfig> } }).getConfig?.();
        if (loggerConfig?.suggestions) {
          suggestionsConfig = {
            ...suggestionsConfig,
            ...loggerConfig.suggestions,
          };
        }
      } catch {
        // If getConfig fails, use default config
      }
    }

    if (suggestionsConfig.enabled) {
      const hints = getErrorHints(
        exception,
        {
          path: context.request.path,
          method: context.method,
          statusCode: exception instanceof Error && "statusCode" in exception
            ? (exception as { statusCode: number }).statusCode
            : undefined,
        },
        suggestionsConfig,
      );

      if (hints.length > 0) {
        const suggestionsText = formatSuggestions(hints);
        this.logger?.info(suggestionsText, service);
      }
    }
  }
}
