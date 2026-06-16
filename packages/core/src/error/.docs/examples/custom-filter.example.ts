/**
 * Custom Exception Filter Example
 *
 * This example demonstrates creating and using custom exception filters.
 *
 * @example
 * ```bash
 * # Run this example
 * ts-node examples/custom-filter.example.ts
 * ```
 */

import {
  Catch,
  BaseExceptionFilter,
  ExceptionContext,
  AppError,
  StatusCode,
} from "../index";

// Example 1: Basic custom filter
@Catch(AppError)
export class AppErrorFilter extends BaseExceptionFilter {
  catch(exception: AppError, context: ExceptionContext): void {
    // Log the error
    this.logError(exception, context);

    // Send RFC 7807 Problem Details response
    const problemDetails = exception.toProblemDetails();
    this.sendErrorResponse(context, exception.statusCode, problemDetails);
  }
}

// Example 2: Custom error class
export class DatabaseError extends AppError {
  constructor(message: string, query?: string) {
    super(message, StatusCode.InternalServerError, "DatabaseService", {
      errorCode: "DATABASE_ERROR",
      details: { query },
    });
  }
}

// Example 3: Filter for custom error
@Catch(DatabaseError)
export class DatabaseErrorFilter extends BaseExceptionFilter {
  catch(exception: DatabaseError, context: ExceptionContext): void {
    this.logError(exception, context);

    // Custom handling for database errors
    this.sendErrorResponse(context, 500, {
      error: "Database operation failed",
      message: exception.message,
      retryable: true,
      details: exception.details,
    });
  }
}

// Example 4: Async filter
@Catch(AppError)
export class AsyncErrorFilter extends BaseExceptionFilter {
  async catch(exception: AppError, context: ExceptionContext): Promise<void> {
    // Simulate async operation (e.g., sending to error tracking service)
    await this.sendToErrorTracking(exception);

    this.logError(exception, context);
    this.sendErrorResponse(
      context,
      exception.statusCode,
      exception.toProblemDetails(),
    );
  }

  private async sendToErrorTracking(error: AppError): Promise<void> {
    // Simulate async operation
    return new Promise((resolve) => setTimeout(resolve, 10));
  }
}

// Example 5: Filter with transformation
@Catch(Error)
export class ErrorTransformerFilter extends BaseExceptionFilter {
  catch(exception: Error, context: ExceptionContext): void {
    // Transform to AppError if needed
    const appError =
      exception instanceof AppError
        ? exception
        : new AppError(exception.message, StatusCode.InternalServerError);

    this.logError(appError, context);
    this.sendErrorResponse(
      context,
      appError.statusCode,
      appError.toProblemDetails(),
    );
  }
}

// Example 6: Filter with request correlation
@Catch(AppError)
export class CorrelationErrorFilter extends BaseExceptionFilter {
  catch(exception: AppError, context: ExceptionContext): void {
    // Add request ID if not present
    if (!exception.requestId) {
      const requestId = context.request.headers["x-request-id"] as string;
      if (requestId) {
        exception.requestId = requestId;
      }
    }

    this.logError(exception, context);
    this.sendErrorResponse(
      context,
      exception.statusCode,
      exception.toProblemDetails(),
    );
  }
}

// Example usage
function example() {
  console.log("Custom Exception Filter Examples");
  console.log("=================================");
  console.log("\n1. AppErrorFilter - Handles AppError instances");
  console.log("2. DatabaseErrorFilter - Handles DatabaseError instances");
  console.log("3. AsyncErrorFilter - Async error handling");
  console.log("4. ErrorTransformerFilter - Transforms generic errors");
  console.log("5. CorrelationErrorFilter - Adds request correlation");
}

if (require.main === module) {
  example();
}

export {
  AppErrorFilter,
  DatabaseError,
  DatabaseErrorFilter,
  AsyncErrorFilter,
  ErrorTransformerFilter,
  CorrelationErrorFilter,
};
