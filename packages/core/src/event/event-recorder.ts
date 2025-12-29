/**
 * Event Recorder
 *
 * @module event
 *
 * Records events for replay and debugging.
 * Enabled by default in development mode.
 *
 * @example
 * ```typescript
 * const recorder = container.get(EventRecorder);
 *
 * // Replay last minute of events
 * await recorder.replay({
 *   fromTimestamp: Date.now() - 60000,
 * });
 *
 * // Replay only UserCreatedEvent events
 * await recorder.replay({
 *   eventTypes: [UserCreatedEvent],
 * });
 *
 * // Export event timeline
 * const timeline = recorder.export("timeline");
 * console.log(timeline);
 * ```
 */

import { injectable } from "../di/inversify";
import {
  EventClass,
  IEventRecorder,
  RecordedEvent,
  ReplayOptions,
} from "./event.interfaces";

/**
 * Generate a unique ID.
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Event recorder implementation.
 *
 * NOTE: This class uses @injectable() instead of @provide() because
 * it must be registered as a Singleton by the application to ensure
 * all events are recorded in the same instance.
 */
@injectable()
export class EventRecorder implements IEventRecorder {
  private events: Array<RecordedEvent> = [];
  private recording: boolean = false;
  private maxEvents: number = 1000;
  private replayEmitter?: (event: unknown) => Promise<void>;

  constructor() {
    // Start recording in development by default
    if (process.env.NODE_ENV === "development") {
      this.startRecording();
    }
  }

  /**
   * Configure the recorder.
   */
  configure(options: {
    maxEvents?: number;
    autoStart?: boolean;
  }): void {
    if (options.maxEvents !== undefined) {
      this.maxEvents = options.maxEvents;
    }
    if (options.autoStart) {
      this.startRecording();
    }
  }

  /**
   * Set the emitter function for replay.
   */
  setReplayEmitter(emitter: (event: unknown) => Promise<void>): void {
    this.replayEmitter = emitter;
  }

  /**
   * Start recording events.
   */
  startRecording(): void {
    this.recording = true;
  }

  /**
   * Stop recording events.
   */
  stopRecording(): void {
    this.recording = false;
  }

  /**
   * Check if currently recording.
   */
  isRecording(): boolean {
    return this.recording;
  }

  /**
   * Record an event.
   */
  record<T>(
    event: T,
    handlerResults?: RecordedEvent["handlerResults"],
  ): void {
    if (!this.recording) {
      return;
    }

    const eventClass = event?.constructor as EventClass<T>;

    const recorded: RecordedEvent<T> = {
      id: generateId(),
      type: eventClass,
      typeName: eventClass?.name || "UnknownEvent",
      data: event,
      timestamp: Date.now(),
      handlerResults,
    };

    this.events.push(recorded as RecordedEvent);

    // Trim if over max
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  /**
   * Get all recorded events.
   */
  getRecordedEvents(): Array<RecordedEvent> {
    return [...this.events];
  }

  /**
   * Get events filtered by type.
   */
  getEventsByType<T>(eventClass: EventClass<T>): Array<RecordedEvent<T>> {
    return this.events.filter(
      (e) => e.type === eventClass,
    ) as Array<RecordedEvent<T>>;
  }

  /**
   * Get events in a time range.
   */
  getEventsInRange(
    from: number,
    to: number = Date.now(),
  ): Array<RecordedEvent> {
    return this.events.filter(
      (e) => e.timestamp >= from && e.timestamp <= to,
    );
  }

  /**
   * Replay recorded events.
   */
  async replay(options: ReplayOptions = {}): Promise<void> {
    if (!this.replayEmitter) {
      throw new Error(
        "Replay emitter not set. Call setReplayEmitter() first.",
      );
    }

    // Filter events
    let filtered = [...this.events];

    if (options.fromTimestamp !== undefined) {
      filtered = filtered.filter((e) => e.timestamp >= options.fromTimestamp!);
    }

    if (options.toTimestamp !== undefined) {
      filtered = filtered.filter((e) => e.timestamp <= options.toTimestamp!);
    }

    if (options.eventTypes && options.eventTypes.length > 0) {
      filtered = filtered.filter((e) =>
        options.eventTypes!.includes(e.type),
      );
    }

    if (options.filter) {
      filtered = filtered.filter(options.filter);
    }

    // Sort by timestamp
    filtered.sort((a, b) => a.timestamp - b.timestamp);

    // Replay events
    const speed = options.speed ?? 0;
    let lastTimestamp = filtered.length > 0 ? filtered[0].timestamp : 0;

    for (const event of filtered) {
      // Apply speed delay
      if (speed > 0 && event.timestamp > lastTimestamp) {
        const delay = (event.timestamp - lastTimestamp) / speed;
        await new Promise((resolve) => {
          const timer = setTimeout(resolve, delay);
          timer.unref();
        });
      }
      lastTimestamp = event.timestamp;

      // Replay the event
      await this.replayEmitter(event.data);
    }
  }

  /**
   * Export recorded events.
   */
  export(format: "json" | "csv" | "timeline"): string {
    switch (format) {
      case "json":
        return this.exportJson();
      case "csv":
        return this.exportCsv();
      case "timeline":
        return this.exportTimeline();
      default:
        return this.exportJson();
    }
  }

  /**
   * Export as JSON.
   */
  private exportJson(): string {
    return JSON.stringify(
      this.events.map((e) => ({
        id: e.id,
        type: e.typeName,
        data: e.data,
        timestamp: e.timestamp,
        date: new Date(e.timestamp).toISOString(),
        handlerResults: e.handlerResults,
      })),
      null,
      2,
    );
  }

  /**
   * Export as CSV.
   */
  private exportCsv(): string {
    const lines: Array<string> = [
      "id,type,timestamp,date,handlers,success",
    ];

    for (const event of this.events) {
      const handlers = event.handlerResults?.map((h) => h.handler).join(";") || "";
      const success = event.handlerResults?.every((h) => h.success) ?? true;

      lines.push(
        `${event.id},${event.typeName},${event.timestamp},${new Date(event.timestamp).toISOString()},${handlers},${success}`,
      );
    }

    return lines.join("\n");
  }

  /**
   * Export as ASCII timeline.
   */
  private exportTimeline(): string {
    if (this.events.length === 0) {
      return "No events recorded.";
    }

    const lines: Array<string> = [
      "Event Timeline",
      "═".repeat(60),
      "",
    ];

    let lastTimestamp = 0;

    for (const event of this.events) {
      // Calculate time delta
      const delta = lastTimestamp > 0
        ? `+${event.timestamp - lastTimestamp}ms`
        : "START";
      lastTimestamp = event.timestamp;

      // Format timestamp
      const time = new Date(event.timestamp).toISOString().substring(11, 23);

      // Build event line
      const handlers = event.handlerResults?.length || 0;
      const success = event.handlerResults?.every((h) => h.success) ?? true;
      const status = success ? "✓" : "✗";
      const duration = event.handlerResults?.reduce(
        (sum, h) => sum + h.duration,
        0,
      ) || 0;

      lines.push(
        `${time} │ ${status} ${event.typeName.padEnd(30)} │ ${handlers} handlers │ ${duration}ms │ ${delta}`,
      );

      // Add handler details
      if (event.handlerResults) {
        for (const handler of event.handlerResults) {
          const handlerStatus = handler.success ? "  ✓" : "  ✗";
          lines.push(
            `           │ ${handlerStatus} ${handler.handler.padEnd(28)} │ ${handler.duration}ms`,
          );
        }
      }
    }

    lines.push("");
    lines.push("═".repeat(60));
    lines.push(`Total: ${this.events.length} events`);

    return lines.join("\n");
  }

  /**
   * Clear recorded events.
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Get event count.
   */
  count(): number {
    return this.events.length;
  }

  /**
   * Get latest event.
   */
  latest(): RecordedEvent | undefined {
    return this.events[this.events.length - 1];
  }

  /**
   * Get first event.
   */
  first(): RecordedEvent | undefined {
    return this.events[0];
  }
}

/**
 * Create a standalone event recorder (for testing).
 */
export function createEventRecorder(): EventRecorder {
  return new EventRecorder();
}

