# Event System Public API

> **Complete user-facing documentation for ExpressoTS event system**

## Quick Start

Create type-safe events and handlers:

```typescript
import { EventEmitter, OnEvent, provide } from "@expressots/core";

// Define type-safe event
export class UserCreatedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly timestamp: Date = new Date()
  ) {}
}

// Create handler with auto-discovery
@provide(UserCreatedHandler)
@OnEvent(UserCreatedEvent)
export class UserCreatedHandler implements IEventHandler<UserCreatedEvent> {
  constructor(
    @inject(EventEmitter) private eventEmitter: EventEmitter,
    @inject(Logger) private logger: Logger
  ) {}

  handle(event: UserCreatedEvent) {
    this.logger.info(`User ${event.userId} created`);
    // Emit other events, send emails, etc.
  }
}

// Emit events with full type safety
@inject(EventEmitter)
private eventEmitter: EventEmitter;

async createUser(data: CreateUserDto) {
  const user = await this.userRepo.create(data);
  await this.eventEmitter.emit(new UserCreatedEvent(user.id, user.email));
  return user;
}
```

## Core Concepts

### Type-Safe Events

Events are **classes**, not strings! This provides:
- Full type safety
- IntelliSense support
- Refactoring safety
- Compile-time checks

```typescript
// ✅ Good: Type-safe event class
export class UserCreatedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string
  ) {}
}

// ❌ Bad: String-based events (not supported)
eventEmitter.emit("user.created", { userId, email });
```

### Event Handlers

Handlers implement `IEventHandler<T>` and are auto-discovered:

```typescript
@provide(UserCreatedHandler)
@OnEvent(UserCreatedEvent)
export class UserCreatedHandler implements IEventHandler<UserCreatedEvent> {
  handle(event: UserCreatedEvent) {
    // Handle the event
  }
}
```

### Auto-Discovery

Handlers are automatically discovered when:
1. Class has `@provide()` decorator
2. Class has `@OnEvent()` decorator
3. Class implements `IEventHandler<T>`

No manual registration needed!

## Event Handlers

### Basic Handler

```typescript
@provide(EmailHandler)
@OnEvent(UserCreatedEvent)
export class EmailHandler implements IEventHandler<UserCreatedEvent> {
  handle(event: UserCreatedEvent) {
    this.emailService.sendWelcomeEmail(event.email);
  }
}
```

### Async Handler

```typescript
@provide(NotificationHandler)
@OnEvent(UserCreatedEvent, { async: true })
export class NotificationHandler implements IEventHandler<UserCreatedEvent> {
  async handle(event: UserCreatedEvent) {
    await this.notificationService.send(event.userId, "Welcome!");
  }
}
```

### Handler with Retry

```typescript
@provide(ExternalApiHandler)
@OnEvent(UserCreatedEvent, {
  async: true,
  retry: 3,
  retryDelay: 1000,
  backoff: "exponential"
})
export class ExternalApiHandler implements IEventHandler<UserCreatedEvent> {
  async handle(event: UserCreatedEvent) {
    await this.externalApi.createUser(event.userId);
  }
}
```

### Multiple Event Handler

```typescript
@provide(UserActivityHandler)
@OnEvents([UserCreatedEvent, UserUpdatedEvent, UserDeletedEvent])
export class UserActivityHandler {
  handle(event: UserCreatedEvent | UserUpdatedEvent | UserDeletedEvent) {
    this.analytics.trackUserActivity(event);
  }
}
```

## Conditional Handlers

Handlers can run conditionally using `@When()`:

```typescript
@provide(PremiumHandler)
@OnEvent(UserCreatedEvent)
@When(event => event.user.isPremium)
export class PremiumHandler implements IEventHandler<UserCreatedEvent> {
  handle(event: UserCreatedEvent) {
    // Only runs for premium users
    this.premiumService.activateFeatures(event.userId);
  }
}
```

### Conditional with Reason

```typescript
@When({
  condition: event => event.user.region === "EU",
  reason: "GDPR compliance for EU users"
})
export class GDPRHandler {}
```

### Async Condition

```typescript
@When(async event => {
  const features = await featureService.getFeatures(event.userId);
  return features.includes("premium");
})
export class FeatureFlagHandler {}
```

## Priority Execution

Control handler execution order with priorities (lower = earlier):

```typescript
@OnEvent(UserCreatedEvent, { priority: 1 })
export class FirstHandler {}  // Runs first

@OnEvent(UserCreatedEvent, { priority: 2 })
export class SecondHandler {}  // Runs second

@OnEvent(UserCreatedEvent, { priority: 100 })
export class LastHandler {}  // Runs last (default)
```

## Event Metadata

Add metadata to events for documentation and versioning:

```typescript
@Event({
  name: "user.created",
  version: 1,
  description: "Emitted when a new user is created",
  tags: ["user", "auth"]
})
export class UserCreatedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string
  ) {}
}
```

## Event Emitter

### Injecting EventEmitter

```typescript
@provide(UserService)
export class UserService {
  constructor(
    @inject(EventEmitter) private eventEmitter: EventEmitter
  ) {}
}
```

### Emitting Events

```typescript
// Simple emit
await this.eventEmitter.emit(new UserCreatedEvent(userId, email));

// Emit with timeout
await this.eventEmitter.emit(
  new UserCreatedEvent(userId, email),
  { timeout: 5000 }
);

// Emit and wait for all handlers
await this.eventEmitter.emit(new UserCreatedEvent(userId, email));
```

### Emit Options

```typescript
await this.eventEmitter.emit(event, {
  timeout: 30000,        // Timeout for all handlers
  waitForAll: true,      // Wait for all handlers to complete
  continueOnError: false // Stop on first error
});
```

## Event Flow Tracking

Track event flow for debugging and visualization:

```typescript
// Enable flow tracking (development only)
const flow = await eventEmitter.emit(new UserCreatedEvent(userId, email));

// Get flow graph
const graph = flow.getGraph();
// Returns: {
//   event: "UserCreatedEvent",
//   handlers: [
//     { name: "EmailHandler", status: "completed", duration: 45 },
//     { name: "NotificationHandler", status: "completed", duration: 120 }
//   ]
// }
```

## Event Recording

Record events for replay and debugging:

```typescript
// Events are automatically recorded in development mode

// Get recorded events
const recorded = eventEmitter.getRecordedEvents();
// Returns: Array of { event, timestamp, handlers }

// Replay events
await eventEmitter.replay(recorded);
```

## API Reference

### `EventEmitter`

Main event emitter service.

**Methods:**
- `emit<T>(event: T, options?: EmitOptions): Promise<HandlerExecutionResult>` - Emit event
- `getRecordedEvents(): Array<RecordedEvent>` - Get recorded events
- `replay(events: Array<RecordedEvent>): Promise<void>` - Replay events
- `getFlowGraph(event: EventClass): FlowGraph` - Get flow graph

### `@OnEvent(eventClass, options?)`

Decorator to mark class as event handler.

**Parameters:**
- `eventClass`: Event class to handle
- `options`: Handler options (priority, async, retry, etc.)

### `@OnEvents(eventClasses, options?)`

Decorator to mark class as handler for multiple events.

**Parameters:**
- `eventClasses`: Array of event classes
- `options`: Handler options

### `@When(condition | options)`

Decorator to add condition to handler.

**Parameters:**
- `condition`: Condition function or options object

### `@Event(metadata)`

Decorator to add metadata to event class.

**Parameters:**
- `metadata`: Event metadata (name, version, description, tags)

### `IEventHandler<T>`

Interface for event handlers.

**Methods:**
- `handle(event: T): void | Promise<void>` - Handle event

## Troubleshooting

### Handler Not Executing

1. **Check decorators**: Ensure `@provide()` and `@OnEvent()` are present
2. **Check discovery**: Verify handler is discovered (check logs)
3. **Check condition**: If using `@When()`, verify condition returns true

### Events Not Recorded

1. **Check mode**: Recording only enabled in development mode
2. **Check config**: Verify `enableRecording: true` in config

### Type Errors

1. **Check event type**: Ensure handler implements `IEventHandler<EventType>`
2. **Check event class**: Use event class, not string
3. **Check imports**: Ensure all types are imported

## Best Practices

1. **Use event classes**: Always use classes, not strings
2. **Type handlers**: Always implement `IEventHandler<T>`
3. **Use decorators**: Use `@OnEvent()` for auto-discovery
4. **Handle errors**: Wrap handler logic in try-catch
5. **Use priorities**: Set priorities for execution order
6. **Document events**: Use `@Event()` for metadata
7. **Test handlers**: Write tests for event handlers
8. **Keep handlers focused**: One handler, one responsibility

---

**See Also:**
- [Architecture Guide](./architecture.md) - Internal implementation
- [Examples](./examples/) - Code examples
- [Dependency Injection](../di/.docs/) - DI container

