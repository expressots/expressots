# Interceptor Public API

> **Complete user-facing documentation for ExpressoTS interceptor system**

## Quick Start

Create interceptors for cross-cutting concerns:

```typescript
import { IInterceptor, ExecutionContext, CallHandler, Interceptor, provide } from "@expressots/core";

@Interceptor({ priority: 1 })
@provide(LoggingInterceptor)
export class LoggingInterceptor implements IInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.getRequest();
    const startTime = Date.now();
    
    console.log(`[${request.method}] ${request.path}`);
    
    const result = await next.handle();
    
    const duration = Date.now() - startTime;
    console.log(`Completed in ${duration}ms`);
    
    return result;
  }
}

// Apply to controller
@UseInterceptors(LoggingInterceptor)
@controller("/users")
export class UserController {
  @Get("/")
  getUsers() {
    return this.userService.findAll();
  }
}
```

## Core Concepts

### Interceptor Pattern

Interceptors implement AOP (Aspect-Oriented Programming) for cross-cutting concerns:
- **Logging**: Log requests and responses
- **Caching**: Cache responses
- **Performance**: Measure execution time
- **Transformation**: Transform requests/responses
- **Error Handling**: Handle errors consistently

### Execution Pipeline

Interceptors execute in a pipeline where each wraps the next:

```
Request → Interceptor1 → Interceptor2 → Handler
                                    ↓
Response ← Interceptor1 ← Interceptor2 ← Result
```

Lower priority interceptors wrap higher priority ones (run first, outermost).

## Creating Interceptors

### Basic Interceptor

```typescript
@Interceptor({ priority: 100 })
@provide(MyInterceptor)
export class MyInterceptor implements IInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler) {
    // Before handler execution
    console.log("Before handler");
    
    const result = await next.handle();
    
    // After handler execution
    console.log("After handler");
    
    return result;
  }
}
```

### Priority System

Control execution order with priorities (lower = earlier, wraps later):

```typescript
@Interceptor({ priority: 1 })
export class FirstInterceptor {}  // Runs first (outermost)

@Interceptor({ priority: 2 })
export class SecondInterceptor {}  // Runs second

@Interceptor({ priority: 100 })
export class LastInterceptor {}  // Runs last (default, innermost)
```

### Transforming Responses

Interceptors can transform responses:

```typescript
@Interceptor({ priority: 50 })
export class ResponseTransformer implements IInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler) {
    const result = await next.handle();
    
    // Transform response
    return {
      data: result,
      timestamp: Date.now(),
      version: "1.0"
    };
  }
}
```

## Execution Context

Access request, response, and container information:

```typescript
async intercept(context: ExecutionContext, next: CallHandler) {
  // Get request
  const request = context.getRequest();
  const method = request.method;
  const path = request.path;
  
  // Get response
  const response = context.getResponse();
  
  // Get container
  const container = context.getContainer();
  
  // Get scoped service
  const userService = context.getScoped(UserService);
  
  // Get controller and handler info
  const controllerClass = context.getClass();
  const handlerName = context.getHandler();
  
  // Get route info
  const route = context.getRoute();
  // { path, method, params, query }
  
  // Store custom data
  context.setData("startTime", Date.now());
  const startTime = context.getData<number>("startTime");
}
```

## Conditional Interceptors

Run interceptors conditionally:

```typescript
import { whenInterceptor } from "@expressots/core";

// Conditional interceptor
const conditionalLogging = whenInterceptor(
  (context) => context.getRequest().path.startsWith("/api"),
  new LoggingInterceptor()
);

@UseInterceptors(conditionalLogging)
@controller("/api")
export class ApiController {}
```

### Conditional with Options

```typescript
const conditional = whenInterceptor({
  condition: (context) => {
    return context.getRequest().headers["x-debug"] === "true";
  },
  interceptor: new DebugInterceptor()
});
```

## Interceptor Composition

Combine multiple interceptors:

```typescript
import { pipeInterceptors } from "@expressots/core";

// Pipe interceptors (sequential)
const pipeline = pipeInterceptors(
  LoggingInterceptor,
  CachingInterceptor,
  PerformanceInterceptor
);

@UseInterceptors(pipeline)
@controller("/users")
export class UserController {}
```

### Combine Mode

Execute interceptors in parallel:

```typescript
import { combineInterceptors } from "@expressots/core";

const combined = combineInterceptors(
  LoggingInterceptor,
  MetricsInterceptor
);
```

## Built-in Interceptors

### Logging Interceptor

```typescript
import { LoggingInterceptor } from "@expressots/core";

@UseInterceptors(LoggingInterceptor)
export class UserController {}
```

### Performance Interceptor

```typescript
import { PerformanceInterceptor } from "@expressots/core";

@UseInterceptors(PerformanceInterceptor)
export class UserController {}
```

### Timeout Interceptor

```typescript
import { TimeoutInterceptor } from "@expressots/core";

@UseInterceptors(new TimeoutInterceptor({ timeout: 5000 }))
export class UserController {}
```

## Applying Interceptors

### Controller Level

```typescript
@UseInterceptors(LoggingInterceptor, PerformanceInterceptor)
@controller("/users")
export class UserController {}
```

### Method Level

```typescript
@controller("/users")
export class UserController {
  @UseInterceptors(CachingInterceptor)
  @Get("/")
  getUsers() {
    return this.userService.findAll();
  }
}
```

### Global Level

```typescript
// In app configuration
app.useGlobalInterceptors(LoggingInterceptor);
```

## Advanced Patterns

### Caching Interceptor

```typescript
@Interceptor({ priority: 20 })
export class CacheInterceptor implements IInterceptor {
  private cache = new Map<string, any>();
  
  async intercept(context: ExecutionContext, next: CallHandler) {
    const key = context.getRequest().url;
    
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    const result = await next.handle();
    this.cache.set(key, result);
    
    return result;
  }
}
```

### Error Handling Interceptor

```typescript
@Interceptor({ priority: 1 })
export class ErrorInterceptor implements IInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler) {
    try {
      return await next.handle();
    } catch (error) {
      // Transform error
      const response = context.getResponse();
      response.status(500).json({
        error: "Internal Server Error",
        message: error.message
      });
      throw error;
    }
  }
}
```

### Authentication Interceptor

```typescript
@Interceptor({ priority: 10 })
export class AuthInterceptor implements IInterceptor {
  constructor(
    @inject(AuthService) private authService: AuthService
  ) {}
  
  async intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.getRequest();
    const token = request.headers.authorization;
    
    if (!token) {
      throw new UnauthorizedError();
    }
    
    const user = await this.authService.validateToken(token);
    context.setData("user", user);
    
    return next.handle();
  }
}
```

## API Reference

### `IInterceptor`

Interface for interceptors.

**Methods:**
- `intercept(context: ExecutionContext, next: CallHandler): Promise<T>` - Intercept execution

**Properties:**
- `priority?: number` - Execution priority (default: 100)

### `ExecutionContext`

Provides access to request context.

**Methods:**
- `getRequest(): Request` - Get Express request
- `getResponse(): Response` - Get Express response
- `getContainer(): Container` - Get DI container
- `getScoped<T>(identifier, scopeName?): T` - Get scoped service
- `getClass(): NewableFunction` - Get controller class
- `getHandler(): string` - Get handler method name
- `getRoute(): RouteInfo` - Get route information
- `getData<T>(key): T | undefined` - Get custom data
- `setData<T>(key, value): void` - Set custom data

### `CallHandler`

Handler for continuing execution.

**Methods:**
- `handle(): Promise<T>` - Execute next interceptor or handler

### `@Interceptor(options)`

Decorator to configure interceptor.

**Options:**
- `priority: number` - Execution priority

### `@UseInterceptors(...interceptors)`

Decorator to apply interceptors to controller or method.

**Parameters:**
- `...interceptors`: Interceptor classes or instances

### `whenInterceptor(condition, interceptor)`

Create conditional interceptor.

**Parameters:**
- `condition`: Condition function
- `interceptor`: Interceptor to conditionally execute

### `pipeInterceptors(...interceptors)`

Create piped interceptor chain.

**Parameters:**
- `...interceptors`: Interceptors to pipe

### `combineInterceptors(...interceptors)`

Create combined interceptor (parallel execution).

**Parameters:**
- `...interceptors`: Interceptors to combine

## Troubleshooting

### Interceptor Not Executing

1. **Check decorators**: Ensure `@Interceptor()` and `@UseInterceptors()` are present
2. **Check priority**: Verify priority is set correctly
3. **Check registration**: Ensure interceptor is registered in container

### Wrong Execution Order

1. **Check priorities**: Lower priority = earlier execution
2. **Check composition**: Verify interceptor composition order

### Context Not Available

1. **Check injection**: Ensure ExecutionContext is injected correctly
2. **Check scope**: Verify request-scoped services are available

## Best Practices

1. **Single Responsibility**: One interceptor, one concern
2. **Use Priorities**: Set appropriate priorities for execution order
3. **Handle Errors**: Wrap interceptor logic in try-catch
4. **Transform Carefully**: Only transform when necessary
5. **Cache Wisely**: Use caching interceptors appropriately
6. **Document Interceptors**: Document what each interceptor does
7. **Test Interceptors**: Write tests for interceptors
8. **Reuse Built-ins**: Use built-in interceptors when possible

---

**See Also:**
- [Architecture Guide](./architecture.md) - Internal implementation
- [Examples](./examples/) - Code examples
- [Middleware](../middleware/.docs/) - Middleware system

