import { provide } from "../../di/binding-decorator";
import { StatusCode } from "../status-code";
import { BaseExceptionFilter } from "../base-exception-filter";
import type { ExceptionContext } from "../exception-filter.interface";
import { Catch } from "../exception-filter-decorators";
import { NotFoundError } from "../not-found.error";

/**
 * Built-in exception filter for NotFoundError instances
 */
@Catch(NotFoundError)
@provide(NotFoundFilter)
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

