# Event System Architecture

> **Internal architecture and design decisions for ExpressoTS event system**

## Overview

The event system provides type-safe, auto-discovered event handling with:
- Type-safe event classes
- Auto-discovery via decorators
- Conditional handlers
- Priority-based execution
- Event replay and flow tracking

## Architecture Components

### 1. Event Registry (`event-registry.ts`)

Central registry for event handlers with auto-discovery support.

**Responsibilities:**
- Register handlers for events
- Discover handlers from container
- Manage handler metadata
- Sort handlers by priority

**Key Methods:**
- `register()` - Register handler for event
- `registerMultiple()` - Register handler for multiple events
- `discover()` - Auto-discover handlers from container
- `getHandlers()` - Get handlers for event

### 2. Event Emitter (`event-emitter.ts`)

Main service for emitting events and executing handlers.

**Responsibilities:**
- Emit events
- Execute handlers in priority order
- Handle async handlers
- Retry failed handlers
- Record events (development mode)
- Track event flow

**Key Methods:**
- `emit()` - Emit event and execute handlers
- `executeHandlers()` - Execute handlers for event
- `recordEvent()` - Record event for replay

### 3. Event Decorators (`event-decorators.ts`)

Decorators for registering event handlers.

**Decorators:**
- `@OnEvent()` - Mark class as handler for event
- `@OnEvents()` - Mark class as handler for multiple events
- `@When()` - Add condition to handler
- `@Event()` - Add metadata to event class

**Metadata Keys:**
- `EVENT_METADATA.EVENT_CLASS` - Event class
- `EVENT_METADATA.EVENT_CLASSES` - Multiple event classes
- `EVENT_METADATA.EVENT_OPTIONS` - Handler options
- `EVENT_METADATA.EVENT_CONDITION` - Condition function
- `EVENT_METADATA.IS_EVENT_HANDLER` - Handler marker

### 4. Event Flow Tracker (`event-flow-tracker.ts`)

Tracks event flow for debugging and visualization.

**Features:**
- Track handler execution
- Measure handler duration
- Build flow graph
- Detect circular dependencies

### 5. Event Recorder (`event-recorder.ts`)

Records events for replay and debugging.

**Features:**
- Record events and handlers
- Store execution results
- Replay recorded events
- Limit recording size

## Data Flow

```
User emits event
    ↓
EventEmitter.emit()
    ↓
EventRegistry.getHandlers()
    ↓
For each handler:
  - Check condition (@When)
  - Execute handler
  - Handle retries
  - Record result
    ↓
Return execution result
```

## Handler Discovery

### Auto-Discovery Process

1. **Container Scan**: Scan container for classes with `@provide()`
2. **Metadata Check**: Check for `@OnEvent()` decorator
3. **Registration**: Register handler in EventRegistry
4. **Priority Sort**: Sort handlers by priority

### Discovery Timing

- **On Application Start**: Discover all handlers at startup
- **Lazy Discovery**: Discover handlers on first emit (optional)
- **Manual Discovery**: Call `registry.discover()` manually

## Handler Execution

### Execution Order

1. **Priority Sort**: Sort handlers by priority (lower = earlier)
2. **Condition Check**: Check `@When()` condition
3. **Handler Execution**: Execute handler (sync or async)
4. **Retry Logic**: Retry on failure (if configured)
5. **Result Recording**: Record execution result

### Async Handling

- **Parallel Execution**: Handlers execute in parallel by default
- **Sequential Execution**: Use `waitForAll: true` for sequential
- **Error Handling**: Continue or stop on error (configurable)

## Conditional Handlers

### Condition Evaluation

1. **Sync Condition**: Evaluate immediately
2. **Async Condition**: Await async condition
3. **Cache Result**: Cache condition result (optional)

### Condition Types

- **Function**: `(event) => boolean`
- **Async Function**: `async (event) => boolean`
- **Options Object**: `{ condition, reason }`

## Priority System

### Priority Values

- **1-10**: Critical handlers (logging, auditing)
- **20-50**: Important handlers (notifications, emails)
- **50-100**: Standard handlers (default)
- **100+**: Low priority handlers (analytics, cleanup)

### Execution Order

Lower priority = earlier execution (wraps later handlers):

```
Priority 1 → Priority 2 → Priority 100
   ↓            ↓              ↓
Handler1    Handler2      Handler100
```

## Event Recording

### Recording Strategy

- **Development Mode**: Record all events
- **Production Mode**: Recording disabled (configurable)
- **Size Limit**: Limit recorded events (default: 1000)

### Recorded Data

```typescript
{
  event: EventInstance,
  timestamp: Date,
  handlers: [
    {
      handler: HandlerClass,
      status: "completed" | "failed" | "skipped",
      duration: number,
      error?: Error
    }
  ]
}
```

## Flow Tracking

### Flow Graph

```typescript
{
  event: "UserCreatedEvent",
  handlers: [
    {
      name: "EmailHandler",
      status: "completed",
      duration: 45,
      dependencies: []
    }
  ],
  totalDuration: 165
}
```

### Circular Dependency Detection

Flow tracker detects circular dependencies:
- Event A triggers Event B
- Event B triggers Event A
- Warning logged, execution continues

## Extension Points

### Custom Event Types

Create custom event base classes:

```typescript
export abstract class DomainEvent {
  readonly timestamp: Date = new Date();
  readonly eventId: string = uuid();
}
```

### Custom Handlers

Create handler base classes:

```typescript
export abstract class BaseEventHandler<T> {
  abstract handle(event: T): Promise<void>;
  
  protected log(event: T) {
    // Common logging logic
  }
}
```

### Custom Registry

Extend EventRegistry for custom behavior:

```typescript
export class CustomEventRegistry extends EventRegistry {
  // Custom registration logic
}
```

## Performance Considerations

1. **Lazy Discovery**: Discover handlers on demand
2. **Handler Caching**: Cache handler instances
3. **Parallel Execution**: Execute handlers in parallel
4. **Condition Caching**: Cache condition results
5. **Recording Overhead**: Disable in production

## Design Decisions

### Why Event Classes?

- **Type Safety**: Full TypeScript support
- **Refactoring**: Safe refactoring with IDE support
- **IntelliSense**: Full autocomplete
- **Documentation**: Self-documenting code

### Why Auto-Discovery?

- **Convenience**: No manual registration
- **Consistency**: Consistent with DI pattern
- **Maintainability**: Less boilerplate

### Why Conditional Handlers?

- **Flexibility**: Run handlers conditionally
- **Performance**: Skip unnecessary handlers
- **Debugging**: Clear condition reasons

### Why Priority System?

- **Control**: Control execution order
- **Predictability**: Predictable handler order
- **Dependencies**: Handle handler dependencies

## Future Enhancements

1. **Event Sourcing**: Full event sourcing support
2. **Event Bus**: Distributed event bus
3. **Event Versioning**: Handle event schema evolution
4. **Event Replay**: Advanced replay capabilities
5. **Event Metrics**: Handler performance metrics

---

**See Also:**
- [Public API](./event-public-api.md) - User-facing documentation
- [Examples](./examples/) - Code examples

