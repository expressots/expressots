import { StatusCode } from "../status-code.js";
import { BaseExceptionFilter } from "../base-exception-filter.js";
import type { ExceptionContext } from "../exception-filter.interface.js";
import { Catch } from "../exception-filter-decorators.js";
import { ValidationError } from "../validation.error.js";

/**
 * Built-in exception filter for ValidationError instances.
 * Not auto-registered. Bind it explicitly or use `setErrorHandler({ filters: [ValidationErrorFilter] })`.
 */
@Catch(ValidationError)
export class ValidationErrorFilter extends BaseExceptionFilter {
  catch(exception: ValidationError, context: ExceptionContext): void {
    this.logError(exception, context);

    const response = {
      type: "https://expressots.dev/errors/validation-failed",
      title: "Validation Failed",
      status: StatusCode.BadRequest,
      instance: context.request.path,
      timestamp: new Date().toISOString(),
      validationErrors: exception.errors,
    };

    this.sendErrorResponse(context, StatusCode.BadRequest, response);
  }
}
