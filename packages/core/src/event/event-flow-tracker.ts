/**
 * Event Flow Tracker
 *
 * @module event
 *
 * Tracks event propagation flow for debugging and visualization.
 *
 * @example
 * ```typescript
 * const tracker = container.get(EventFlowTracker);
 * const flow = tracker.getFlow(requestId);
 * console.log(flow.visualize());
 *
 * // Output:
 * // UserCreatedEvent (234ms)
 * // ├─> SendWelcomeEmail (100ms)
 * // │   └─> WelcomeEmailSentEvent (50ms)
 * // │       └─> LogAnalytics (5ms)
 * // └─> CreateUserProfile (130ms)
 * //     └─> UserProfileCreatedEvent (10ms)
 * ```
 */

import { injectable } from "../di/inversify.js";
import {
  EventFlow,
  EventFlowNode,
  IEventFlowTracker,
} from "./event.interfaces.js";

/**
 * Event flow tracker implementation.
 *
 * NOTE: This class uses @injectable() instead of @provide() because
 * it must be registered as a Singleton by the application to ensure
 * all event flows are tracked in the same instance.
 */
@injectable()
export class EventFlowTracker implements IEventFlowTracker {
  private flows: Map<string, FlowState> = new Map();
  private maxFlows: number = 100;

  /**
   * Configure the tracker.
   */
  configure(options: { maxFlows?: number }): void {
    if (options.maxFlows !== undefined) {
      this.maxFlows = options.maxFlows;
    }
  }

  /**
   * Start tracking a new flow.
   */
  startFlow(requestId: string): void {
    // Clean up old flows if at capacity
    if (this.flows.size >= this.maxFlows) {
      const oldest = Array.from(this.flows.keys())[0];
      this.flows.delete(oldest);
    }

    this.flows.set(requestId, {
      requestId,
      startTime: Date.now(),
      events: [],
    });
  }

  /**
   * Record an event in the current flow.
   */
  recordEvent(
    requestId: string,
    eventName: string,
    handlers: Array<string>,
    duration: number,
  ): void {
    const flow = this.flows.get(requestId);
    if (!flow) {
      return;
    }

    const node: EventFlowNode = {
      name: eventName,
      timestamp: Date.now(),
      handlers,
      duration,
      children: [],
    };

    // Add to flow
    if (flow.currentEvent) {
      // This is a child event triggered by a handler
      if (!flow.currentEvent.children) {
        flow.currentEvent.children = [];
      }
      flow.currentEvent.children.push(node);
    } else {
      // This is a root event
      flow.events.push(node);
    }
  }

  /**
   * Push an event onto the stack (for tracking nested events).
   */
  pushEvent(requestId: string, eventName: string): void {
    const flow = this.flows.get(requestId);
    if (!flow) {
      return;
    }

    const node: EventFlowNode = {
      name: eventName,
      timestamp: Date.now(),
      handlers: [],
      duration: 0,
    };

    if (flow.currentEvent) {
      // This is a child event
      if (!flow.currentEvent.children) {
        flow.currentEvent.children = [];
      }
      flow.currentEvent.children.push(node);
    } else {
      flow.events.push(node);
    }

    // Make this the current event (for tracking children)
    // Store parent reference for popping
    (node as EventFlowNodeWithParent)._parent = flow.currentEvent;
    flow.currentEvent = node;
  }

  /**
   * Pop the current event from the stack.
   */
  popEvent(requestId: string, handlers: Array<string>, duration: number): void {
    const flow = this.flows.get(requestId);
    if (!flow || !flow.currentEvent) {
      return;
    }

    flow.currentEvent.handlers = handlers;
    flow.currentEvent.duration = duration;

    // Pop to parent
    const parent = (flow.currentEvent as EventFlowNodeWithParent)._parent;
    flow.currentEvent = parent;
  }

  /**
   * End tracking for a flow.
   */
  endFlow(requestId: string): EventFlow {
    const flow = this.flows.get(requestId);
    if (!flow) {
      return this.createEmptyFlow(requestId);
    }

    const totalDuration = Date.now() - flow.startTime;

    return {
      requestId,
      events: flow.events,
      totalDuration,
      visualize: () => this.visualizeFlow(flow.events, totalDuration),
    };
  }

  /**
   * Get flow for a request.
   */
  getFlow(requestId: string): EventFlow | undefined {
    const flow = this.flows.get(requestId);
    if (!flow) {
      return undefined;
    }

    const totalDuration = Date.now() - flow.startTime;

    return {
      requestId,
      events: flow.events,
      totalDuration,
      visualize: () => this.visualizeFlow(flow.events, totalDuration),
    };
  }

  /**
   * Clear all flows.
   */
  clear(): void {
    this.flows.clear();
  }

  /**
   * Get active flow count.
   */
  activeFlowCount(): number {
    return this.flows.size;
  }

  /**
   * Create an empty flow.
   */
  private createEmptyFlow(requestId: string): EventFlow {
    return {
      requestId,
      events: [],
      totalDuration: 0,
      visualize: () => "No events recorded for this flow.",
    };
  }

  /**
   * Visualize a flow as ASCII art.
   */
  private visualizeFlow(
    events: Array<EventFlowNode>,
    totalDuration: number,
  ): string {
    if (events.length === 0) {
      return "No events recorded.";
    }

    const lines: Array<string> = [];

    for (let i = 0; i < events.length; i++) {
      this.visualizeNode(events[i], lines, "", i === events.length - 1);
    }

    lines.push("");
    lines.push(`Total Duration: ${totalDuration}ms`);

    return lines.join("\n");
  }

  /**
   * Visualize a single node and its children.
   */
  private visualizeNode(
    node: EventFlowNode,
    lines: Array<string>,
    prefix: string,
    isLast: boolean,
  ): void {
    // Build the connector
    const connector = isLast ? "└─>" : "├─>";
    const handlerList =
      node.handlers.length > 0 ? ` [${node.handlers.join(", ")}]` : "";

    lines.push(
      `${prefix}${connector} ${node.name} (${node.duration}ms)${handlerList}`,
    );

    // Visualize children
    if (node.children && node.children.length > 0) {
      const childPrefix = prefix + (isLast ? "    " : "│   ");
      for (let i = 0; i < node.children.length; i++) {
        this.visualizeNode(
          node.children[i],
          lines,
          childPrefix,
          i === node.children.length - 1,
        );
      }
    }
  }
}

/**
 * Internal interface for tracking parent references.
 */
interface EventFlowNodeWithParent extends EventFlowNode {
  _parent?: EventFlowNode;
}

/**
 * Internal interface for flow state.
 */
interface FlowState {
  requestId: string;
  startTime: number;
  events: Array<EventFlowNode>;
  currentEvent?: EventFlowNode;
}

/**
 * Create a standalone event flow tracker (for testing).
 */
export function createEventFlowTracker(): EventFlowTracker {
  return new EventFlowTracker();
}
