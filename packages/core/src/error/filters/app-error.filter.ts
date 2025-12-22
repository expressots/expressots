import { provide } from "../../di/binding-decorator";
import { AppError, type ProblemDetails } from "../app-error";
import { BaseExceptionFilter } from "../base-exception-filter";
import type { ExceptionContext } from "../exception-filter.interface";
import { Catch } from "../exception-filter-decorators";

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

