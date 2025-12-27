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
 * Base exception filter with common functionality.
 *
 * @layer public
 * @audience application-developers
 * @concept exception-filter-base
 * @difficulty intermediate
 *
 * @summary Quick Start
 * Extend this class to create custom exception filters.
 *
 * @example
 * ```typescript
 * @Catch(MyCustomError)
 * export class MyCustomErrorFilter extends BaseExceptionFilter {
 *   catch(exception: MyCustomError, context: ExceptionContext): void {
 *     this.logError(exception, context);
 *     this.sendErrorResponse(context, 400, { message: exception.message });
 *   }
 * }
 * ```
 *
 * **Provided Helpers:**
 * - `logError()` - Logs error with context
 * - `sendErrorResponse()` - Sends HTTP error response
 * - Injected `logger` and `report` services
 *
 * @layer internal
 * @audience framework-developers
 *
 * **Internal Architecture**
 *
 * BaseExceptionFilter provides:
 * - Logger injection for error logging
 * - Report injection for error reporting
 * - Helper methods for common operations
 * - Error suggestions integration
 *
 * **Design Decisions**
 * - Abstract class (must implement `catch()`)
 * - Dependency injection for logger/report
 * - Helper methods reduce boilerplate
 * - Integrates with logger suggestions system
 *
 * @see {@link Catch} for registering filters
 * @see {@link IExceptionFilter} for interface definition
 *
 * @public API
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
        const loggerConfig = (
          this.logger as {
            getConfig?: () => { suggestions?: Partial<SuggestionsConfig> };
          }
        ).getConfig?.();
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
          statusCode:
            exception instanceof Error && "statusCode" in exception
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
