import { AppError, type ProblemDetails } from "../app-error.js";
import { BaseExceptionFilter } from "../base-exception-filter.js";
import type { ExceptionContext } from "../exception-filter.interface.js";
import { Catch } from "../exception-filter-decorators.js";

/**
 * Built-in exception filter for AppError instances.
 * Not auto-registered. Bind it explicitly or use `setErrorHandler({ filters: [AppErrorFilter] })`.
 */
@Catch(AppError)
export class AppErrorFilter extends BaseExceptionFilter {
  catch(exception: AppError, context: ExceptionContext): void {
    this.logError(exception, context);

    const problemDetails: ProblemDetails = exception.toProblemDetails();

    // Set instance to request path if not provided
    if (!problemDetails.instance) {
      problemDetails.instance = context.request.path;
    }

    this.sendErrorResponse(context, exception.statusCode, problemDetails);
  }
}
