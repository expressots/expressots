# Error Handling Public API

Complete guide to error handling in ExpressoTS applications.

## Table of Contents

- [Quick Start](#quick-start)
- [Creating Errors](#creating-errors)
- [Exception Filters](#exception-filters)
- [HTTP Status Codes](#http-status-codes)
- [Error Reporting](#error-reporting)
- [Advanced Patterns](#advanced-patterns)
- [Troubleshooting](#troubleshooting)

## Quick Start

ExpressoTS provides a comprehensive error handling system with:

- **AppError**: Enhanced error class with RFC 7807 Problem Details support
- **Exception Filters**: Handle specific error types with custom logic
- **Report Utility**: Create standardized errors with helper methods
- **Auto-Discovery**: Filters are automatically discovered and registered

### Basic Usage

```typescript
import { AppError, StatusCode } from "@expressots/core";

// Throw an error
throw new AppError("User not found", StatusCode.NotFound);

// Use helper methods
throw AppError.notFound("User", "123");
throw AppError.badRequest("Invalid input");
```

## Creating Errors

### AppError Class

The `AppError` class extends JavaScript's `Error` with additional properties for HTTP status codes and rich metadata.

#### Constructor

```typescript
new AppError(
  message: string,
  statusCode?: number,
  service?: string,
  options?: AppErrorOptions
)
```

**Parameters:**
- `message`: Error message
- `statusCode`: HTTP status code (default: 500)
- `service`: Service identifier (optional)
- `options`: Additional metadata (optional)

**Options:**
```typescript
interface AppErrorOptions {
  errorCode?: string;              // Application-specific error code
  details?: Record<string, unknown>; // Additional error details
  instance?: string;                // URI reference (RFC 7807)
  type?: string;                    // Problem type URI (RFC 7807)
  validationErrors?: ValidationError[]; // Validation errors
  requestId?: string;               // Request correlation ID
}
```

#### Helper Methods

**Bad Request (400)**
```typescript
AppError.badRequest(message: string, details?: Record<string, unknown>)
```

**Not Found (404)**
```typescript
AppError.notFound(resource: string, id?: string)
```

**Unauthorized (401)**
```typescript
AppError.unauthorized(message?: string)
```

**Forbidden (403)**
```typescript
AppError.forbidden(message?: string)
```

**Validation Failed (422)**
```typescript
AppError.validationFailed(errors: ValidationError[])
```

**Conflict (409)**
```typescript
AppError.conflict(message: string, details?: Record<string, unknown>)
```

#### RFC 7807 Problem Details

Convert errors to RFC 7807 Problem Details format:

```typescript
const error = new AppError("Not found", 404);
const problemDetails = error.toProblemDetails();

// Returns:
// {
//   type: "https://expressots.dev/errors/not-found",
//   title: "Not found",
//   status: 404,
//   timestamp: "2024-01-01T00:00:00.000Z",
//   ...
// }
```

### Examples

**Simple Error**
```typescript
throw new AppError("Internal server error", 500);
```

**Error with Metadata**
```typescript
throw new AppError("User not found", 404, "UserService", {
  errorCode: "USER_NOT_FOUND",
  details: { userId: 123 },
  requestId: "req-abc-123"
});
```

**Validation Error**
```typescript
throw AppError.validationFailed([
  { property: "email", messages: ["Invalid email format"] },
  { property: "age", messages: ["Must be 18 or older"], value: 15 }
]);
```

## Exception Filters

Exception filters allow you to handle specific error types with custom logic.

### Creating Exception Filters

Extend `BaseExceptionFilter` and use the `@Catch()` decorator:

```typescript
import { Catch, BaseExceptionFilter, ExceptionContext } from "@expressots/core";
import { AppError } from "@expressots/core";

@Catch(AppError)
export class AppErrorFilter extends BaseExceptionFilter {
  catch(exception: AppError, context: ExceptionContext): void {
    // Log the error
    this.logError(exception, context);

    // Send response
    const problemDetails = exception.toProblemDetails();
    this.sendErrorResponse(context, exception.statusCode, problemDetails);
  }
}
```

### BaseExceptionFilter Helpers

**logError()**
```typescript
protected logError(exception: Error, context: ExceptionContext): void
```
Logs the error with context information and optional stack trace.

**sendErrorResponse()**
```typescript
protected sendErrorResponse(
  context: ExceptionContext,
  statusCode: number,
  body: unknown
): void
```
Sends an HTTP error response (only if headers not already sent).

**Injected Services**
- `logger`: Logger service for error logging
- `report`: Report service for error reporting

### Exception Context

The `ExceptionContext` provides comprehensive information about the error:

```typescript
interface ExceptionContext {
  request: Request;              // Express request
  response: Response;            // Express response
  next: NextFunction;            // Express next function
  controller?: NewableFunction;  // Controller class
  handler?: string;              // Handler method name
  route?: string;                // Route path
  method?: string;               // HTTP method
  httpContext?: IHttpContext;    // HTTP context
  showStackTrace?: boolean;    // Show stack trace flag
}
```

### Catching Multiple Exception Types

```typescript
@Catch(ValidationError, TypeError)
export class ValidationErrorFilter extends BaseExceptionFilter {
  catch(exception: Error, context: ExceptionContext): void {
    // Handle both ValidationError and TypeError
  }
}
```

### Global Catch-All Filter

```typescript
@Catch()  // No types = catch all exceptions
export class GlobalExceptionFilter extends BaseExceptionFilter {
  catch(exception: Error, context: ExceptionContext): void {
    // Handle all unhandled exceptions
  }
}
```

### Applying Filters to Routes

Use `@UseFilters()` decorator to apply filters at controller or method level:

**Controller-Level**
```typescript
@UseFilters(AppErrorFilter, ValidationErrorFilter)
@controller("/users")
export class UserController {
  @Get("/")
  getUsers() {
    // Both filters apply to all methods
  }
}
```

**Method-Level**
```typescript
@controller("/users")
export class UserController {
  @Get("/:id")
  @UseFilters(NotFoundFilter)  // Only this filter applies
  getUser(@param("id") id: string) {
    // Only NotFoundFilter applies
  }
}
```

**Filter Execution Order:**
1. Method-level filters
2. Controller-level filters
3. Global filters (from registry)

## HTTP Status Codes

Use the `StatusCode` enum for HTTP status codes:

```typescript
import { StatusCode } from "@expressots/core";

// Client errors
StatusCode.BadRequest          // 400
StatusCode.Unauthorized       // 401
StatusCode.Forbidden          // 403
StatusCode.NotFound           // 404
StatusCode.Conflict           // 409
StatusCode.UnprocessableEntity // 422

// Server errors
StatusCode.InternalServerError // 500
StatusCode.BadGateway         // 502
StatusCode.ServiceUnavailable  // 503
```

See [status-code.ts](../status-code.ts) for complete list.

## Error Reporting

The `Report` service provides helper methods for creating standardized errors.

### Injecting Report

```typescript
import { provide, inject } from "@expressots/core";
import { Report } from "@expressots/core";

@provide(UserService)
export class UserService {
  @inject(Report) private report: Report;

  async getUser(id: string) {
    if (!id) {
      throw this.report.badRequest("User ID is required");
    }
    // ...
  }
}
```

### Report Methods

**error()**
```typescript
error(
  error: Error | string | object,
  statusCode?: number,
  service?: string,
  options?: AppErrorOptions
): AppError
```

**Helper Methods**
```typescript
report.badRequest(message: string, details?: Record<string, unknown>)
report.notFound(resource: string, id?: string)
report.unauthorized(message?: string)
report.forbidden(message?: string)
report.validationFailed(errors: ValidationError[])
report.conflict(message: string, details?: Record<string, unknown>)
report.internalServerError(message?: string, service?: string)
```

## Advanced Patterns

### Custom Error Classes

Create custom error classes that extend `AppError`:

```typescript
export class DatabaseError extends AppError {
  constructor(message: string, query?: string) {
    super(message, StatusCode.InternalServerError, "DatabaseService", {
      errorCode: "DATABASE_ERROR",
      details: { query }
    });
  }
}

// Create filter for custom error
@Catch(DatabaseError)
export class DatabaseErrorFilter extends BaseExceptionFilter {
  catch(exception: DatabaseError, context: ExceptionContext): void {
    this.logError(exception, context);
    
    // Custom handling
    this.sendErrorResponse(context, 500, {
      error: "Database operation failed",
      retryable: true
    });
  }
}
```

### Async Exception Filters

Exception filters can be async:

```typescript
@Catch(AppError)
export class AsyncErrorFilter extends BaseExceptionFilter {
  async catch(exception: AppError, context: ExceptionContext): Promise<void> {
    // Async operations
    await this.sendToErrorTracking(exception);
    this.sendErrorResponse(context, exception.statusCode, exception.toProblemDetails());
  }
}
```

### Error Transformation

Transform errors before sending response:

```typescript
@Catch(Error)
export class ErrorTransformerFilter extends BaseExceptionFilter {
  catch(exception: Error, context: ExceptionContext): void {
    // Transform to AppError if needed
    const appError = exception instanceof AppError
      ? exception
      : new AppError(exception.message, 500);

    this.sendErrorResponse(context, appError.statusCode, appError.toProblemDetails());
  }
}
```

### Request Correlation

Include request correlation IDs in errors:

```typescript
@Catch(AppError)
export class CorrelationErrorFilter extends BaseExceptionFilter {
  catch(exception: AppError, context: ExceptionContext): void {
    // Add request ID if not present
    if (!exception.requestId) {
      const requestId = context.request.headers["x-request-id"] as string;
      exception.requestId = requestId;
    }

    this.sendErrorResponse(context, exception.statusCode, exception.toProblemDetails());
  }
}
```

## Troubleshooting

### Filters Not Executing

**Problem:** Exception filters are not being executed.

**Solutions:**
1. Ensure filter is decorated with `@Catch()`
2. Ensure filter extends `BaseExceptionFilter`
3. Check that filter is registered in DI container (use `@provide()`)
4. Verify `ExceptionFilterRegistry.initialize()` is called

### Multiple Filters Executing

**Problem:** Multiple filters are executing for the same error.

**Explanation:** This is expected behavior. Filters execute in order:
1. Method-level filters
2. Controller-level filters
3. Global filters (from registry)

**Solution:** Use `context.response.headersSent` to prevent duplicate responses:

```typescript
catch(exception: Error, context: ExceptionContext): void {
  if (context.response.headersSent) {
    return; // Response already sent
  }
  // Handle error
}
```

### Stack Traces Not Showing

**Problem:** Stack traces are not appearing in logs.

**Solution:** Enable stack traces in exception context:

```typescript
// In bootstrap options
await bootstrap(App, {
  showStackTrace: true  // Enable stack traces
});
```

### Validation Errors Not Formatted

**Problem:** Validation errors are not in the expected format.

**Solution:** Use `AppError.validationFailed()` with proper structure:

```typescript
throw AppError.validationFailed([
  { property: "email", messages: ["Invalid format"] },
  { property: "age", messages: ["Must be 18+"], value: 15 }
]);
```

## Best Practices

1. **Use AppError for all application errors** - Provides consistency and RFC 7807 support
2. **Create specific exception filters** - Handle different error types separately
3. **Use helper methods** - `AppError.notFound()` is clearer than `new AppError(..., 404)`
4. **Include request correlation IDs** - Helps with debugging in distributed systems
5. **Log errors before responding** - Use `logError()` helper
6. **Check headers sent** - Prevent duplicate responses
7. **Use appropriate HTTP status codes** - Follow REST conventions
8. **Provide actionable error messages** - Help users understand what went wrong

