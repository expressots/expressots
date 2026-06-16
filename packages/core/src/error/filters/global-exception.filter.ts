import { StatusCode } from "../status-code.js";
import { BaseExceptionFilter } from "../base-exception-filter.js";
import type { ExceptionContext } from "../exception-filter.interface.js";
import { Catch } from "../exception-filter-decorators.js";

/**
 * Global exception filter that catches all unhandled exceptions.
 * Not auto-registered. Bind it explicitly or use `setErrorHandler({ filters: [GlobalExceptionFilter] })`.
 */
@Catch()
export class GlobalExceptionFilter extends BaseExceptionFilter {
  catch(exception: Error, context: ExceptionContext): void {
    this.logError(exception, context);

    // Don't expose internal errors in production
    const isDevelopment =
      process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";

    const response: Record<string, unknown> = {
      type: "https://expressots.dev/errors/internal-server-error",
      title: isDevelopment ? exception.message : "An unexpected error occurred",
      status: StatusCode.InternalServerError,
      instance: context.request.path,
      timestamp: new Date().toISOString(),
    };

    // Include stack trace in development mode
    if (isDevelopment && exception.stack) {
      response.stack = exception.stack;
    }

    this.sendErrorResponse(context, StatusCode.InternalServerError, response);
  }
}
