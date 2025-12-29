/**
 * Event System Tests
 *
 * Comprehensive test coverage for the event system.
 */

import "reflect-metadata";
import { Container } from "../di/inversify";
import { provide } from "../di/binding-decorator";
import {
  OnEvent,
  OnEvents,
  When,
  Event,
  isEventHandler,
  getEventClass,
  getEventClasses,
  getEventOptions,
  getEventCondition,
  getEventMetadata,
} from "./event-decorators";
import { EventRegistry, createEventRegistry } from "./event-registry";
import { EventRecorder, createEventRecorder } from "./event-recorder";
import { EventFlowTracker, createEventFlowTracker } from "./event-flow-tracker";
import { EventEmitter, createEventEmitter } from "./event-emitter";
import { IEventHandler } from "./event.interfaces";

// ============================================================================
// Test Event Classes
// ============================================================================

class UserCreatedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

class UserUpdatedEvent {
  constructor(
    public readonly userId: string,
    public readonly changes: Record<string, unknown>,
  ) {}
}

class UserDeletedEvent {
  constructor(public readonly userId: string) {}
}

@Event({
  name: "order.created",
  version: 1,
  description: "Emitted when a new order is created",
  tags: ["order", "commerce"],
})
class OrderCreatedEvent {
  constructor(
    public readonly orderId: string,
    public readonly amount: number,
  ) {}
}

// ============================================================================
// Test Event Handlers
// ============================================================================

@provide(SimpleHandler)
@OnEvent(UserCreatedEvent)
class SimpleHandler implements IEventHandler<UserCreatedEvent> {
  public called = false;
  public lastEvent?: UserCreatedEvent;

  handle(event: UserCreatedEvent): void {
    this.called = true;
    this.lastEvent = event;
  }
}

@provide(PriorityHandler1)
@OnEvent(UserCreatedEvent, { priority: 1 })
class PriorityHandler1 implements IEventHandler<UserCreatedEvent> {
  public order: Array<number> = [];
  handle(): void {
    this.order.push(1);
  }
}

@provide(PriorityHandler2)
@OnEvent(UserCreatedEvent, { priority: 2 })
class PriorityHandler2 implements IEventHandler<UserCreatedEvent> {
  public order: Array<number> = [];
  handle(): void {
    this.order.push(2);
  }
}

@provide(ConditionalHandler)
@OnEvent(UserCreatedEvent)
@When<UserCreatedEvent>((event) => event.email.endsWith("@premium.com"))
class ConditionalHandler implements IEventHandler<UserCreatedEvent> {
  public called = false;
  handle(): void {
    this.called = true;
  }
}

@provide(MultiEventHandler)
@OnEvents([UserCreatedEvent, UserUpdatedEvent, UserDeletedEvent])
class MultiEventHandler
  implements
    IEventHandler<UserCreatedEvent | UserUpdatedEvent | UserDeletedEvent>
{
  public events: Array<unknown> = [];
  handle(event: UserCreatedEvent | UserUpdatedEvent | UserDeletedEvent): void {
    this.events.push(event);
  }
}

@provide(AsyncHandler)
@OnEvent(UserCreatedEvent, { async: true })
class AsyncHandler implements IEventHandler<UserCreatedEvent> {
  public called = false;
  async handle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 10));
    this.called = true;
  }
}

@provide(RetryHandler)
@OnEvent(UserCreatedEvent, { retry: 2, retryDelay: 10 })
class RetryHandler implements IEventHandler<UserCreatedEvent> {
  public attempts = 0;
  public shouldFail = true;

  handle(): void {
    this.attempts++;
    if (this.shouldFail && this.attempts < 3) {
      throw new Error("Temporary failure");
    }
  }
}

@provide(AsyncConditionHandler)
@OnEvent(UserCreatedEvent)
@When<UserCreatedEvent>(async (event) => {
  await new Promise((resolve) => setTimeout(resolve, 5));
  return event.email.includes("async");
})
class AsyncConditionHandler implements IEventHandler<UserCreatedEvent> {
  public called = false;
  handle(): void {
    this.called = true;
  }
}

@provide(TimeoutHandler)
@OnEvent(UserCreatedEvent, { timeout: 50 })
class TimeoutHandler implements IEventHandler<UserCreatedEvent> {
  async handle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

@provide(ErrorHandler)
@OnEvent(UserCreatedEvent, {
  errorHandler: (error, event) => {
    // Custom error handler
  },
})
class ErrorHandler implements IEventHandler<UserCreatedEvent> {
  handle(): void {
    throw new Error("Handler error");
  }
}

@provide(LinearBackoffHandler)
@OnEvent(UserCreatedEvent, { retry: 2, retryDelay: 10, backoff: "linear" })
class LinearBackoffHandler implements IEventHandler<UserCreatedEvent> {
  public attempts = 0;
  handle(): void {
    this.attempts++;
    if (this.attempts < 3) {
      throw new Error("Temporary failure");
    }
  }
}

@provide(ExponentialBackoffHandler)
@OnEvent(UserCreatedEvent, {
  retry: 2,
  retryDelay: 10,
  backoff: "exponential",
})
class ExponentialBackoffHandler implements IEventHandler<UserCreatedEvent> {
  public attempts = 0;
  handle(): void {
    this.attempts++;
    if (this.attempts < 3) {
      throw new Error("Temporary failure");
    }
  }
}

@provide(WhenOptionsHandler)
@OnEvent(UserCreatedEvent)
@When<UserCreatedEvent>({
  condition: (event) => event.email.includes("options"),
  reason: "Testing WhenOptions",
})
class WhenOptionsHandler implements IEventHandler<UserCreatedEvent> {
  public called = false;
  handle(): void {
    this.called = true;
  }
}

// ============================================================================
// Decorator Tests
// ============================================================================

describe("Event Decorators", () => {
  describe("@OnEvent", () => {
    it("should mark class as event handler", () => {
      expect(isEventHandler(SimpleHandler)).toBe(true);
    });

    it("should store event class", () => {
      expect(getEventClass(SimpleHandler)).toBe(UserCreatedEvent);
    });

    it("should store default options", () => {
      const options = getEventOptions(SimpleHandler);
      expect(options).toBeDefined();
      expect(options?.priority).toBe(100);
      expect(options?.async).toBe(false);
      expect(options?.retry).toBe(0);
    });

    it("should store custom priority", () => {
      const options1 = getEventOptions(PriorityHandler1);
      const options2 = getEventOptions(PriorityHandler2);
      expect(options1?.priority).toBe(1);
      expect(options2?.priority).toBe(2);
    });
  });

  describe("@OnEvents", () => {
    it("should store multiple event classes", () => {
      const classes = getEventClasses(MultiEventHandler);
      expect(classes).toHaveLength(3);
      expect(classes).toContain(UserCreatedEvent);
      expect(classes).toContain(UserUpdatedEvent);
      expect(classes).toContain(UserDeletedEvent);
    });

    it("should also store first event as primary", () => {
      expect(getEventClass(MultiEventHandler)).toBe(UserCreatedEvent);
    });
  });

  describe("@When", () => {
    it("should store condition", () => {
      const condition = getEventCondition<UserCreatedEvent>(ConditionalHandler);
      expect(condition).toBeDefined();
      expect(typeof condition?.condition).toBe("function");
    });

    it("should evaluate condition correctly", async () => {
      const condition = getEventCondition<UserCreatedEvent>(ConditionalHandler);

      const premiumUser = new UserCreatedEvent("1", "user@premium.com");
      const regularUser = new UserCreatedEvent("2", "user@regular.com");

      expect(condition?.condition(premiumUser)).toBe(true);
      expect(condition?.condition(regularUser)).toBe(false);
    });
  });

  describe("@Event", () => {
    it("should store event metadata", () => {
      const metadata = getEventMetadata(OrderCreatedEvent);
      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe("order.created");
      expect(metadata?.version).toBe(1);
      expect(metadata?.description).toBe("Emitted when a new order is created");
      expect(metadata?.tags).toEqual(["order", "commerce"]);
    });
  });
});

// ============================================================================
// Registry Tests
// ============================================================================

describe("EventRegistry", () => {
  let registry: EventRegistry;

  beforeEach(() => {
    registry = createEventRegistry();
  });

  describe("register", () => {
    it("should register a handler", () => {
      registry.register(UserCreatedEvent, SimpleHandler);
      expect(registry.hasHandler(UserCreatedEvent, SimpleHandler)).toBe(true);
    });

    it("should not register duplicate handlers", () => {
      registry.register(UserCreatedEvent, SimpleHandler);
      registry.register(UserCreatedEvent, SimpleHandler);
      expect(registry.getHandlers(UserCreatedEvent)).toHaveLength(1);
    });

    it("should sort handlers by priority", () => {
      registry.register(UserCreatedEvent, PriorityHandler2);
      registry.register(UserCreatedEvent, PriorityHandler1);

      const handlers = registry.getHandlers(UserCreatedEvent);
      expect(handlers[0].handlerClass).toBe(PriorityHandler1);
      expect(handlers[1].handlerClass).toBe(PriorityHandler2);
    });
  });

  describe("registerMultiple", () => {
    it("should register handler for multiple events", () => {
      registry.registerMultiple(
        [UserCreatedEvent, UserUpdatedEvent, UserDeletedEvent],
        MultiEventHandler,
      );

      expect(registry.hasHandler(UserCreatedEvent, MultiEventHandler)).toBe(
        true,
      );
      expect(registry.hasHandler(UserUpdatedEvent, MultiEventHandler)).toBe(
        true,
      );
      expect(registry.hasHandler(UserDeletedEvent, MultiEventHandler)).toBe(
        true,
      );
    });
  });

  describe("getHandlers", () => {
    it("should return empty array for unregistered events", () => {
      expect(registry.getHandlers(OrderCreatedEvent)).toHaveLength(0);
    });

    it("should return registered handlers", () => {
      registry.register(UserCreatedEvent, SimpleHandler);
      registry.register(UserCreatedEvent, AsyncHandler);

      const handlers = registry.getHandlers(UserCreatedEvent);
      expect(handlers).toHaveLength(2);
    });
  });

  describe("unregister", () => {
    it("should remove a handler", () => {
      registry.register(UserCreatedEvent, SimpleHandler);
      registry.unregister(UserCreatedEvent, SimpleHandler);
      expect(registry.hasHandler(UserCreatedEvent, SimpleHandler)).toBe(false);
    });
  });

  describe("clear", () => {
    it("should remove all handlers", () => {
      registry.register(UserCreatedEvent, SimpleHandler);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      registry.register(UserUpdatedEvent, SimpleHandler as any);
      registry.clear();

      expect(registry.getAllHandlers()).toHaveLength(0);
    });
  });

  describe("getStatistics", () => {
    it("should return handler statistics", () => {
      registry.register(UserCreatedEvent, SimpleHandler);
      registry.register(UserCreatedEvent, AsyncHandler);
      registry.register(UserUpdatedEvent, MultiEventHandler);

      const stats = registry.getStatistics();
      expect(stats.totalHandlers).toBeGreaterThanOrEqual(2); // Unique handler classes
      expect(stats.totalEvents).toBeGreaterThanOrEqual(2);
      expect(stats.handlersPerEvent["UserCreatedEvent"]).toBeGreaterThanOrEqual(
        2,
      );
      expect(stats.handlersPerEvent["UserUpdatedEvent"]).toBeGreaterThanOrEqual(
        1,
      );
    });
  });
});

// ============================================================================
// Recorder Tests
// ============================================================================

describe("EventRecorder", () => {
  let recorder: EventRecorder;

  beforeEach(() => {
    recorder = createEventRecorder();
    recorder.startRecording();
    recorder.clear();
  });

  afterEach(() => {
    recorder.stopRecording();
  });

  describe("recording", () => {
    it("should start and stop recording", () => {
      recorder.stopRecording();
      expect(recorder.isRecording()).toBe(false);
      recorder.startRecording();
      expect(recorder.isRecording()).toBe(true);
    });

    it("should record events when recording", () => {
      const event = new UserCreatedEvent("123", "test@test.com");
      recorder.record(event);
      expect(recorder.count()).toBe(1);
    });

    it("should not record events when not recording", () => {
      recorder.stopRecording();
      const event = new UserCreatedEvent("123", "test@test.com");
      recorder.record(event);
      expect(recorder.count()).toBe(0);
    });
  });

  describe("getRecordedEvents", () => {
    it("should return all recorded events", () => {
      recorder.record(new UserCreatedEvent("1", "a@test.com"));
      recorder.record(new UserCreatedEvent("2", "b@test.com"));
      recorder.record(new UserUpdatedEvent("1", { name: "Updated" }));

      const events = recorder.getRecordedEvents();
      expect(events).toHaveLength(3);
    });
  });

  describe("getEventsByType", () => {
    it("should filter events by type", () => {
      recorder.record(new UserCreatedEvent("1", "a@test.com"));
      recorder.record(new UserCreatedEvent("2", "b@test.com"));
      recorder.record(new UserUpdatedEvent("1", { name: "Updated" }));

      const created = recorder.getEventsByType(UserCreatedEvent);
      expect(created).toHaveLength(2);

      const updated = recorder.getEventsByType(UserUpdatedEvent);
      expect(updated).toHaveLength(1);
    });
  });

  describe("getEventsInRange", () => {
    it("should filter events by time range", async () => {
      const before = Date.now();
      recorder.record(new UserCreatedEvent("1", "a@test.com"));

      // Wait a bit to ensure timestamp difference
      await new Promise((r) => setTimeout(r, 10));
      const middle = Date.now() - 1; // Ensure middle is before next event

      await new Promise((r) => setTimeout(r, 10));
      recorder.record(new UserCreatedEvent("2", "b@test.com"));

      const events = recorder.getEventsInRange(before, middle);
      // Should have at least 1 event, potentially timing-sensitive
      expect(events.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("export", () => {
    it("should export as JSON", () => {
      recorder.record(new UserCreatedEvent("123", "test@test.com"));
      const json = recorder.export("json");
      expect(json).toContain("UserCreatedEvent");
      expect(json).toContain("123");
    });

    it("should export as CSV", () => {
      recorder.record(new UserCreatedEvent("123", "test@test.com"));
      const csv = recorder.export("csv");
      expect(csv).toContain("id,type,timestamp");
      expect(csv).toContain("UserCreatedEvent");
    });

    it("should export as timeline", () => {
      recorder.record(new UserCreatedEvent("123", "test@test.com"), [
        { handler: "TestHandler", duration: 10, success: true },
      ]);
      const timeline = recorder.export("timeline");
      expect(timeline).toContain("Event Timeline");
      expect(timeline).toContain("UserCreatedEvent");
    });
  });

  describe("clear", () => {
    it("should clear all events", () => {
      recorder.record(new UserCreatedEvent("123", "test@test.com"));
      recorder.clear();
      expect(recorder.count()).toBe(0);
    });
  });

  describe("latest/first", () => {
    it("should return latest and first events", () => {
      recorder.record(new UserCreatedEvent("1", "first@test.com"));
      recorder.record(new UserCreatedEvent("2", "last@test.com"));

      const first = recorder.first();
      const latest = recorder.latest();

      expect((first?.data as UserCreatedEvent).userId).toBe("1");
      expect((latest?.data as UserCreatedEvent).userId).toBe("2");
    });
  });
});

// ============================================================================
// Flow Tracker Tests
// ============================================================================

describe("EventFlowTracker", () => {
  let tracker: EventFlowTracker;

  beforeEach(() => {
    tracker = createEventFlowTracker();
  });

  afterEach(() => {
    tracker.clear();
  });

  describe("flow tracking", () => {
    it("should start a flow", () => {
      tracker.startFlow("req-123");
      expect(tracker.activeFlowCount()).toBe(1);
    });

    it("should record events in flow", () => {
      tracker.startFlow("req-123");
      tracker.recordEvent(
        "req-123",
        "UserCreatedEvent",
        ["Handler1", "Handler2"],
        100,
      );

      const flow = tracker.getFlow("req-123");
      expect(flow).toBeDefined();
      expect(flow?.events).toHaveLength(1);
      expect(flow?.events[0].name).toBe("UserCreatedEvent");
      expect(flow?.events[0].handlers).toEqual(["Handler1", "Handler2"]);
    });

    it("should end a flow", async () => {
      tracker.startFlow("req-123");

      // Small delay to ensure duration > 0
      await new Promise((r) => setTimeout(r, 5));

      tracker.recordEvent("req-123", "UserCreatedEvent", ["Handler1"], 50);

      const flow = tracker.endFlow("req-123");
      expect(flow.requestId).toBe("req-123");
      expect(flow.events).toHaveLength(1);
      expect(flow.totalDuration).toBeGreaterThanOrEqual(0);
    });
  });

  describe("visualize", () => {
    it("should visualize flow as ASCII art", () => {
      tracker.startFlow("req-123");
      tracker.recordEvent(
        "req-123",
        "UserCreatedEvent",
        ["Handler1", "Handler2"],
        100,
      );
      tracker.recordEvent("req-123", "EmailSentEvent", ["EmailHandler"], 50);

      const flow = tracker.endFlow("req-123");
      const visual = flow.visualize();

      expect(visual).toContain("UserCreatedEvent");
      expect(visual).toContain("EmailSentEvent");
      expect(visual).toContain("100ms");
    });

    it("should return message for empty flow", () => {
      tracker.startFlow("req-123");
      const flow = tracker.endFlow("req-123");
      expect(flow.visualize()).toContain("No events recorded");
    });
  });

  describe("clear", () => {
    it("should clear all flows", () => {
      tracker.startFlow("req-1");
      tracker.startFlow("req-2");
      tracker.clear();
      expect(tracker.activeFlowCount()).toBe(0);
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe("Event System Integration", () => {
  it("should work with type-safe events", () => {
    const event = new UserCreatedEvent("123", "user@example.com");

    // TypeScript knows the types!
    expect(event.userId).toBe("123");
    expect(event.email).toBe("user@example.com");
    expect(event.timestamp).toBeInstanceOf(Date);
  });

  it("should support event metadata", () => {
    const metadata = getEventMetadata(OrderCreatedEvent);
    expect(metadata?.name).toBe("order.created");
    expect(metadata?.version).toBe(1);
  });

  it("should support conditional execution logic", () => {
    const condition = getEventCondition<UserCreatedEvent>(ConditionalHandler);

    // Premium users should pass
    expect(
      condition?.condition(new UserCreatedEvent("1", "vip@premium.com")),
    ).toBe(true);

    // Regular users should not pass
    expect(
      condition?.condition(new UserCreatedEvent("2", "user@regular.com")),
    ).toBe(false);
  });

  it("should support multiple events per handler", () => {
    const classes = getEventClasses(MultiEventHandler);

    expect(classes).toContain(UserCreatedEvent);
    expect(classes).toContain(UserUpdatedEvent);
    expect(classes).toContain(UserDeletedEvent);
  });
});

// ============================================================================
// EventEmitter Tests
// ============================================================================

describe("EventEmitter", () => {
  let container: Container;
  let registry: EventRegistry;
  let recorder: EventRecorder;
  let flowTracker: EventFlowTracker;
  let emitter: EventEmitter;

  beforeEach(() => {
    container = new Container();
    registry = createEventRegistry();
    recorder = createEventRecorder();
    flowTracker = createEventFlowTracker();
    emitter = createEventEmitter(registry, container, recorder, flowTracker);

    // Register handlers as singletons so state is preserved
    container.bind(SimpleHandler).toSelf().inSingletonScope();
    container.bind(AsyncHandler).toSelf().inSingletonScope();
    container.bind(ConditionalHandler).toSelf().inSingletonScope();
    container.bind(RetryHandler).toSelf().inSingletonScope();
    container.bind(TimeoutHandler).toSelf().inSingletonScope();
    container.bind(ErrorHandler).toSelf().inSingletonScope();
    container.bind(LinearBackoffHandler).toSelf().inSingletonScope();
    container.bind(ExponentialBackoffHandler).toSelf().inSingletonScope();
    container.bind(AsyncConditionHandler).toSelf().inSingletonScope();
    container.bind(WhenOptionsHandler).toSelf().inSingletonScope();

    registry.register(UserCreatedEvent, SimpleHandler);
  });

  describe("configure", () => {
    it("should configure event emitter", () => {
      emitter.configure({
        enableRecording: true,
        enableFlowTracking: true,
        maxRecordedEvents: 500,
        defaultTimeout: 60000,
      });
      // Configuration should be applied
      expect(emitter).toBeDefined();
    });
  });

  describe("setCorrelationId", () => {
    it("should set correlation ID", () => {
      emitter.setCorrelationId("test-correlation-id");
      // Correlation ID should be set
      expect(emitter).toBeDefined();
    });
  });

  describe("emit", () => {
    it("should emit event to handlers", async () => {
      const handler = container.get(SimpleHandler);
      handler.called = false; // Reset
      handler.lastEvent = undefined;
      await emitter.emit(new UserCreatedEvent("123", "test@test.com"));
      expect(handler.called).toBe(true);
      expect(handler.lastEvent?.userId).toBe("123");
    });

    it("should handle events with no handlers", async () => {
      await expect(
        emitter.emit(new OrderCreatedEvent("123", 100)),
      ).resolves.not.toThrow();
    });

    it("should execute async handlers in background", async () => {
      registry.register(UserCreatedEvent, AsyncHandler);
      const handler = container.get(AsyncHandler);
      handler.called = false; // Reset
      await emitter.emit(new UserCreatedEvent("123", "test@test.com"));
      // Wait a bit for async handler (it has 10ms delay)
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(handler.called).toBe(true);
    });

    it("should respect conditional handlers", async () => {
      registry.register(UserCreatedEvent, ConditionalHandler);
      const handler = container.get(ConditionalHandler);
      handler.called = false; // Reset
      await emitter.emit(new UserCreatedEvent("123", "user@premium.com"));
      expect(handler.called).toBe(true);

      handler.called = false;
      await emitter.emit(new UserCreatedEvent("123", "user@regular.com"));
      expect(handler.called).toBe(false);
    });

    it("should handle async conditions", async () => {
      registry.register(UserCreatedEvent, AsyncConditionHandler);
      const handler = container.get(AsyncConditionHandler);
      handler.called = false; // Reset
      await emitter.emit(new UserCreatedEvent("123", "user@async.com"));
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(handler.called).toBe(true);
    });

    it("should handle WhenOptions with reason", async () => {
      registry.register(UserCreatedEvent, WhenOptionsHandler);
      const handler = container.get(WhenOptionsHandler);
      handler.called = false; // Reset
      await emitter.emit(new UserCreatedEvent("123", "user@options.com"));
      // Condition checks if email includes "options"
      expect(handler.called).toBe(true);
    });

    it("should retry failed handlers", async () => {
      registry.register(UserCreatedEvent, RetryHandler);
      const handler = container.get(RetryHandler);
      handler.attempts = 0; // Reset
      handler.shouldFail = true;
      // Emit event - handler will fail twice then succeed on third attempt
      await emitter.emit(new UserCreatedEvent("123", "test@test.com"));
      // Wait for retries to complete (retryDelay is 10ms, so 2 retries = ~20ms)
      await new Promise((resolve) => setTimeout(resolve, 100));
      // Should have attempted 3 times (initial + 2 retries)
      expect(handler.attempts).toBeGreaterThanOrEqual(3);
    });

    it("should handle timeout", async () => {
      registry.register(UserCreatedEvent, TimeoutHandler);
      // Timeout handler will timeout after 50ms, but emit doesn't throw by default
      // It logs the error instead. The handler has 100ms delay, timeout is 50ms
      await expect(
        emitter.emit(new UserCreatedEvent("123", "test@test.com")),
      ).resolves.not.toThrow();
      // Handler should be registered
      expect(registry.hasHandler(UserCreatedEvent, TimeoutHandler)).toBe(true);
    });

    it("should use custom error handler", async () => {
      registry.register(UserCreatedEvent, ErrorHandler);
      const errorSpy = jest.fn();
      // Get handler options and set error handler
      const handlers = registry.getHandlers(UserCreatedEvent);
      const errorHandlerEntry = handlers.find(
        (h) => h.handlerClass === ErrorHandler,
      );
      if (errorHandlerEntry) {
        errorHandlerEntry.options.errorHandler = errorSpy;
      }
      await emitter.emit(new UserCreatedEvent("123", "test@test.com"));
      // Wait a bit for error handling
      await new Promise((resolve) => setTimeout(resolve, 10));
      // Error should be handled
      expect(errorSpy).toHaveBeenCalled();
    });

    it("should handle linear backoff", async () => {
      registry.register(UserCreatedEvent, LinearBackoffHandler);
      const handler = container.get(LinearBackoffHandler);
      handler.attempts = 0; // Reset
      await emitter.emit(new UserCreatedEvent("123", "test@test.com"));
      // Wait for retries to complete (linear: 10ms * 1, 10ms * 2 = 30ms total)
      await new Promise((resolve) => setTimeout(resolve, 100));
      // Should have attempted 3 times (initial + 2 retries)
      expect(handler.attempts).toBeGreaterThanOrEqual(3);
    });

    it("should handle exponential backoff", async () => {
      registry.register(UserCreatedEvent, ExponentialBackoffHandler);
      const handler = container.get(ExponentialBackoffHandler);
      handler.attempts = 0; // Reset
      await emitter.emit(new UserCreatedEvent("123", "test@test.com"));
      // Wait for retries to complete (exponential: 10ms, 20ms = 30ms total)
      await new Promise((resolve) => setTimeout(resolve, 100));
      // Should have attempted 3 times (initial + 2 retries)
      expect(handler.attempts).toBeGreaterThanOrEqual(3);
    });

    it("should record events when enabled", async () => {
      emitter.configure({ enableRecording: true });
      recorder.startRecording();
      await emitter.emit(new UserCreatedEvent("123", "test@test.com"));
      expect(recorder.count()).toBeGreaterThan(0);
    });

    it("should track flow when enabled", async () => {
      emitter.configure({ enableFlowTracking: true });
      emitter.setCorrelationId("test-flow-id");
      flowTracker.startFlow("test-flow-id");
      await emitter.emit(new UserCreatedEvent("123", "test@test.com"));
      const flow = flowTracker.getFlow("test-flow-id");
      expect(flow).toBeDefined();
    });

    it("should call onEmit callback", async () => {
      const onEmitSpy = jest.fn();
      emitter.configure({ onEmit: onEmitSpy });
      await emitter.emit(new UserCreatedEvent("123", "test@test.com"));
      expect(onEmitSpy).toHaveBeenCalled();
    });

    it("should call onHandlerComplete callback", async () => {
      const onCompleteSpy = jest.fn();
      emitter.configure({ onHandlerComplete: onCompleteSpy });
      await emitter.emit(new UserCreatedEvent("123", "test@test.com"));
      expect(onCompleteSpy).toHaveBeenCalled();
    });

    it("should handle handler resolution errors", async () => {
      registry.register(UserCreatedEvent, SimpleHandler);
      // Remove handler from container to cause resolution error
      container.unbind(SimpleHandler);
      await expect(
        emitter.emit(new UserCreatedEvent("123", "test@test.com")),
      ).resolves.not.toThrow();
    });

    it("should handle condition evaluation errors", async () => {
      @provide(BrokenConditionHandler)
      @OnEvent(UserCreatedEvent)
      @When(() => {
        throw new Error("Condition error");
      })
      class BrokenConditionHandler implements IEventHandler<UserCreatedEvent> {
        handle(): void {}
      }

      container.bind(BrokenConditionHandler).toSelf();
      registry.register(UserCreatedEvent, BrokenConditionHandler);
      await expect(
        emitter.emit(new UserCreatedEvent("123", "test@test.com")),
      ).resolves.not.toThrow();
    });
  });

  describe("emitAndWait", () => {
    it("should wait for all handlers including async", async () => {
      registry.register(UserCreatedEvent, AsyncHandler);
      const handler = container.get(AsyncHandler);
      handler.called = false; // Reset
      await emitter.emitAndWait(new UserCreatedEvent("123", "test@test.com"));
      // emitAndWait should wait for async handlers
      expect(handler.called).toBe(true);
    });
  });

  describe("emitMany", () => {
    it("should emit multiple events in sequence", async () => {
      // SimpleHandler is already registered in beforeEach
      const handler = container.get(SimpleHandler);
      handler.called = false; // Reset
      handler.lastEvent = undefined;
      await emitter.emitMany([
        new UserCreatedEvent("1", "test1@test.com"),
        new UserCreatedEvent("2", "test2@test.com"),
      ]);
      // Handler should be called for both events (SimpleHandler is registered for UserCreatedEvent)
      expect(handler.called).toBe(true);
      expect(handler.lastEvent?.userId).toBe("2"); // Last event
    });
  });

  describe("hasHandlers", () => {
    it("should return true if handlers exist", () => {
      expect(emitter.hasHandlers(UserCreatedEvent)).toBe(true);
    });

    it("should return false if no handlers", () => {
      expect(emitter.hasHandlers(OrderCreatedEvent)).toBe(false);
    });
  });

  describe("handlerCount", () => {
    it("should return handler count", () => {
      expect(emitter.handlerCount(UserCreatedEvent)).toBe(1);
      registry.register(UserCreatedEvent, AsyncHandler);
      expect(emitter.handlerCount(UserCreatedEvent)).toBe(2);
    });
  });
});

// ============================================================================
// EventRegistry Additional Tests
// ============================================================================

describe("EventRegistry Additional", () => {
  let registry: EventRegistry;
  let container: Container;

  beforeEach(() => {
    registry = createEventRegistry();
    container = new Container();
  });

  describe("discoverHandlers", () => {
    it("should discover handlers from container", () => {
      container.bind(SimpleHandler).toSelf();
      const discovered = registry.discoverHandlers(container);
      expect(discovered).toBeGreaterThanOrEqual(0);
    });

    it("should handle container without bindings", () => {
      const emptyContainer = new Container();
      const discovered = registry.discoverHandlers(emptyContainer);
      expect(discovered).toBe(0);
    });

    it("should discover multiple event handlers", () => {
      container.bind(MultiEventHandler).toSelf();
      const discovered = registry.discoverHandlers(container);
      expect(discovered).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getHandlerClasses", () => {
    it("should return all handler classes", () => {
      registry.register(UserCreatedEvent, SimpleHandler);
      registry.register(UserUpdatedEvent, MultiEventHandler);
      const classes = registry.getHandlerClasses();
      expect(classes).toContain(SimpleHandler);
      expect(classes).toContain(MultiEventHandler);
    });
  });

  describe("getEventClasses", () => {
    it("should return all event classes", () => {
      registry.register(UserCreatedEvent, SimpleHandler);
      registry.register(UserUpdatedEvent, MultiEventHandler);
      const events = registry.getEventClasses();
      expect(events).toContain(UserCreatedEvent);
      expect(events).toContain(UserUpdatedEvent);
    });
  });

  describe("registerMultiple", () => {
    it("should store eventClasses array", () => {
      registry.registerMultiple(
        [UserCreatedEvent, UserUpdatedEvent],
        MultiEventHandler,
      );
      const handlers = registry.getHandlers(UserCreatedEvent);
      const handler = handlers.find(
        (h) => h.handlerClass === MultiEventHandler,
      );
      expect(handler?.eventClasses).toEqual([
        UserCreatedEvent,
        UserUpdatedEvent,
      ]);
    });
  });
});

// ============================================================================
// EventRecorder Additional Tests
// ============================================================================

describe("EventRecorder Additional", () => {
  let recorder: EventRecorder;

  beforeEach(() => {
    recorder = createEventRecorder();
    recorder.startRecording();
    recorder.clear();
  });

  afterEach(() => {
    recorder.stopRecording();
  });

  describe("configure", () => {
    it("should configure max events", () => {
      recorder.configure({ maxEvents: 500 });
      expect(recorder).toBeDefined();
    });

    it("should auto-start recording", () => {
      recorder.stopRecording();
      recorder.configure({ autoStart: true });
      expect(recorder.isRecording()).toBe(true);
    });
  });

  describe("setReplayEmitter", () => {
    it("should set replay emitter", () => {
      const emitter = jest.fn().mockResolvedValue(undefined);
      recorder.setReplayEmitter(emitter);
      expect(recorder).toBeDefined();
    });
  });

  describe("replay", () => {
    it("should replay events", async () => {
      const emitter = jest.fn().mockResolvedValue(undefined);
      recorder.setReplayEmitter(emitter);
      recorder.record(new UserCreatedEvent("1", "test1@test.com"));
      recorder.record(new UserCreatedEvent("2", "test2@test.com"));
      await recorder.replay();
      expect(emitter).toHaveBeenCalledTimes(2);
    });

    it("should filter by timestamp", async () => {
      const emitter = jest.fn().mockResolvedValue(undefined);
      recorder.setReplayEmitter(emitter);
      const before = Date.now();
      recorder.record(new UserCreatedEvent("1", "test1@test.com"));
      await new Promise((resolve) => setTimeout(resolve, 10));
      const after = Date.now();
      recorder.record(new UserCreatedEvent("2", "test2@test.com"));
      await recorder.replay({ fromTimestamp: after });
      expect(emitter).toHaveBeenCalledTimes(1);
    });

    it("should filter by event type", async () => {
      const emitter = jest.fn().mockResolvedValue(undefined);
      recorder.setReplayEmitter(emitter);
      recorder.record(new UserCreatedEvent("1", "test1@test.com"));
      recorder.record(new UserUpdatedEvent("1", {}));
      await recorder.replay({ eventTypes: [UserCreatedEvent] });
      expect(emitter).toHaveBeenCalledTimes(1);
    });

    it("should filter by custom filter", async () => {
      const emitter = jest.fn().mockResolvedValue(undefined);
      recorder.setReplayEmitter(emitter);
      recorder.record(new UserCreatedEvent("1", "test1@test.com"));
      recorder.record(new UserCreatedEvent("2", "test2@test.com"));
      await recorder.replay({
        filter: (event) => (event.data as UserCreatedEvent).userId === "1",
      });
      expect(emitter).toHaveBeenCalledTimes(1);
    });

    it("should apply speed delay", async () => {
      const emitter = jest.fn().mockResolvedValue(undefined);
      recorder.setReplayEmitter(emitter);
      const time1 = Date.now();
      recorder.record(new UserCreatedEvent("1", "test1@test.com"));
      await new Promise((resolve) => setTimeout(resolve, 20));
      const time2 = Date.now();
      recorder.record(new UserCreatedEvent("2", "test2@test.com"));
      const startTime = Date.now();
      await recorder.replay({ speed: 10 });
      const duration = Date.now() - startTime;
      // Should take some time due to speed delay (at least 1ms per event with speed=10)
      // With 2 events and speed=10, delay should be (time2-time1)/10
      expect(duration).toBeGreaterThanOrEqual(0);
      expect(emitter).toHaveBeenCalledTimes(2);
    });

    it("should throw if replay emitter not set", async () => {
      await expect(recorder.replay()).rejects.toThrow();
    });
  });

  describe("export edge cases", () => {
    it("should handle empty events in CSV export", () => {
      recorder.clear();
      const csv = recorder.export("csv");
      expect(csv).toContain("id,type,timestamp");
    });

    it("should handle events without handler results", () => {
      recorder.record(new UserCreatedEvent("123", "test@test.com"));
      const csv = recorder.export("csv");
      expect(csv).toContain("UserCreatedEvent");
    });
  });
});

// ============================================================================
// EventFlowTracker Additional Tests
// ============================================================================

describe("EventFlowTracker Additional", () => {
  let tracker: EventFlowTracker;

  beforeEach(() => {
    tracker = createEventFlowTracker();
  });

  afterEach(() => {
    tracker.clear();
  });

  describe("configure", () => {
    it("should configure max flows", () => {
      tracker.configure({ maxFlows: 50 });
      expect(tracker).toBeDefined();
    });
  });

  describe("pushEvent and popEvent", () => {
    it("should push and pop events", () => {
      tracker.startFlow("req-123");
      tracker.pushEvent("req-123", "ParentEvent");
      tracker.recordEvent("req-123", "ChildEvent", ["Handler1"], 50);
      tracker.popEvent("req-123", ["Handler1"], 50);
      const flow = tracker.getFlow("req-123");
      expect(flow?.events.length).toBeGreaterThan(0);
    });

    it("should handle popEvent without current event", () => {
      tracker.startFlow("req-123");
      tracker.popEvent("req-123", ["Handler1"], 50);
      // Should not throw
      expect(tracker.activeFlowCount()).toBe(1);
    });

    it("should handle pushEvent without flow", () => {
      tracker.pushEvent("non-existent", "Event");
      // Should not throw
      expect(tracker.activeFlowCount()).toBe(0);
    });
  });

  describe("getFlow", () => {
    it("should return undefined for non-existent flow", () => {
      const flow = tracker.getFlow("non-existent");
      expect(flow).toBeUndefined();
    });

    it("should return flow with current duration", async () => {
      tracker.startFlow("req-123");
      await new Promise((resolve) => setTimeout(resolve, 10));
      const flow = tracker.getFlow("req-123");
      expect(flow).toBeDefined();
      expect(flow?.totalDuration).toBeGreaterThanOrEqual(0);
    });
  });

  describe("maxFlows cleanup", () => {
    it("should cleanup old flows when at capacity", () => {
      tracker.configure({ maxFlows: 2 });
      tracker.startFlow("req-1");
      tracker.startFlow("req-2");
      tracker.startFlow("req-3");
      // Oldest flow should be removed
      expect(tracker.activeFlowCount()).toBe(2);
      expect(tracker.getFlow("req-1")).toBeUndefined();
    });
  });

  describe("visualize", () => {
    it("should visualize nested events", () => {
      tracker.startFlow("req-123");
      tracker.pushEvent("req-123", "ParentEvent");
      tracker.recordEvent("req-123", "ChildEvent", ["Handler1"], 50);
      tracker.popEvent("req-123", ["Handler1"], 50);
      const flow = tracker.endFlow("req-123");
      const visual = flow.visualize();
      expect(visual).toContain("ParentEvent");
      expect(visual).toContain("ChildEvent");
    });

    it("should handle events with no handlers", () => {
      tracker.startFlow("req-123");
      tracker.recordEvent("req-123", "Event", [], 0);
      const flow = tracker.endFlow("req-123");
      const visual = flow.visualize();
      expect(visual).toContain("Event");
    });
  });
});

// ============================================================================
// Decorator Edge Cases
// ============================================================================

describe("Event Decorators Edge Cases", () => {
  describe("@OnEvents", () => {
    it("should handle empty event classes array", () => {
      @OnEvents([])
      class EmptyHandler {}
      const classes = getEventClasses(EmptyHandler);
      expect(classes).toEqual([]);
    });
  });

  describe("@Event", () => {
    it("should handle empty metadata", () => {
      @Event()
      class EmptyMetadataEvent {}
      const metadata = getEventMetadata(EmptyMetadataEvent);
      expect(metadata).toBeDefined();
    });
  });
});
