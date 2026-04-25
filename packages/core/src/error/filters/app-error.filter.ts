import { provide } from "../../di/binding-decorator/index.js";
import { AppError, type ProblemDetails } from "../app-error.js";
import { BaseExceptionFilter } from "../base-exception-filter.js";
import type { ExceptionContext } from "../exception-filter.interface.js";
import { Catch } from "../exception-filter-decorators.js";

/**
 * Built-in exception filter for AppError instances
 * Handles AppError with RFC 7807 Problem Details format
 */
@Catch(AppError)
@provide(AppErrorFilter)
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
