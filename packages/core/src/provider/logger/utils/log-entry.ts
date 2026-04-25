import { LogLevel } from "./log-levels.js";
import { RequestFlow } from "../logger.flow.js";

/**
 * Trace information for request context.
 * @public API
 */
export interface LogTrace {
  /** Unique request identifier */
  requestId?: string;
  /** User identifier (from principal) */
  userId?: string;
  /** Tenant identifier (from custom scopes) */
  tenantId?: string;
  /** HTTP method */
  method?: string;
  /** HTTP path */
  path?: string;
  /** Client IP address */
  ip?: string;
  /** User agent string */
  userAgent?: string;
  /** Additional custom trace data */
  [key: string]: unknown;
}

/**
 * Performance metrics for a log entry.
 * @public API
 */
export interface PerformanceData {
  /** Duration in milliseconds */
  duration?: number;
  /** Memory delta in bytes */
  memoryDelta?: number;
  /** CPU usage percentage */
  cpuUsage?: number;
}

/**
 * Standardized log entry structure.
 * @public API
 */
export interface LogEntry {
  /** Timestamp when log was created */
  timestamp: Date;
  /** Log level */
  level: LogLevel;
  /** Log message */
  message: string;
  /** Context/module name (e.g., class name, service name) */
  context?: string;
  /** Structured data/metadata */
  data?: unknown;
  /** Error object (if logging an error) */
  error?: Error | unknown;
  /** Request trace information */
  trace?: LogTrace;
  /** Performance metrics */
  performance?: PerformanceData;
  /** Request flow visualization data */
  flow?: RequestFlow;
  /** Process ID */
  pid?: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Create a log entry with defaults.
 * @param level - Log level
 * @param message - Log message
 * @param options - Additional options
 * @returns LogEntry
 * @public API
 */
export function createLogEntry(
  level: LogLevel,
  message: string,
  options?: {
    context?: string;
    data?: unknown;
    error?: Error | unknown;
    trace?: LogTrace;
    performance?: PerformanceData;
    flow?: RequestFlow;
    pid?: number;
    metadata?: Record<string, unknown>;
  },
): LogEntry {
  return {
    timestamp: new Date(),
    level,
    message,
    context: options?.context,
    data: options?.data,
    error: options?.error,
    trace: options?.trace,
    performance: options?.performance,
    flow: options?.flow,
    pid: options?.pid ?? process.pid,
    metadata: options?.metadata,
  };
}
