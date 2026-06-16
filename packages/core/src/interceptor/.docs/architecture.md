# Interceptor Architecture

> **Internal architecture and design decisions for ExpressoTS interceptor system**

## Overview

The interceptor system provides AOP (Aspect-Oriented Programming) capabilities with:
- Pipeline-based execution
- Priority-based ordering
- Conditional execution
- Interceptor composition
- Execution context management

## Architecture Components

### 1. Interceptor Registry (`interceptor-registry.ts`)

Central registry for interceptors.

**Responsibilities:**
- Register interceptors
- Discover interceptors from container
- Manage interceptor metadata
- Sort interceptors by priority

**Key Methods:**
- `register()` - Register interceptor
- `discover()` - Auto-discover interceptors
- `getInterceptors()` - Get interceptors for target

### 2. Interceptor Executor (`interceptor-executor.ts`)

Executes interceptors in pipeline order.

**Responsibilities:**
- Build interceptor pipeline
- Execute interceptors in order
- Handle conditional interceptors
- Handle composed interceptors
- Manage execution flow

**Key Methods:**
- `execute()` - Execute interceptor pipeline
- `buildPipeline()` - Build execution pipeline

### 3. Execution Context (`execution-context.ts`)

Provides access to request context.

**Responsibilities:**
- Provide request/response access
- Provide container access
- Manage scoped services
- Store custom data
- Provide route information

**Implementation:**
- `ExpressExecutionContext` - Express-specific implementation

### 4. Interceptor Decorators (`interceptor-decorators.ts`)

Decorators for configuring interceptors.

**Decorators:**
- `@Interceptor()` - Configure interceptor
- `@UseInterceptors()` - Apply interceptors

**Metadata Keys:**
- `INTERCEPTOR_METADATA.PRIORITY` - Execution priority
- `INTERCEPTOR_METADATA.INTERCEPTOR` - Interceptor class

### 5. Conditional Interceptor (`conditional-interceptor.ts`)

Wrapper for conditional interceptor execution.

**Features:**
- Evaluate condition before execution
- Skip interceptor if condition fails
- Support async conditions

### 6. Interceptor Composition (`interceptor-composition.ts`)

Utilities for composing interceptors.

**Modes:**
- **Pipe**: Sequential execution
- **Combine**: Parallel execution

## Data Flow

```
Request arrives
    ↓
InterceptorExecutor.execute()
    ↓
Build interceptor pipeline
    ↓
Sort by priority (lower = earlier)
    ↓
For each interceptor:
  - Check condition (if conditional)
  - Execute interceptor
  - Pass to next interceptor
    ↓
Execute handler
    ↓
Return through interceptors (reverse order)
    ↓
Return response
```

## Execution Pipeline

### Pipeline Structure

```
Request
  ↓
Interceptor1 (priority: 1) - wraps everything
  ↓
Interceptor2 (priority: 2)
  ↓
Interceptor3 (priority: 100)
  ↓
Handler
  ↓
Interceptor3 (after)
  ↓
Interceptor2 (after)
  ↓
Interceptor1 (after)
  ↓
Response
```

### Priority System

- **Lower Priority = Earlier Execution** (wraps later interceptors)
- **Higher Priority = Later Execution** (wrapped by earlier interceptors)
- **Default Priority = 100**

### Execution Order

1. **Before Phase**: Execute `intercept()` before calling `next.handle()`
2. **Handler Execution**: Execute actual handler
3. **After Phase**: Continue after `next.handle()` returns

## Conditional Execution

### Condition Evaluation

1. **Sync Condition**: Evaluate immediately
2. **Async Condition**: Await async condition
3. **Skip on False**: Skip interceptor if condition fails

### Conditional Types

- **Function**: `(context) => boolean`
- **Async Function**: `async (context) => boolean`
- **Options Object**: `{ condition, reason }`

## Interceptor Composition

### Pipe Mode

Execute interceptors sequentially:

```
Interceptor1 → Interceptor2 → Interceptor3 → Handler
```

### Combine Mode

Execute interceptors in parallel (experimental):

```
Interceptor1 ┐
Interceptor2 ├→ Handler
Interceptor3 ┘
```

## Execution Context

### Context Creation

Context is created per request with:
- Request object
- Response object
- DI container (request-scoped)
- Route information
- Custom data storage

### Scoped Services

Access request-scoped services:

```typescript
const userService = context.getScoped(UserService, "request");
```

### Custom Data

Store and retrieve custom data:

```typescript
context.setData("startTime", Date.now());
const startTime = context.getData<number>("startTime");
```

## Extension Points

### Custom Interceptors

Create custom interceptors:

```typescript
@Interceptor({ priority: 50 })
export class CustomInterceptor implements IInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler) {
    // Custom logic
    return next.handle();
  }
}
```

### Custom Execution Context

Extend ExecutionContext for custom behavior:

```typescript
export class CustomExecutionContext extends ExpressExecutionContext {
  // Custom methods
}
```

### Custom Composition

Create custom composition strategies:

```typescript
export function customCompose(...interceptors) {
  // Custom composition logic
}
```

## Performance Considerations

1. **Lazy Pipeline Building**: Build pipeline on first request
2. **Condition Caching**: Cache condition results
3. **Interceptor Caching**: Cache interceptor instances
4. **Minimal Overhead**: Minimal overhead per interceptor

## Design Decisions

### Why Pipeline Pattern?

- **Flexibility**: Easy to add/remove interceptors
- **Composability**: Interceptors compose naturally
- **Predictability**: Clear execution order

### Why Priority System?

- **Control**: Control execution order
- **Dependencies**: Handle interceptor dependencies
- **Flexibility**: Easy to reorder interceptors

### Why Execution Context?

- **Access**: Access to request/response/container
- **Scoping**: Request-scoped service access
- **Data Sharing**: Share data between interceptors

### Why Conditional Execution?

- **Performance**: Skip unnecessary interceptors
- **Flexibility**: Run interceptors conditionally
- **Debugging**: Clear condition reasons

## Future Enhancements

1. **Async Composition**: Better async composition support
2. **Interceptor Metrics**: Performance metrics for interceptors
3. **Interceptor Testing**: Testing utilities for interceptors
4. **Interceptor Debugging**: Debug tools for interceptor execution

---

**See Also:**
- [Public API](./interceptor-public-api.md) - User-facing documentation
- [Examples](./examples/) - Code examples

