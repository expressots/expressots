/**
 * Event System Interfaces
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
 * // Emit with full type safety
 * eventEmitter.emit(new UserCreatedEvent("123", "user@example.com"));
 * ```
 */

// ============================================================================
// Core Event Types
// ============================================================================

/**
 * Base event class type.
 * Events are plain classes with constructor parameters.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EventClass<T = any> = new (...args: Array<any>) => T;

/**
 * Extract event instance type from event class.
 */
export type EventInstance<T extends EventClass> = InstanceType<T>;

/**
 * Event metadata attached to event classes.
 */
export interface EventMetadata {
  /**
   * Event name (defaults to class name).
   */
  name?: string;

  /**
   * Event version for schema evolution.
   */
  version?: number;

  /**
   * Event description for documentation.
   */
  description?: string;

  /**
   * Tags for filtering and organization.
   */
  tags?: Array<string>;
}

// ============================================================================
// Event Handler Interface
// ============================================================================

/**
 * Event handler interface.
 *
 * Implement this interface to create type-safe event handlers.
 *
 * @template T - Event type this handler processes
 *
 * @example
 * ```typescript
 * @provide(UserCreatedHandler)
 * @OnEvent(UserCreatedEvent)
 * export class UserCreatedHandler implements IEventHandler<UserCreatedEvent> {
 *   handle(event: UserCreatedEvent) {
 *     console.log(`User ${event.userId} created at ${event.email}`);
 *   }
 * }
 * ```
 */
export interface IEventHandler<T = unknown> {
  /**
   * Handle the event.
   *
   * @param event - The event instance to handle
   * @returns void or Promise<void> for async handlers
   */
  handle(event: T): void | Promise<void>;
}

/**
 * Handler class type for registration.
 */
export type EventHandlerClass<T = unknown> = new (
  ...args: Array<unknown>
) => IEventHandler<T>;

// ============================================================================
// Handler Options
// ============================================================================

/**
 * Options for @OnEvent() decorator.
 */
export interface OnEventOptions {
  /**
   * Handler priority (lower = higher priority).
   * Default: 100
   *
   * @example
   * ```typescript
   * @OnEvent(UserCreatedEvent, { priority: 1 }) // Runs first
   * @OnEvent(UserCreatedEvent, { priority: 2 }) // Runs second
   * ```
   */
  priority?: number;

  /**
   * Run handler asynchronously (fire-and-forget).
   * Default: false
   */
  async?: boolean;

  /**
   * Number of retries on failure.
   * Default: 0 (no retries)
   */
  retry?: number;

  /**
   * Timeout in milliseconds.
   * Default: 30000 (30s)
   */
  timeout?: number;

  /**
   * Delay between retries in milliseconds.
   * Default: 1000 (1s)
   */
  retryDelay?: number;

  /**
   * Backoff strategy for retries.
   * Default: "fixed"
   */
  backoff?: "fixed" | "linear" | "exponential";

  /**
   * Custom error handler for this specific handler.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errorHandler?: (error: Error, event: any) => void;
}

/**
 * Options for @When() decorator (conditional execution).
 */
export interface WhenOptions<T = unknown> {
  /**
   * Condition function that determines if handler should run.
   */
  condition: (event: T) => boolean | Promise<boolean>;

  /**
   * Optional reason for the condition (for debugging).
   */
  reason?: string;
}

// ============================================================================
// Event Emitter Interface
// ============================================================================

/**
 * Event emitter service interface.
 *
 * @example
 * ```typescript
 * @inject(IEventEmitter)
 * private eventEmitter: IEventEmitter;
 *
 * async createUser(data: CreateUserDto) {
 *   const user = await this.userRepo.create(data);
 *   await this.eventEmitter.emit(new UserCreatedEvent(user.id, user.email));
 *   return user;
 * }
 * ```
 */
export interface IEventEmitter {
  /**
   * Emit an event to all registered handlers.
   *
   * @param event - Event instance to emit
   * @returns Promise that resolves when all sync handlers complete
   *
   * @example
   * ```typescript
   * await eventEmitter.emit(new UserCreatedEvent("123", "user@example.com"));
   * ```
   */
  emit<T>(event: T): Promise<void>;

  /**
   * Emit an event and wait for all handlers (including async) to complete.
   *
   * @param event - Event instance to emit
   * @returns Promise that resolves when ALL handlers complete
   *
   * @example
   * ```typescript
   * await eventEmitter.emitAndWait(new UserCreatedEvent("123", "user@example.com"));
   * // All handlers, including async ones, have completed
   * ```
   */
  emitAndWait<T>(event: T): Promise<void>;

  /**
   * Emit multiple events in sequence.
   *
   * @param events - Array of events to emit
   * @returns Promise that resolves when all events are emitted
   */
  emitMany<T>(events: Array<T>): Promise<void>;

  /**
   * Check if there are any handlers for an event type.
   *
   * @param eventClass - Event class to check
   * @returns true if handlers exist
   */
  hasHandlers<T>(eventClass: EventClass<T>): boolean;

  /**
   * Get the number of handlers for an event type.
   *
   * @param eventClass - Event class to check
   * @returns Number of registered handlers
   */
  handlerCount<T>(eventClass: EventClass<T>): number;
}

// ============================================================================
// Event Registry Interface
// ============================================================================

/**
 * Registered handler information.
 */
export interface RegisteredHandler<T = unknown> {
  /**
   * Handler class.
   */
  handlerClass: EventHandlerClass<T>;

  /**
   * Event class this handler listens to.
   */
  eventClass: EventClass<T>;

  /**
   * Handler options.
   */
  options: OnEventOptions;

  /**
   * Conditional execution predicate.
   */
  condition?: WhenOptions<T>;

  /**
   * Multiple event classes for @OnEvents().
   */
  eventClasses?: Array<EventClass>;
}

/**
 * Event registry interface for managing handlers.
 */
export interface IEventRegistry {
  /**
   * Register a handler for an event.
   */
  register<T>(
    eventClass: EventClass<T>,
    handlerClass: EventHandlerClass<T>,
    options?: OnEventOptions,
  ): void;

  /**
   * Register a handler for multiple events.
   */
  registerMultiple<T>(
    eventClasses: Array<EventClass>,
    handlerClass: EventHandlerClass<T>,
    options?: OnEventOptions,
  ): void;

  /**
   * Get all handlers for an event class.
   */
  getHandlers<T>(eventClass: EventClass<T>): Array<RegisteredHandler<T>>;

  /**
   * Get all registered handlers.
   */
  getAllHandlers(): Array<RegisteredHandler>;

  /**
   * Check if a handler is registered.
   */
  hasHandler<T>(
    eventClass: EventClass<T>,
    handlerClass: EventHandlerClass<T>,
  ): boolean;

  /**
   * Unregister a handler.
   */
  unregister<T>(
    eventClass: EventClass<T>,
    handlerClass: EventHandlerClass<T>,
  ): void;

  /**
   * Clear all handlers.
   */
  clear(): void;
}

// ============================================================================
// Event Recorder Interface
// ============================================================================

/**
 * Recorded event with metadata.
 */
export interface RecordedEvent<T = unknown> {
  /**
   * Unique event ID.
   */
  id: string;

  /**
   * Event class/type.
   */
  type: EventClass<T>;

  /**
   * Event type name (string).
   */
  typeName: string;

  /**
   * Event data.
   */
  data: T;

  /**
   * Timestamp when event was recorded.
   */
  timestamp: number;

  /**
   * Request/correlation ID (if available).
   */
  correlationId?: string;

  /**
   * Handler results.
   */
  handlerResults?: Array<{
    handler: string;
    duration: number;
    success: boolean;
    error?: string;
  }>;
}

/**
 * Event replay options.
 */
export interface ReplayOptions {
  /**
   * Start timestamp (inclusive).
   */
  fromTimestamp?: number;

  /**
   * End timestamp (inclusive).
   */
  toTimestamp?: number;

  /**
   * Filter by event types.
   */
  eventTypes?: Array<EventClass>;

  /**
   * Custom filter function.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filter?: (event: RecordedEvent<any>) => boolean;

  /**
   * Replay speed multiplier.
   * 1 = real-time, 2 = 2x speed, 0 = instant
   */
  speed?: number;
}

/**
 * Event recorder interface for replay and debugging.
 */
export interface IEventRecorder {
  /**
   * Start recording events.
   */
  startRecording(): void;

  /**
   * Stop recording events.
   */
  stopRecording(): void;

  /**
   * Check if currently recording.
   */
  isRecording(): boolean;

  /**
   * Record an event.
   */
  record<T>(event: T, handlerResults?: RecordedEvent["handlerResults"]): void;

  /**
   * Get all recorded events.
   */
  getRecordedEvents(): Array<RecordedEvent>;

  /**
   * Replay recorded events.
   */
  replay(options?: ReplayOptions): Promise<void>;

  /**
   * Export recorded events.
   */
  export(format: "json" | "csv" | "timeline"): string;

  /**
   * Clear recorded events.
   */
  clear(): void;
}

// ============================================================================
// Event Flow Tracker Interface
// ============================================================================

/**
 * Event flow node.
 */
export interface EventFlowNode {
  /**
   * Event type name.
   */
  name: string;

  /**
   * Timestamp when event occurred.
   */
  timestamp: number;

  /**
   * Handlers that processed this event.
   */
  handlers: Array<string>;

  /**
   * Total duration of all handlers.
   */
  duration: number;

  /**
   * Child events triggered by handlers.
   */
  children?: Array<EventFlowNode>;
}

/**
 * Event flow for a request.
 */
export interface EventFlow {
  /**
   * Request/correlation ID.
   */
  requestId: string;

  /**
   * Root events and their propagation.
   */
  events: Array<EventFlowNode>;

  /**
   * Total duration.
   */
  totalDuration: number;

  /**
   * Visualize the flow as ASCII art.
   */
  visualize(): string;
}

/**
 * Event flow tracker interface.
 */
export interface IEventFlowTracker {
  /**
   * Start tracking a new flow.
   */
  startFlow(requestId: string): void;

  /**
   * Record an event in the current flow.
   */
  recordEvent(
    requestId: string,
    eventName: string,
    handlers: Array<string>,
    duration: number,
  ): void;

  /**
   * End tracking for a flow.
   */
  endFlow(requestId: string): EventFlow;

  /**
   * Get flow for a request.
   */
  getFlow(requestId: string): EventFlow | undefined;

  /**
   * Clear all flows.
   */
  clear(): void;
}

// ============================================================================
// Handler Execution Result
// ============================================================================

/**
 * Result of executing a handler.
 */
export interface HandlerExecutionResult {
  /**
   * Handler class name.
   */
  handler: string;

  /**
   * Whether execution was successful.
   */
  success: boolean;

  /**
   * Execution duration in milliseconds.
   */
  duration: number;

  /**
   * Error if execution failed.
   */
  error?: Error;

  /**
   * Number of retries attempted.
   */
  retries?: number;

  /**
   * Whether handler was skipped due to condition.
   */
  skipped?: boolean;

  /**
   * Reason for skipping.
   */
  skipReason?: string;
}

// ============================================================================
// Event System Configuration
// ============================================================================

/**
 * Event system configuration options.
 */
export interface EventSystemConfig {
  /**
   * Enable event recording (default: only in development).
   */
  enableRecording?: boolean;

  /**
   * Enable flow tracking (default: only in development).
   */
  enableFlowTracking?: boolean;

  /**
   * Maximum recorded events to keep.
   * Default: 1000
   */
  maxRecordedEvents?: number;

  /**
   * Default handler timeout in milliseconds.
   * Default: 30000 (30s)
   */
  defaultTimeout?: number;

  /**
   * Global error handler for unhandled errors.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onError?: (error: Error, event: any, handler: string) => void;

  /**
   * Called when an event is emitted.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEmit?: (event: any) => void;

  /**
   * Called when a handler completes.
   */
  onHandlerComplete?: (result: HandlerExecutionResult) => void;
}

// ============================================================================
// Decorator Metadata Keys
// ============================================================================

/**
 * Metadata keys for event decorators.
 */
export const EVENT_METADATA = {
  EVENT_CLASS: Symbol("expressots:event:class"),
  EVENT_CLASSES: Symbol("expressots:event:classes"),
  EVENT_OPTIONS: Symbol("expressots:event:options"),
  EVENT_CONDITION: Symbol("expressots:event:condition"),
  IS_EVENT_HANDLER: Symbol("expressots:event:is-handler"),
} as const;

