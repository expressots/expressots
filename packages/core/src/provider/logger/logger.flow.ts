/**
 * @file logger.flow.ts
 * @description Request flow tracking and visualization system
 * @module @expressots/core
 *
 * Features:
 * - Track request flow through middleware, guards, controllers
 * - Structured JSON data for web UI consumption
 * - ASCII visualization for console display
 * - Timing data for each step
 * - Memory tracking
 */

/**
 * Type of flow step.
 * @public API
 */
export type FlowStepType =
  | "middleware"
  | "guard"
  | "validation"
  | "controller"
  | "use-case"
  | "exception-filter"
  | "response";

/**
 * Status of a flow step.
 * @public API
 */
export type FlowStepStatus = "success" | "failure" | "skipped";

/**
 * A single step in the request flow.
 * @public API
 */
export interface FlowStep {
  /** Type of step */
  type: FlowStepType;
  /** Name/identifier of the step */
  name: string;
  /** Duration in milliseconds */
  duration: number;
  /** Status of the step */
  status: FlowStepStatus;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Nested child steps (for complex flows) */
  children?: Array<FlowStep>;
  /** Start time (high-resolution timestamp) */
  startTime: number;
  /** End time (high-resolution timestamp) */
  endTime: number;
}

/**
 * Complete request flow data.
 * @public API
 */
export interface RequestFlow {
  /** Unique request identifier */
  requestId: string;
  /** HTTP method */
  method: string;
  /** HTTP path */
  path: string;
  /** Request start time (high-resolution timestamp) */
  startTime: number;
  /** Request end time (high-resolution timestamp) */
  endTime: number;
  /** Total duration in milliseconds */
  totalDuration: number;
  /** Flow steps */
  steps: Array<FlowStep>;
  /** Memory delta in bytes */
  memoryDelta: number;
  /** HTTP status code */
  statusCode?: number;
  /** Error if request failed */
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };
}

/**
 * Configuration for flow tracking.
 * @public API
 */
export interface FlowConfig {
  /** Enable flow tracking */
  enabled: boolean;
  /** Show flow visualization in console (dev mode) */
  showVisualization: boolean;
  /** Minimum duration to show flow (ms) - only show slow requests */
  minDuration?: number;
  /** Track memory usage */
  trackMemory: boolean;
  /** Track nested steps */
  trackNested: boolean;
}

/**
 * Default flow configuration.
 */
export function getDefaultFlowConfig(): FlowConfig {
  const isDevelopment = process.env.NODE_ENV !== "production";
  return {
    enabled: isDevelopment, // Enabled in dev, disabled in prod by default
    showVisualization: isDevelopment,
    trackMemory: true,
    trackNested: true,
  };
}

/**
 * Flow tracker for a single request.
 * Tracks the complete lifecycle of a request through the application.
 * @public API
 */
export class FlowTracker {
  private flow: RequestFlow;
  private currentStep: FlowStep | null = null;
  private stepStack: Array<FlowStep> = [];
  private config: FlowConfig;
  private startMemory: number;

  /**
   * Create a new flow tracker for a request.
   */
  constructor(
    requestId: string,
    method: string,
    path: string,
    config?: Partial<FlowConfig>,
  ) {
    this.config = { ...getDefaultFlowConfig(), ...config };
    this.startMemory = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    this.flow = {
      requestId,
      method,
      path,
      startTime,
      endTime: startTime,
      totalDuration: 0,
      steps: [],
      memoryDelta: 0,
    };
  }

  /**
   * Start tracking a new step.
   */
  startStep(
    type: FlowStepType,
    name: string,
    metadata?: Record<string, unknown>,
  ): void {
    if (!this.config.enabled) {
      return;
    }

    const startTime = performance.now();
    const step: FlowStep = {
      type,
      name,
      duration: 0,
      status: "success",
      metadata,
      children: this.config.trackNested ? [] : undefined,
      startTime,
      endTime: startTime,
    };

    if (this.currentStep && this.config.trackNested) {
      // Add as child of current step
      if (!this.currentStep.children) {
        this.currentStep.children = [];
      }
      this.currentStep.children.push(step);
      this.stepStack.push(this.currentStep);
    } else {
      // Add as top-level step
      this.flow.steps.push(step);
    }

    this.currentStep = step;
  }

  /**
   * End the current step.
   */
  endStep(status: FlowStepStatus = "success", error?: Error): void {
    if (!this.config.enabled || !this.currentStep) {
      return;
    }

    const endTime = performance.now();
    this.currentStep.endTime = endTime;
    this.currentStep.duration = endTime - this.currentStep.startTime;
    this.currentStep.status = status;

    if (error && this.currentStep.metadata) {
      this.currentStep.metadata.error = {
        message: error.message,
        name: error.name,
        stack: error.stack,
      };
    }

    // Pop from stack if we have nested steps
    if (this.stepStack.length > 0) {
      this.currentStep = this.stepStack.pop() || null;
    } else {
      this.currentStep = null;
    }
  }

  /**
   * Mark current step as skipped.
   */
  skipStep(): void {
    this.endStep("skipped");
  }

  /**
   * Mark current step as failed.
   */
  failStep(error?: Error): void {
    this.endStep("failure", error);
  }

  /**
   * Finalize the flow and return the complete flow data.
   */
  finalize(statusCode?: number, error?: Error): RequestFlow {
    if (!this.config.enabled) {
      return this.flow;
    }

    // End any remaining steps
    while (this.currentStep) {
      this.endStep("success");
    }

    const endTime = performance.now();
    this.flow.endTime = endTime;
    this.flow.totalDuration = endTime - this.flow.startTime;

    if (this.config.trackMemory) {
      const endMemory = process.memoryUsage().heapUsed;
      this.flow.memoryDelta = endMemory - this.startMemory;
    }

    if (statusCode !== undefined) {
      this.flow.statusCode = statusCode;
    }

    if (error) {
      this.flow.error = {
        message: error.message,
        name: error.name,
        stack: error.stack,
      };
    }

    return this.flow;
  }

  /**
   * Get the current flow data (without finalizing).
   */
  getFlow(): RequestFlow {
    return this.flow;
  }

  /**
   * Check if flow tracking is enabled.
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Check if visualization should be shown.
   */
  shouldShowVisualization(): boolean {
    if (!this.config.enabled || !this.config.showVisualization) {
      return false;
    }

    // Check min duration threshold
    if (this.config.minDuration !== undefined) {
      const currentDuration = performance.now() - this.flow.startTime;
      return currentDuration >= this.config.minDuration;
    }

    return true;
  }
}

/**
 * Flow tracker storage using AsyncLocalStorage for request-scoped tracking.
 */
class FlowTrackerStorage {
  private storage = new Map<string, FlowTracker>();

  /**
   * Store a flow tracker for a request.
   */
  set(requestId: string, tracker: FlowTracker): void {
    this.storage.set(requestId, tracker);
  }

  /**
   * Get a flow tracker for a request.
   */
  get(requestId: string): FlowTracker | undefined {
    return this.storage.get(requestId);
  }

  /**
   * Remove a flow tracker (cleanup).
   */
  remove(requestId: string): void {
    this.storage.delete(requestId);
  }

  /**
   * Clear all trackers (for testing/cleanup).
   */
  clear(): void {
    this.storage.clear();
  }
}

/**
 * Global flow tracker storage instance.
 */
const flowTrackerStorage = new FlowTrackerStorage();

/**
 * Get or create a flow tracker for a request.
 * @param requestId - Request identifier
 * @param method - HTTP method
 * @param path - HTTP path
 * @param config - Flow configuration
 * @returns FlowTracker instance
 * @public API
 */
export function getFlowTracker(
  requestId: string,
  method: string,
  path: string,
  config?: Partial<FlowConfig>,
): FlowTracker {
  let tracker = flowTrackerStorage.get(requestId);
  if (!tracker) {
    tracker = new FlowTracker(requestId, method, path, config);
    flowTrackerStorage.set(requestId, tracker);
  }
  return tracker;
}

/**
 * Get existing flow tracker for a request.
 * @param requestId - Request identifier
 * @returns FlowTracker instance or undefined
 * @public API
 */
export function findFlowTracker(requestId: string): FlowTracker | undefined {
  return flowTrackerStorage.get(requestId);
}

/**
 * Remove flow tracker (cleanup after request completes).
 * @param requestId - Request identifier
 * @public API
 */
export function removeFlowTracker(requestId: string): void {
  flowTrackerStorage.remove(requestId);
}
