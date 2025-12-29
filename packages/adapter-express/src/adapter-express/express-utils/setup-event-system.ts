import {
  interfaces,
  Container,
  EventRegistry,
  EventEmitter,
  EventRecorder,
  EventFlowTracker,
  EventSystemConfig,
} from "@expressots/core";

/**
 * Configuration options for the event system setup.
 *
 * @public API
 */
export interface EventSystemOptions {
  /**
   * Enable event recording for debugging.
   * When true, all emitted events are recorded for later inspection or replay.
   * @default true in development, false in production
   */
  enableRecording?: boolean;

  /**
   * Enable flow tracking for event visualization.
   * When true, tracks the flow of events through handlers.
   * @default true in development, false in production
   */
  enableFlowTracking?: boolean;

  /**
   * Maximum number of events to keep in the recording buffer.
   * @default 1000
   */
  maxRecordedEvents?: number;

  /**
   * Default timeout for handler execution in milliseconds.
   * @default 30000
   */
  defaultTimeout?: number;

  /**
   * Auto-discover event handlers from the container.
   * When true, scans the container for @OnEvent decorated handlers.
   * @default true
   */
  autoDiscover?: boolean;

  /**
   * Callback when an event is emitted.
   */
  onEmit?: (event: unknown) => void;

  /**
   * Callback when a handler completes execution.
   */
  onHandlerComplete?: (result: { handler: string; success: boolean; duration: number }) => void;

  /**
   * Custom error handler for handler failures.
   */
  onError?: (error: Error, event: unknown, handlerName: string) => void;
}

/**
 * Result of event system setup.
 *
 * @public API
 */
export interface EventSystemSetupResult {
  /**
   * The event registry instance.
   */
  registry: EventRegistry;

  /**
   * The event emitter instance.
   */
  emitter: EventEmitter;

  /**
   * The event recorder instance (if recording is enabled).
   */
  recorder: EventRecorder;

  /**
   * The flow tracker instance (if flow tracking is enabled).
   */
  flowTracker: EventFlowTracker;

  /**
   * Number of event handlers discovered.
   */
  handlersDiscovered: number;
}

/**
 * Set up the ExpressoTS Event System with zero boilerplate.
 *
 * This function:
 * 1. Registers all event system services (EventRegistry, EventEmitter, EventRecorder, EventFlowTracker)
 * 2. Auto-discovers and registers all @OnEvent decorated handlers
 * 3. Configures recording and flow tracking based on environment
 * 4. Sets up replay emitter for development debugging
 *
 * @param container - The DI container
 * @param options - Configuration options for the event system
 * @returns Setup result with references to all event system services
 *
 * @example
 * ```typescript
 * export class App extends AppExpress {
 *   async configureServices(): Promise<void> {
 *     // Simple setup with defaults (recommended)
 *     const { handlersDiscovered } = setupEventSystemForExpress(
 *       this.config.Container
 *     );
 *     console.log(`Discovered ${handlersDiscovered} event handlers`);
 *
 *     // Or with custom options
 *     setupEventSystemForExpress(this.config.Container, {
 *       enableRecording: true,
 *       maxRecordedEvents: 500,
 *       defaultTimeout: 10000,
 *       onError: (error, event, handler) => {
 *         console.error(`Handler ${handler} failed:`, error);
 *       }
 *     });
 *   }
 * }
 * ```
 *
 * @public API
 */
export function setupEventSystemForExpress(
  container: interfaces.Container,
  options: EventSystemOptions = {},
): EventSystemSetupResult {
  const isDev = process.env.NODE_ENV === "development" || process.env.NODE_ENV === undefined;

  // Default options
  const config: EventSystemOptions = {
    enableRecording: isDev,
    enableFlowTracking: isDev,
    maxRecordedEvents: 1000,
    defaultTimeout: 30000,
    autoDiscover: true,
    ...options,
  };

  // Register EventRegistry (singleton)
  if (!container.isBound(EventRegistry)) {
    container.bind(EventRegistry).toSelf().inSingletonScope();
  }

  // Register EventEmitter (singleton)
  if (!container.isBound(EventEmitter)) {
    container.bind(EventEmitter).toSelf().inSingletonScope();
  }

  // Register EventRecorder (singleton)
  if (!container.isBound(EventRecorder)) {
    container.bind(EventRecorder).toSelf().inSingletonScope();
  }

  // Register EventFlowTracker (singleton)
  if (!container.isBound(EventFlowTracker)) {
    container.bind(EventFlowTracker).toSelf().inSingletonScope();
  }

  // Get instances
  const registry = container.get(EventRegistry);
  const emitter = container.get(EventEmitter);
  const recorder = container.get(EventRecorder);
  const flowTracker = container.get(EventFlowTracker);

  // Auto-discover event handlers
  let handlersDiscovered = 0;
  if (config.autoDiscover) {
    handlersDiscovered = registry.discoverHandlers(container as Container);
  }

  // Configure emitter
  const emitterConfig: Partial<EventSystemConfig> = {
    enableRecording: config.enableRecording,
    enableFlowTracking: config.enableFlowTracking,
    maxRecordedEvents: config.maxRecordedEvents,
    defaultTimeout: config.defaultTimeout,
  };

  if (config.onEmit) {
    emitterConfig.onEmit = config.onEmit;
  }
  if (config.onHandlerComplete) {
    emitterConfig.onHandlerComplete = config.onHandlerComplete;
  }
  if (config.onError) {
    emitterConfig.onError = config.onError;
  }

  emitter.configure(emitterConfig);

  // Configure recorder
  recorder.configure({
    maxEvents: config.maxRecordedEvents || 1000,
    autoStart: config.enableRecording,
  });

  // Set up replay emitter (so recorded events can be replayed)
  recorder.setReplayEmitter(async (event) => {
    await emitter.emit(event);
  });

  return {
    registry,
    emitter,
    recorder,
    flowTracker,
    handlersDiscovered,
  };
}
