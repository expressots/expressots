# Error Handling Architecture

Internal architecture and design decisions for the ExpressoTS error handling system.

## Table of Contents

- [Overview](#overview)
- [Architecture Components](#architecture-components)
- [Exception Filter Registry](#exception-filter-registry)
- [Filter Execution Pipeline](#filter-execution-pipeline)
- [Error Context Building](#error-context-building)
- [Auto-Discovery Mechanism](#auto-discovery-mechanism)
- [Design Decisions](#design-decisions)
- [Extension Points](#extension-points)

## Overview

The error handling system provides:

1. **AppError**: Enhanced error class with RFC 7807 support
2. **Exception Filters**: Type-safe error handlers
3. **Auto-Discovery**: Automatic filter registration
4. **Filter Registry**: Exception type matching with inheritance
5. **Middleware Integration**: Seamless Express integration

## Architecture Components

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   AppError   │  │    Report    │  │   Filters    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Exception Handler Middleware                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Error Context Builder                               │  │
│  │  - Extract controller/handler                        │  │
│  │  - Build ExceptionContext                            │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Route Filter Resolver                                │  │
│  │  - Method-level filters                              │  │
│  │  - Controller-level filters                          │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Filter Executor                                      │  │
│  │  - Execute filters in order                         │  │
│  │  - Handle async filters                             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Exception Filter Registry                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Filter Storage (Map<ErrorConstructor, Filter[]>) │  │
│  │  - Exception type → Filter instances                │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Filter Discovery                                    │  │
│  │  - Scan Reflect metadata                             │  │
│  │  - Instantiate filters                               │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Exception Matching                                  │  │
│  │  - Exact type match                                  │  │
│  │  - Inheritance traversal                            │  │
│  │  - Global catch-all                                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Exception Filter Registry

### Initialization

The `ExceptionFilterRegistry` initializes filters during application startup:

```typescript
// 1. Scan Reflect metadata for @Catch decorators
const filterMetadata = Reflect.getMetadata(
  EXCEPTION_FILTER_METADATA_KEY.exceptionFilter,
  Reflect
);

// 2. Instantiate filters from DI container or manually
filterMetadata.forEach(({ exceptionTypes, filter }) => {
  const filterInstance = container.isBound(filter)
    ? container.get(filter)
    : new filter();

  // 3. Register filters for each exception type
  exceptionTypes.forEach(type => {
    registry.registerFilter(type, filterInstance);
  });
});
```

### Exception Type Matching

The registry uses inheritance-aware matching:

```typescript
getFilters(exception: Error): IExceptionFilter[] {
  const filters: IExceptionFilter[] = [];
  
  // Walk up prototype chain
  let currentType = exception.constructor;
  while (currentType) {
    if (this.filters.has(currentType)) {
      filters.push(...this.filters.get(currentType));
    }
    currentType = Object.getPrototypeOf(currentType);
  }
  
  // Add global catch-all filters (Error base class)
  if (this.filters.has(Error)) {
    filters.push(...this.filters.get(Error));
  }
  
  return filters;
}
```

**Matching Priority:**
1. Exact type match (highest priority)
2. Parent type match (inheritance)
3. Global catch-all (Error base class)

**Example:**
```typescript
class DatabaseError extends AppError {}
class ConnectionError extends DatabaseError {}

@Catch(DatabaseError)
class DatabaseErrorFilter extends BaseExceptionFilter { }

@Catch(Error)
class GlobalErrorFilter extends BaseExceptionFilter { }

// ConnectionError thrown:
// 1. DatabaseErrorFilter (parent type match)
// 2. GlobalErrorFilter (catch-all)
```

## Filter Execution Pipeline

### Execution Flow

```
Error Thrown
    │
    ▼
ExceptionHandlerMiddleware.handle()
    │
    ├─► Build ExceptionContext
    │   ├─ Extract controller/handler
    │   ├─ Extract route information
    │   └─ Build HTTP context
    │
    ├─► Get Route Filters
    │   ├─ Method-level filters (highest priority)
    │   └─ Controller-level filters
    │
    ├─► Get Exception-Type Filters
    │   └─ From ExceptionFilterRegistry
    │
    ├─► Combine Filters
    │   └─ Route filters + Exception-type filters
    │
    └─► Execute Filters
        ├─ Sequential execution
        ├─ Check headersSent before responding
        └─ Fallback to default handler if no filters
```

### Filter Execution Order

1. **Method-level filters** (from `@UseFilters()` on method)
2. **Controller-level filters** (from `@UseFilters()` on controller)
3. **Exception-type filters** (from `@Catch()` decorator)

**Example:**
```typescript
@UseFilters(ControllerFilter)
@controller("/users")
export class UserController {
  @Get("/:id")
  @UseFilters(MethodFilter)  // Executes first
  getUser() {
    throw new AppError("Error");
  }
}

@Catch(AppError)
class AppErrorFilter extends BaseExceptionFilter {}  // Executes last
```

**Execution Order:**
1. `MethodFilter`
2. `ControllerFilter`
3. `AppErrorFilter`

### Filter Execution Logic

```typescript
async executeFilters(
  filters: IExceptionFilter[],
  error: Error,
  context: ExceptionContext
): Promise<void> {
  for (const filter of filters) {
    // Check if response already sent
    if (context.response.headersSent) {
      break;
    }
    
    // Execute filter (supports async)
    await filter.catch(error, context);
  }
  
  // Fallback if no filter handled the error
  if (!context.response.headersSent) {
    this.defaultHandler(error, context);
  }
}
```

## Error Context Building

### Context Extraction

The middleware extracts context information from the Express request:

```typescript
// 1. Extract from request metadata (most reliable)
let controllerConstructor = req.__expressotsController;
let methodName = req.__expressotsMethod;

// 2. Fallback: Extract from route stack
if (!controllerConstructor) {
  const route = req.route;
  const stack = route.stack;
  
  // Traverse stack to find handler with metadata
  for (let i = stack.length - 1; i >= 0; i--) {
    const handler = stack[i].handle as ExpressoTSHandler;
    if (handler.__expressotsController) {
      controllerConstructor = handler.__expressotsController;
      methodName = handler.__expressotsMethod;
      break;
    }
  }
}

// 3. Build context
const context: ExceptionContext = {
  request: req,
  response: res,
  next,
  controller: controllerConstructor,
  handler: methodName,
  route: req.route?.path,
  method: req.method,
  httpContext: req.httpContext,
  showStackTrace: this.showStackTrace
};
```

### Metadata Attachment

The handler factory attaches metadata to handlers:

```typescript
// In handler factory
handler.__expressotsController = ControllerClass;
handler.__expressotsMethod = methodName;
handler.__expressotsControllerName = ControllerClass.name;
```

## Auto-Discovery Mechanism

### Decorator Metadata

The `@Catch()` decorator stores metadata in Reflect:

```typescript
@Catch(AppError)
class AppErrorFilter extends BaseExceptionFilter {}

// Metadata stored:
Reflect.defineMetadata(
  EXCEPTION_FILTER_METADATA_KEY.exceptionFilter,
  {
    exceptionTypes: [AppError],
    filter: AppErrorFilter
  },
  Reflect  // Global registry
);
```

### Registry Initialization

```typescript
// During application bootstrap
const registry = container.get(ExceptionFilterRegistry);
registry.initialize();

// Scans Reflect metadata
const filterMetadata = Reflect.getMetadata(
  EXCEPTION_FILTER_METADATA_KEY.exceptionFilter,
  Reflect
);

// Instantiates and registers filters
filterMetadata.forEach(({ exceptionTypes, filter }) => {
  const instance = container.isBound(filter)
    ? container.get(filter)
    : new filter();
  
  exceptionTypes.forEach(type => {
    registry.registerFilter(type, instance);
  });
});
```

## Design Decisions

### ADR-001: Exception Filter Pattern

**Decision:** Use decorator-based exception filters instead of try-catch blocks.

**Rationale:**
- Separation of concerns (error handling separate from business logic)
- Reusable error handling logic
- Type-safe error handling
- Consistent error responses

**Alternatives Considered:**
- Try-catch blocks (too verbose, mixed concerns)
- Global error handler only (not flexible enough)
- Middleware-based (less type-safe)

### ADR-002: Inheritance-Aware Matching

**Decision:** Exception filters match based on exception type inheritance.

**Rationale:**
- Handles custom error hierarchies
- Reduces filter duplication
- Follows OOP principles

**Example:**
```typescript
class DatabaseError extends AppError {}
class ConnectionError extends DatabaseError {}

@Catch(DatabaseError)  // Handles DatabaseError and ConnectionError
class DatabaseErrorFilter extends BaseExceptionFilter {}
```

### ADR-003: Filter Execution Order

**Decision:** Execute filters in order: method → controller → global.

**Rationale:**
- Most specific filters execute first
- Allows method-level overrides
- Predictable behavior

### ADR-004: RFC 7807 Problem Details

**Decision:** Use RFC 7807 Problem Details format for error responses.

**Rationale:**
- Standard format for HTTP APIs
- Machine-readable error details
- Consistent error structure

**Implementation:**
```typescript
interface ProblemDetails {
  type?: string;              // Problem type URI
  title: string;              // Human-readable title
  status: number;             // HTTP status code
  detail?: string | object;   // Detailed information
  instance?: string;          // URI reference
  timestamp?: string;         // Error timestamp
  errorCode?: string;         // Application error code
  validationErrors?: ValidationError[];
}
```

### ADR-005: Auto-Discovery vs Manual Registration

**Decision:** Use auto-discovery with optional manual registration.

**Rationale:**
- Reduces boilerplate
- Filters discovered automatically
- Still allows programmatic registration

## Extension Points

### Custom Exception Classes

Create custom exception classes:

```typescript
export class CustomError extends AppError {
  constructor(message: string, customData: unknown) {
    super(message, StatusCode.BadRequest, "CustomService", {
      errorCode: "CUSTOM_ERROR",
      details: { customData }
    });
  }
}
```

### Custom Exception Filters

Create filters for custom exceptions:

```typescript
@Catch(CustomError)
export class CustomErrorFilter extends BaseExceptionFilter {
  catch(exception: CustomError, context: ExceptionContext): void {
    // Custom handling logic
  }
}
```

### Programmatic Filter Registration

Register filters programmatically:

```typescript
const registry = container.get(ExceptionFilterRegistry);
registry.registerFilter([CustomError], new CustomErrorFilter());
```

### Custom Error Context

Extend `ExceptionContext` with custom data:

```typescript
interface CustomExceptionContext extends ExceptionContext {
  customField: string;
}
```

## Performance Considerations

### Filter Caching

- Filters are instantiated once and reused
- Registry uses Map for O(1) lookups
- Exception type matching uses prototype chain traversal (O(depth))

### Memory Usage

- Filters stored in registry Map
- Exception context created per error (short-lived)
- Metadata stored in Reflect (persistent)

### Execution Time

- Filter discovery: O(n) where n = number of filters
- Exception matching: O(depth) where depth = inheritance depth
- Filter execution: O(m) where m = number of matching filters

## Related Code

- [ExceptionHandlerMiddleware](../exception-handler-middleware.ts) - Main middleware
- [ExceptionFilterRegistry](../exception-filter-registry.ts) - Filter registry
- [BaseExceptionFilter](../base-exception-filter.ts) - Base filter class
- [AppError](../app-error.ts) - Error class
- [Exception Filter Decorators](../exception-filter-decorators.ts) - Decorators

