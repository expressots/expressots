/**
 * Event System Module
 *
 * @module event
 *
 * Type-safe, auto-discovered event system for decoupled, event-driven architecture.
 *
 * Features:
 * - Type-safe event classes (not strings!)
 * - Auto-discovery via @provide() decorator
 * - Conditional handlers with @When()
 * - Priority-based execution
 * - Event replay and flow visualization
 * - Async handlers with retry/timeout
 *
 * @example
 * ```typescript
 * // Define type-safe event
 * export class UserCreatedEvent {
 *   constructor(
 *     public readonly userId: string,
 *     public readonly email: string,
 *     public readonly timestamp: Date = new Date()
 *   ) {}
 * }
 *
 * // Create handler with auto-discovery
 * @provide(UserCreatedHandler)
 * @OnEvent(UserCreatedEvent)
 * export class UserCreatedHandler implements IEventHandler<UserCreatedEvent> {
 *   handle(event: UserCreatedEvent) {
 *     console.log(`User ${event.userId} created`);
 *   }
 * }
 *
 * // Conditional handler
 * @provide(PremiumHandler)
 * @OnEvent(UserCreatedEvent)
 * @When(event => event.user.isPremium)
 * export class PremiumHandler implements IEventHandler<UserCreatedEvent> {
 *   handle(event: UserCreatedEvent) {
 *     // Only runs for premium users
 *   }
 * }
 *
 * // Emit with full type safety
 * eventEmitter.emit(new UserCreatedEvent("123", "user@example.com"));
 * ```
 */

// Interfaces
export {
  EventClass,
  EventInstance,
  EventMetadata,
  IEventHandler,
  EventHandlerClass,
  OnEventOptions,
  WhenOptions,
  IEventEmitter,
  IEventRegistry,
  RegisteredHandler,
  IEventRecorder,
  RecordedEvent,
  ReplayOptions,
  IEventFlowTracker,
  EventFlow,
  EventFlowNode,
  HandlerExecutionResult,
  EventSystemConfig,
  EVENT_METADATA,
} from "./event.interfaces.js";

// Decorators
export {
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
} from "./event-decorators.js";

// Services
export { EventRegistry, createEventRegistry } from "./event-registry.js";
export { EventEmitter, createEventEmitter } from "./event-emitter.js";
export { EventRecorder, createEventRecorder } from "./event-recorder.js";
export { EventFlowTracker, createEventFlowTracker } from "./event-flow-tracker.js";
