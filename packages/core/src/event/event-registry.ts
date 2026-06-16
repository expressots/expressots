/**
 * Event Registry
 *
 * @module event
 *
 * Central registry for event handlers with auto-discovery support.
 */

import { Container, injectable } from "../di/inversify.js";
import { forEachBinding } from "../di/container-introspection.js";
import {
  getEventClass,
  getEventClasses,
  getEventCondition,
  getEventOptions,
  isEventHandler,
} from "./event-decorators.js";
import {
  EventClass,
  EventHandlerClass,
  IEventRegistry,
  OnEventOptions,
  RegisteredHandler,
} from "./event.interfaces.js";

/**
 * Event registry implementation.
 *
 * Manages registration and discovery of event handlers.
 *
 * NOTE: This class uses @injectable() instead of @provide() because
 * it must be registered as a Singleton by the application to ensure
 * all components share the same registry instance. The @provide decorator
 * would auto-register it with a different scope, causing multiple instances.
 */
@injectable()
export class EventRegistry implements IEventRegistry {
  /**
   * Map of event class to handlers.
   */
  private handlers: Map<EventClass, Array<RegisteredHandler>> = new Map();

  /**
   * Set of all registered handler classes.
   */
  private handlerClasses: Set<EventHandlerClass> = new Set();

  /**
   * Register a handler for an event.
   */
  register<T>(
    eventClass: EventClass<T>,
    handlerClass: EventHandlerClass<T>,
    options: OnEventOptions = {},
  ): void {
    if (!this.handlers.has(eventClass)) {
      this.handlers.set(eventClass, []);
    }

    // Check if already registered
    const existing = this.handlers.get(eventClass)!;
    if (existing.some((h) => h.handlerClass === handlerClass)) {
      return; // Already registered
    }

    // Get condition from decorator if present
    const condition = getEventCondition<T>(handlerClass);

    // Merge options with decorator options
    const decoratorOptions = getEventOptions(handlerClass) || {};
    const mergedOptions: OnEventOptions = {
      priority: 100,
      async: false,
      retry: 0,
      timeout: 30000,
      retryDelay: 1000,
      backoff: "fixed",
      ...decoratorOptions,
      ...options,
    };

    const handler: RegisteredHandler<T> = {
      handlerClass,
      eventClass,
      options: mergedOptions,
      condition,
    };

    existing.push(handler as RegisteredHandler);
    this.handlerClasses.add(handlerClass);

    // Sort by priority (lower = higher priority)
    existing.sort(
      (a, b) => (a.options.priority || 100) - (b.options.priority || 100),
    );
  }

  /**
   * Register a handler for multiple events.
   */
  registerMultiple<T>(
    eventClasses: Array<EventClass>,
    handlerClass: EventHandlerClass<T>,
    options: OnEventOptions = {},
  ): void {
    for (const eventClass of eventClasses) {
      this.register(eventClass, handlerClass, options);
    }

    // Store the event classes array on the first handler entry
    if (eventClasses.length > 0) {
      const handlers = this.handlers.get(eventClasses[0]);
      if (handlers) {
        const handler = handlers.find((h) => h.handlerClass === handlerClass);
        if (handler) {
          handler.eventClasses = eventClasses;
        }
      }
    }
  }

  /**
   * Get all handlers for an event class.
   */
  getHandlers<T>(eventClass: EventClass<T>): Array<RegisteredHandler<T>> {
    return (this.handlers.get(eventClass) || []) as Array<RegisteredHandler<T>>;
  }

  /**
   * Get all registered handlers.
   */
  getAllHandlers(): Array<RegisteredHandler> {
    const all: Array<RegisteredHandler> = [];
    for (const handlers of this.handlers.values()) {
      all.push(...handlers);
    }
    return all;
  }

  /**
   * Check if a handler is registered.
   */
  hasHandler<T>(
    eventClass: EventClass<T>,
    handlerClass: EventHandlerClass<T>,
  ): boolean {
    const handlers = this.handlers.get(eventClass);
    return handlers?.some((h) => h.handlerClass === handlerClass) || false;
  }

  /**
   * Unregister a handler.
   */
  unregister<T>(
    eventClass: EventClass<T>,
    handlerClass: EventHandlerClass<T>,
  ): void {
    const handlers = this.handlers.get(eventClass);
    if (handlers) {
      const index = handlers.findIndex((h) => h.handlerClass === handlerClass);
      if (index !== -1) {
        handlers.splice(index, 1);
        this.handlerClasses.delete(handlerClass);
      }
    }
  }

  /**
   * Clear all handlers.
   */
  clear(): void {
    this.handlers.clear();
    this.handlerClasses.clear();
  }

  /**
   * Auto-discover and register handlers from container.
   *
   * This scans all bound services in the container and registers
   * any that are decorated with @OnEvent or @OnEvents.
   */
  discoverHandlers(container: Container): number {
    let discovered = 0;

    forEachBinding(container, (binding) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const target = (binding as any).implementationType as
        | NewableFunction
        | undefined;
      if (!target || typeof target !== "function") {
        return;
      }

      if (!isEventHandler(target)) {
        return;
      }

      const eventClasses = getEventClasses(target);
      const eventClass = getEventClass(target);

      if (eventClasses && eventClasses.length > 0) {
        this.registerMultiple(
          eventClasses,
          target as EventHandlerClass,
          getEventOptions(target) || {},
        );
        discovered++;
      } else if (eventClass) {
        this.register(
          eventClass,
          target as EventHandlerClass,
          getEventOptions(target) || {},
        );
        discovered++;
      }
    });

    return discovered;
  }

  /**
   * Get handler classes for dependency resolution.
   */
  getHandlerClasses(): Array<EventHandlerClass> {
    return Array.from(this.handlerClasses);
  }

  /**
   * Get all registered event classes.
   */
  getEventClasses(): Array<EventClass> {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get statistics about registered handlers.
   */
  getStatistics(): {
    totalHandlers: number;
    totalEvents: number;
    handlersPerEvent: Record<string, number>;
  } {
    const handlersPerEvent: Record<string, number> = {};

    for (const [eventClass, handlers] of this.handlers.entries()) {
      const name = eventClass.name || "UnknownEvent";
      handlersPerEvent[name] = handlers.length;
    }

    return {
      totalHandlers: this.handlerClasses.size,
      totalEvents: this.handlers.size,
      handlersPerEvent,
    };
  }
}

/**
 * Create a standalone event registry (for testing).
 */
export function createEventRegistry(): EventRegistry {
  return new EventRegistry();
}
