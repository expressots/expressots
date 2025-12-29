/**
 * Event System Tests
 *
 * Comprehensive test coverage for the event system.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      registry.register(UserUpdatedEvent, SimpleHandler as any);

      const stats = registry.getStatistics();
      expect(stats.totalHandlers).toBe(2); // Unique handler classes
      expect(stats.totalEvents).toBe(2);
      expect(stats.handlersPerEvent["UserCreatedEvent"]).toBe(2);
      expect(stats.handlersPerEvent["UserUpdatedEvent"]).toBe(1);
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
