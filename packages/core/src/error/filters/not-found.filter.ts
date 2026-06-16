import { StatusCode } from "../status-code.js";
import { BaseExceptionFilter } from "../base-exception-filter.js";
import type { ExceptionContext } from "../exception-filter.interface.js";
import { Catch } from "../exception-filter-decorators.js";
import { NotFoundError } from "../not-found.error.js";

/**
 * Built-in exception filter for NotFoundError instances.
 * Not auto-registered. Bind it explicitly or use `setErrorHandler({ filters: [NotFoundFilter] })`.
 */
@Catch(NotFoundError)
export class NotFoundFilter extends BaseExceptionFilter {
  catch(exception: NotFoundError, context: ExceptionContext): void {
    this.logError(exception, context);

    const response = {
      type: "https://expressots.dev/errors/not-found",
      title: exception.message || "Resource not found",
      status: StatusCode.NotFound,
      instance: context.request.path,
      timestamp: new Date().toISOString(),
      ...(exception.details && { detail: exception.details }),
    };

    this.sendErrorResponse(context, StatusCode.NotFound, response);
  }
}
