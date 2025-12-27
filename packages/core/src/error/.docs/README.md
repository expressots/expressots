# Error Handling Documentation

Comprehensive documentation for ExpressoTS error handling system.

## 📚 Documentation Index

### For Application Developers

- **[Error Handling Public API](./error-public-api.md)** - Complete guide to using error handling in your application
  - Creating errors with `AppError`
  - Using `Report` utility
  - Creating custom exception filters
  - Applying filters to routes
  - HTTP status codes

### For Framework Developers

- **[Error Handling Architecture](./architecture.md)** - Internal architecture and design decisions
  - Exception filter registry system
  - Auto-discovery mechanism
  - Filter execution pipeline
  - Error context building

## 🎯 Quick Start

### Creating Errors

```typescript
import { AppError, StatusCode } from "@expressots/core";

// Simple error
throw new AppError("User not found", StatusCode.NotFound);

// With helper methods
throw AppError.notFound("User", "123");
throw AppError.badRequest("Invalid input", { field: "email" });
```

### Creating Exception Filters

```typescript
import { Catch, BaseExceptionFilter, ExceptionContext } from "@expressots/core";

@Catch(AppError)
export class AppErrorFilter extends BaseExceptionFilter {
  catch(exception: AppError, context: ExceptionContext): void {
    this.logError(exception, context);
    this.sendErrorResponse(context, exception.statusCode, exception.toProblemDetails());
  }
}
```

### Applying Filters to Routes

```typescript
import { UseFilters } from "@expressots/core";

@UseFilters(AppErrorFilter)
@controller("/users")
export class UserController {
  @Get("/")
  getUsers() {
    // Filter applies to all methods
  }
}
```

## 📖 Documentation Structure

```
.docs/
├── README.md                    # This file
├── error-public-api.md          # Public API documentation
├── architecture.md              # Framework architecture
├── examples/                    # Runnable examples
│   ├── basic-error.example.ts
│   ├── custom-filter.example.ts
│   └── validation-error.example.ts
└── diagrams/                    # Visual diagrams
    └── error-handling-flow.mermaid
```

## 🔗 Related Documentation

- [Application Bootstrap](../application/.docs/bootstrap-public-api.md) - Application initialization
- [Authorization](../authorization/.docs/authorization-public-api.md) - Authorization guards
- [Dependency Injection](../di/.docs/) - DI container

## 💡 Key Concepts

- **AppError**: Enhanced error class with RFC 7807 support
- **Exception Filters**: Handle specific error types
- **Report**: Utility for creating standardized errors
- **StatusCode**: HTTP status code enumerations
- **Filter Registry**: Auto-discovery of exception filters

