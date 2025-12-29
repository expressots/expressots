/**
 * Event Emitter Service
 *
 * @module event
 *
 * Type-safe event emitter with support for:
 * - Priority-based handler execution
 * - Conditional handlers
 * - Async handlers with retry
 * - Event recording and flow tracking
 *
 * @example
 * ```typescript
 * @inject(EventEmitter)
 * private eventEmitter: EventEmitter;
 *
 * async createUser(data: CreateUserDto) {
 *   const user = await this.userRepo.create(data);
 *   await this.eventEmitter.emit(new UserCreatedEvent(user.id, user.email));
 *   return user;
 * }
 * ```
 */

import { Container, inject, injectable, optional } from "../di/inversify";
import { Logger } from "../provider/logger/logger.provider";
import { EventFlowTracker } from "./event-flow-tracker";
import { EventRecorder } from "./event-recorder";
import { EventRegistry } from "./event-registry";
import {
  EventClass,
  EventSystemConfig,
  HandlerExecutionResult,
  IEventEmitter,
  IEventHandler,
  RegisteredHandler,
  WhenOptions,
} from "./event.interfaces";

/**
 * Default event system configuration.
 */
const DEFAULT_CONFIG: EventSystemConfig = {
  enableRecording: process.env.NODE_ENV === "development",
  enableFlowTracking: process.env.NODE_ENV === "development",
  maxRecordedEvents: 1000,
  defaultTimeout: 30000,
};

/**
 * Event emitter service.
 *
 * Dispatches events to registered handlers with full type safety.
 *
 * NOTE: This class uses @injectable() instead of @provide() because
 * it must be registered as a Singleton by the application to ensure
 * the same instance is used throughout the request lifecycle.
 */
@injectable()
export class EventEmitter implements IEventEmitter {
  private config: EventSystemConfig;
  private currentCorrelationId?: string;

  constructor(
    @inject(EventRegistry) private registry: EventRegistry,
    @inject(Container) private container: Container,
    @inject(EventRecorder) @optional() private recorder?: EventRecorder,
    @inject(EventFlowTracker)
    @optional()
    private flowTracker?: EventFlowTracker,
    @inject(Logger) @optional() private logger?: Logger,
  ) {
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Configure the event emitter.
   */
  configure(config: Partial<EventSystemConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Set correlation ID for tracking.
   */
  setCorrelationId(id: string): void {
    this.currentCorrelationId = id;
  }

  /**
   * Emit an event to all registered handlers.
   * Waits for sync handlers, fires async handlers in background.
   */
  async emit<T>(event: T): Promise<void> {
    const eventClass = event.constructor as EventClass<T>;
    const handlers = this.registry.getHandlers(eventClass);

    if (handlers.length === 0) {
      return;
    }

    // Notify config callback
    if (this.config.onEmit) {
      this.config.onEmit(event);
    }

    const results: Array<HandlerExecutionResult> = [];
    const asyncPromises: Array<Promise<void>> = [];

    for (const handler of handlers) {
      if (handler.options.async) {
        // Fire async handlers in background
        asyncPromises.push(
          this.executeHandler(handler, event).then((result) => {
            results.push(result);
          }),
        );
      } else {
        // Wait for sync handlers
        const result = await this.executeHandler(handler, event);
        results.push(result);
      }
    }

    // Record event if enabled
    if (this.config.enableRecording && this.recorder) {
      this.recorder.record(event, this.formatResultsForRecording(results));
    }

    // Don't wait for async handlers
    if (asyncPromises.length > 0) {
      Promise.all(asyncPromises).catch((error) => {
        this.logger?.error("Async event handler failed", error);
      });
    }
  }

  /**
   * Emit an event and wait for ALL handlers (including async).
   */
  async emitAndWait<T>(event: T): Promise<void> {
    const eventClass = event.constructor as EventClass<T>;
    const handlers = this.registry.getHandlers(eventClass);

    if (handlers.length === 0) {
      return;
    }

    // Notify config callback
    if (this.config.onEmit) {
      this.config.onEmit(event);
    }

    const results: Array<HandlerExecutionResult> = [];

    // Execute all handlers in order, waiting for each
    for (const handler of handlers) {
      const result = await this.executeHandler(handler, event);
      results.push(result);
    }

    // Record event if enabled
    if (this.config.enableRecording && this.recorder) {
      this.recorder.record(event, this.formatResultsForRecording(results));
    }
  }

  /**
   * Emit multiple events in sequence.
   */
  async emitMany<T>(events: Array<T>): Promise<void> {
    for (const event of events) {
      await this.emit(event);
    }
  }

  /**
   * Check if there are any handlers for an event type.
   */
  hasHandlers<T>(eventClass: EventClass<T>): boolean {
    return this.registry.getHandlers(eventClass).length > 0;
  }

  /**
   * Get the number of handlers for an event type.
   */
  handlerCount<T>(eventClass: EventClass<T>): number {
    return this.registry.getHandlers(eventClass).length;
  }

  /**
   * Execute a single handler.
   */
  private async executeHandler<T>(
    handler: RegisteredHandler<T>,
    event: T,
  ): Promise<HandlerExecutionResult> {
    const handlerName = handler.handlerClass.name;
    const startTime = Date.now();

    // Check condition
    if (handler.condition) {
      const shouldRun = await this.evaluateCondition(handler.condition, event);
      if (!shouldRun) {
        return {
          handler: handlerName,
          success: true,
          duration: Date.now() - startTime,
          skipped: true,
          skipReason: handler.condition.reason || "Condition not met",
        };
      }
    }

    // Get handler instance from container
    let instance: IEventHandler<T>;
    try {
      instance = this.container.get(handler.handlerClass);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.handleError(err, event, handlerName);
      return {
        handler: handlerName,
        success: false,
        duration: Date.now() - startTime,
        error: err,
      };
    }

    // Execute with retry logic
    const options = handler.options;
    let lastError: Error | undefined;
    let retries = 0;

    while (retries <= (options.retry || 0)) {
      try {
        // Execute with timeout
        await this.executeWithTimeout(
          () => instance.handle(event),
          options.timeout || this.config.defaultTimeout || 30000,
          handlerName,
        );

        const result: HandlerExecutionResult = {
          handler: handlerName,
          success: true,
          duration: Date.now() - startTime,
          retries: retries > 0 ? retries : undefined,
        };

        // Notify config callback
        if (this.config.onHandlerComplete) {
          this.config.onHandlerComplete(result);
        }

        // Track flow if enabled
        if (
          this.config.enableFlowTracking &&
          this.flowTracker &&
          this.currentCorrelationId
        ) {
          this.flowTracker.recordEvent(
            this.currentCorrelationId,
            event.constructor.name,
            [handlerName],
            result.duration,
          );
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        retries++;

        if (retries <= (options.retry || 0)) {
          // Calculate delay based on backoff strategy
          const delay = this.calculateBackoffDelay(
            options.retryDelay || 1000,
            retries,
            options.backoff || "fixed",
          );
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    const result: HandlerExecutionResult = {
      handler: handlerName,
      success: false,
      duration: Date.now() - startTime,
      error: lastError,
      retries: retries > 0 ? retries - 1 : undefined,
    };

    // Handle error
    if (lastError) {
      if (options.errorHandler) {
        options.errorHandler(lastError, event);
      } else {
        this.handleError(lastError, event, handlerName);
      }
    }

    // Notify config callback
    if (this.config.onHandlerComplete) {
      this.config.onHandlerComplete(result);
    }

    return result;
  }

  /**
   * Evaluate a condition.
   */
  private async evaluateCondition<T>(
    condition: WhenOptions<T>,
    event: T,
  ): Promise<boolean> {
    try {
      const result = condition.condition(event);
      return result instanceof Promise ? await result : result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger?.error(`Condition evaluation failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Execute a function with timeout.
   */
  private async executeWithTimeout<R>(
    fn: () => R | Promise<R>,
    timeout: number,
    handlerName: string,
  ): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(
          new Error(`Handler ${handlerName} timed out after ${timeout}ms`),
        );
      }, timeout);
      timeoutId.unref();

      const result = fn();

      if (result instanceof Promise) {
        result
          .then((value) => {
            clearTimeout(timeoutId);
            resolve(value);
          })
          .catch((error) => {
            clearTimeout(timeoutId);
            reject(error);
          });
      } else {
        clearTimeout(timeoutId);
        resolve(result);
      }
    });
  }

  /**
   * Calculate backoff delay.
   */
  private calculateBackoffDelay(
    baseDelay: number,
    attempt: number,
    strategy: "fixed" | "linear" | "exponential",
  ): number {
    switch (strategy) {
      case "linear":
        return baseDelay * attempt;
      case "exponential":
        return baseDelay * Math.pow(2, attempt - 1);
      case "fixed":
      default:
        return baseDelay;
    }
  }

  /**
   * Sleep for a duration.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, ms);
      timer.unref();
    });
  }

  /**
   * Handle an error.
   */
  private handleError(error: Error, event: unknown, handlerName: string): void {
    if (this.config.onError) {
      this.config.onError(error, event, handlerName);
    } else {
      const eventName =
        (event as { constructor?: { name?: string } })?.constructor?.name ||
        "UnknownEvent";
      this.logger?.error(
        `Event handler ${handlerName} failed: ${error.message} (event: ${eventName})`,
      );
    }
  }

  /**
   * Format results for recording.
   */
  private formatResultsForRecording(
    results: Array<HandlerExecutionResult>,
  ): Array<{
    handler: string;
    duration: number;
    success: boolean;
    error?: string;
  }> {
    return results.map((r) => ({
      handler: r.handler,
      duration: r.duration,
      success: r.success,
      error: r.error?.message,
    }));
  }
}

/**
 * Create a standalone event emitter (for testing).
 */
export function createEventEmitter(
  registry: EventRegistry,
  container: Container,
  recorder?: EventRecorder,
  flowTracker?: EventFlowTracker,
): EventEmitter {
  const emitter = new EventEmitter(
    registry,
    container,
    recorder,
    flowTracker,
    undefined,
  );
  return emitter;
}
