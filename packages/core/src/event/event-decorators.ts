/**
 * Event Decorators
 *
 * @module event
 *
 * Decorators for registering event handlers with type safety.
 *
 * @example
 * ```typescript
 * // Single event handler
 * @provide(UserCreatedHandler)
 * @OnEvent(UserCreatedEvent, { priority: 1 })
 * export class UserCreatedHandler implements IEventHandler<UserCreatedEvent> {
 *   handle(event: UserCreatedEvent) {
 *     console.log(`User ${event.userId} created`);
 *   }
 * }
 *
 * // Conditional handler
 * @provide(PremiumFeatureHandler)
 * @OnEvent(UserCreatedEvent)
 * @When(event => event.user.isPremium)
 * export class PremiumFeatureHandler implements IEventHandler<UserCreatedEvent> {
 *   handle(event: UserCreatedEvent) {
 *     // Only runs for premium users
 *   }
 * }
 *
 * // Multiple event handler
 * @provide(UserActivityHandler)
 * @OnEvents([UserCreatedEvent, UserUpdatedEvent, UserDeletedEvent])
 * export class UserActivityHandler {
 *   handle(event: UserCreatedEvent | UserUpdatedEvent | UserDeletedEvent) {
 *     // Handles any of the specified events
 *   }
 * }
 * ```
 */

import "reflect-metadata";
import {
  EventClass,
  OnEventOptions,
  EVENT_METADATA,
  WhenOptions,
} from "./event.interfaces.js";

// ============================================================================
// @OnEvent Decorator
// ============================================================================

/**
 * Mark a class as an event handler for a specific event type.
 *
 * @template T - Event type
 * @param eventClass - Event class to handle
 * @param options - Handler options (priority, async, retry, etc.)
 *
 * @example
 * ```typescript
 * @provide(UserCreatedHandler)
 * @OnEvent(UserCreatedEvent)
 * export class UserCreatedHandler implements IEventHandler<UserCreatedEvent> {
 *   handle(event: UserCreatedEvent) {
 *     console.log(`User ${event.userId} created`);
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // With priority (lower = runs first)
 * @OnEvent(UserCreatedEvent, { priority: 1 })
 * export class FirstHandler {}
 *
 * @OnEvent(UserCreatedEvent, { priority: 2 })
 * export class SecondHandler {}
 * ```
 *
 * @example
 * ```typescript
 * // Async handler with retry
 * @OnEvent(UserCreatedEvent, {
 *   async: true,
 *   retry: 3,
 *   retryDelay: 1000,
 *   backoff: "exponential"
 * })
 * export class ResilientHandler {}
 * ```
 */
export function OnEvent<T>(
  eventClass: EventClass<T>,
  options: OnEventOptions = {},
): ClassDecorator {
  return function (target: object): void {
    // Store event class
    Reflect.defineMetadata(EVENT_METADATA.EVENT_CLASS, eventClass, target);

    // Store options with defaults
    const mergedOptions: OnEventOptions = {
      priority: 100,
      async: false,
      retry: 0,
      timeout: 30000,
      retryDelay: 1000,
      backoff: "fixed",
      ...options,
    };
    Reflect.defineMetadata(EVENT_METADATA.EVENT_OPTIONS, mergedOptions, target);

    // Mark as event handler
    Reflect.defineMetadata(EVENT_METADATA.IS_EVENT_HANDLER, true, target);
  };
}

// ============================================================================
// @OnEvents Decorator
// ============================================================================

/**
 * Mark a class as an event handler for multiple event types.
 *
 * @param eventClasses - Array of event classes to handle
 * @param options - Handler options
 *
 * @example
 * ```typescript
 * @provide(UserActivityHandler)
 * @OnEvents([UserCreatedEvent, UserUpdatedEvent, UserDeletedEvent])
 * export class UserActivityHandler {
 *   handle(event: UserCreatedEvent | UserUpdatedEvent | UserDeletedEvent) {
 *     // Called for any of the specified events
 *     this.analytics.trackUserActivity(event);
 *   }
 * }
 * ```
 */
export function OnEvents(
  eventClasses: Array<EventClass>,
  options: OnEventOptions = {},
): ClassDecorator {
  return function (target: object): void {
    // Store all event classes
    Reflect.defineMetadata(EVENT_METADATA.EVENT_CLASSES, eventClasses, target);

    // Store first event class for compatibility
    if (eventClasses.length > 0) {
      Reflect.defineMetadata(
        EVENT_METADATA.EVENT_CLASS,
        eventClasses[0],
        target,
      );
    }

    // Store options with defaults
    const mergedOptions: OnEventOptions = {
      priority: 100,
      async: false,
      retry: 0,
      timeout: 30000,
      retryDelay: 1000,
      backoff: "fixed",
      ...options,
    };
    Reflect.defineMetadata(EVENT_METADATA.EVENT_OPTIONS, mergedOptions, target);

    // Mark as event handler
    Reflect.defineMetadata(EVENT_METADATA.IS_EVENT_HANDLER, true, target);
  };
}

// ============================================================================
// @When Decorator
// ============================================================================

/**
 * Add a condition to an event handler.
 * Handler will only execute if condition returns true.
 *
 * @template T - Event type
 * @param condition - Condition function or options object
 *
 * @example
 * ```typescript
 * // Simple condition function
 * @provide(PremiumHandler)
 * @OnEvent(UserCreatedEvent)
 * @When(event => event.user.isPremium)
 * export class PremiumHandler implements IEventHandler<UserCreatedEvent> {
 *   handle(event: UserCreatedEvent) {
 *     // Only runs for premium users
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // With reason for debugging
 * @When({
 *   condition: event => event.user.region === "EU",
 *   reason: "GDPR compliance for EU users"
 * })
 * export class GDPRHandler {}
 * ```
 *
 * @example
 * ```typescript
 * // Async condition
 * @When(async event => {
 *   const features = await featureService.getFeatures(event.userId);
 *   return features.includes("premium");
 * })
 * export class FeatureFlagHandler {}
 * ```
 */
export function When<T = unknown>(
  conditionOrOptions:
    | ((event: T) => boolean | Promise<boolean>)
    | WhenOptions<T>,
): ClassDecorator {
  return function (target: object): void {
    const whenOptions: WhenOptions<T> =
      typeof conditionOrOptions === "function"
        ? { condition: conditionOrOptions }
        : conditionOrOptions;

    Reflect.defineMetadata(EVENT_METADATA.EVENT_CONDITION, whenOptions, target);
  };
}

// ============================================================================
// @Event Decorator (for event classes)
// ============================================================================

/**
 * Mark a class as an event with optional metadata.
 * This is optional but provides additional documentation and versioning.
 *
 * @param metadata - Event metadata
 *
 * @example
 * ```typescript
 * @Event({
 *   name: "user.created",
 *   version: 1,
 *   description: "Emitted when a new user is created",
 *   tags: ["user", "auth"]
 * })
 * export class UserCreatedEvent {
 *   constructor(
 *     public readonly userId: string,
 *     public readonly email: string,
 *     public readonly timestamp: Date = new Date()
 *   ) {}
 * }
 * ```
 */
export function Event(
  metadata: {
    name?: string;
    version?: number;
    description?: string;
    tags?: Array<string>;
  } = {},
): ClassDecorator {
  return function (target: object): void {
    // Store metadata on the event class itself
    Reflect.defineMetadata("expressots:event:metadata", metadata, target);
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a class is an event handler.
 */
export function isEventHandler(target: object): boolean {
  return Reflect.getMetadata(EVENT_METADATA.IS_EVENT_HANDLER, target) === true;
}

/**
 * Get the event class from a handler.
 */
export function getEventClass<T>(handler: object): EventClass<T> | undefined {
  return Reflect.getMetadata(EVENT_METADATA.EVENT_CLASS, handler);
}

/**
 * Get all event classes from a handler (for @OnEvents).
 */
export function getEventClasses(
  handler: object,
): Array<EventClass> | undefined {
  return Reflect.getMetadata(EVENT_METADATA.EVENT_CLASSES, handler);
}

/**
 * Get handler options.
 */
export function getEventOptions(handler: object): OnEventOptions | undefined {
  return Reflect.getMetadata(EVENT_METADATA.EVENT_OPTIONS, handler);
}

/**
 * Get handler condition.
 */
export function getEventCondition<T>(
  handler: object,
): WhenOptions<T> | undefined {
  return Reflect.getMetadata(EVENT_METADATA.EVENT_CONDITION, handler);
}

/**
 * Get event metadata from an event class.
 */
export function getEventMetadata(eventClass: EventClass):
  | {
      name?: string;
      version?: number;
      description?: string;
      tags?: Array<string>;
    }
  | undefined {
  return Reflect.getMetadata("expressots:event:metadata", eventClass);
}
