import { injectable } from "../../di/inversify";
import { IProvider } from "../provider-manager";
import {
  LogLevel,
  LogLevelString,
  parseLogLevel,
  shouldLog,
} from "./utils/log-levels";
import { createLogEntry, LogTrace, LogEntry } from "./utils/log-entry";
import { LoggerConfig, getDefaultLoggerConfig } from "./logger.config";
import { ILogTransport } from "./transports/transport.interface";
import { ConsoleTransport } from "./transports/console.transport";
import { formatDev, formatGroupedDev, formatGroupedProd } from "./logger.formatter";
import { ContextManager, LogContext } from "./logger.context";
import {
  Timer,
  ITimer,
  PerformanceMetricsCollector,
  measurePerformance,
  measurePerformanceSync,
} from "./logger.performance";
import {
  LogGroupingManager,
  GroupedLogEntry,
} from "./logger.grouping";

/**
 * Enhanced Logger provider with structured logging, multiple levels, and pluggable transports.
 * Features:
 * - Automatic context detection (class/method names)
 * - Request-scoped context via AsyncLocalStorage
 * - Child logger creation with inherited context
 * - Multiple log levels (TRACE, DEBUG, INFO, WARN, ERROR, FATAL)
 * - Pluggable transports (console, file, HTTP)
 * @public API
 */
@injectable()
class Logger implements IProvider {
  private pid: number;
  private config: LoggerConfig;
  private transports: Array<ILogTransport> = [];
  private currentContext: string | undefined;
  private contextObject: Partial<LogContext> | undefined;
  private autoDetectContext: boolean = true;
  private groupingManager: LogGroupingManager | null = null;

  name: string = "Logger Provider";
  version: string = "4.1.0";
  author: string = "Richard Zampieri";
  repo: string = "https://github.com/expressots/expressots";

  constructor() {
    this.pid = process.pid;
    this.config = getDefaultLoggerConfig();
    // Initialize with default console transport if none provided
    if (this.config.transports.length === 0) {
      const isDevelopment = process.env.NODE_ENV !== "production";
      this.config.transports = [
        isDevelopment
          ? ConsoleTransport.forDevelopment()
          : ConsoleTransport.forProduction(),
      ];
    }
    this.transports = this.config.transports;
    // Initialize grouping manager with default config
    this.groupingManager = new LogGroupingManager(this.config.grouping);
  }

  /**
   * Configure the logger.
   * @param config - Partial configuration to merge with defaults
   * @public API
   */
  configure(config: Partial<LoggerConfig>): void {
    // Merge with existing config
    this.config = {
      ...this.config,
      ...config,
    };

    // Update level if provided
    if (config.level !== undefined) {
      const newLevel = parseLogLevel(config.level);
      this.config.level = newLevel;

      // Update all existing transports to use the new level
      // This ensures transports respect the logger's configured level
      // Only update transports that were created with default levels (DEBUG/INFO)
      // to avoid overriding explicit transport configurations
      for (const transport of this.transports) {
        const currentLevel = transport.level;
        // Update if it's a default level (DEBUG for dev, INFO for prod)
        // This allows dynamic level changes while preserving custom transport configs
        if (currentLevel === LogLevel.DEBUG || currentLevel === LogLevel.INFO) {
          transport.level = newLevel;
        }
      }
    }

    // Update transports if provided
    if (config.transports !== undefined) {
      this.transports = config.transports;
      this.config.transports = config.transports;
    }
  }

  /**
   * Log a trace message (ultra-detailed diagnostic).
   * @param message - The message to log
   * @param data - Optional structured data
   * @public API
   */
  trace(message: string, data?: unknown): void {
    this.log(LogLevel.TRACE, message, { data });
  }

  /**
   * Log a debug message (detailed diagnostic).
   * @param message - The message to log
   * @param data - Optional structured data
   * @public API
   */
  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, { data });
  }

  /**
   * Log an informational message.
   * @param message - The message to log
   * @param module - Optional module/context name (legacy API)
   * @param data - Optional structured data (new API)
   * @public API
   */
  info(message: string, module?: string, data?: unknown): void {
    // Support both legacy (module) and new (data) API
    if (module && typeof module === "string" && data === undefined) {
      // Legacy API: info(message, module)
      this.log(LogLevel.INFO, message, { context: module });
    } else {
      // New API: info(message, data) or info(message, module, data)
      const context = typeof module === "string" ? module : this.currentContext;
      this.log(LogLevel.INFO, message, {
        context,
        data: typeof module === "object" ? module : data,
      });
    }
  }

  /**
   * Log a warning message.
   * @param message - The message to log
   * @param module - Optional module/context name (legacy API)
   * @param data - Optional structured data (new API)
   * @public API
   */
  warn(message: string, module?: string, data?: unknown): void {
    // Support both legacy (module) and new (data) API
    if (module && typeof module === "string" && data === undefined) {
      // Legacy API: warn(message, module)
      this.log(LogLevel.WARN, message, { context: module });
    } else {
      // New API: warn(message, data) or warn(message, module, data)
      const context = typeof module === "string" ? module : this.currentContext;
      this.log(LogLevel.WARN, message, {
        context,
        data: typeof module === "object" ? module : data,
      });
    }
  }

  /**
   * Log an error message.
   * @param message - The message to log
   * @param module - Optional module/context name (legacy API)
   * @param error - Optional error object (new API)
   * @public API
   */
  error(message: string, module?: string, error?: Error | unknown): void {
    // Support both legacy (module) and new (error) API
    if (module && typeof module === "string" && error === undefined) {
      // Legacy API: error(message, module)
      this.log(LogLevel.ERROR, message, { context: module });
    } else {
      // New API: error(message, error) or error(message, module, error)
      // Handle case where module might be an Error object (new API: error(message, error))
      let context: string | undefined;
      let errorObj: Error | unknown | undefined;

      if (typeof module === "string") {
        // module is a string, error is the error object
        context = module;
        errorObj = error;
      } else if (module && typeof module === "object" && module !== null) {
        // module is actually an error object (new API: error(message, error))
        context = this.currentContext;
        errorObj = module as Error | unknown;
      } else {
        // module is undefined, use current context
        context = this.currentContext;
        errorObj = error;
      }

      this.log(LogLevel.ERROR, message, {
        context,
        error: errorObj,
      });
    }
  }

  /**
   * Log a fatal error message.
   * @param message - The message to log
   * @param error - Optional error object
   * @public API
   */
  fatal(message: string, error?: Error | unknown): void {
    this.log(LogLevel.FATAL, message, { error });
  }

  /**
   * Log a generic message (legacy API - maps to INFO).
   * @param message - The message to log
   * @param module - Optional module name
   * @public API
   */
  msg(message: string, module?: string): void {
    this.log(LogLevel.INFO, message, { context: module });
  }

  /**
   * Create a child logger with inherited context.
   * @param context - Context name for the child logger
   * @returns New Logger instance with context
   * @public API
   */
  child(context: string): Logger {
    const childLogger = new Logger();
    childLogger.configure(this.config);
    childLogger.currentContext = context;
    childLogger.contextObject = { ...this.contextObject, label: context };
    childLogger.autoDetectContext = this.autoDetectContext;
    return childLogger;
  }

  /**
   * Set context for subsequent logs.
   * @param context - Context name, object, or LogContext
   * @returns Logger instance for chaining
   * @public API
   *
   * @example
   * // String context
   * logger.withContext("UserService").info("User created");
   *
   * @example
   * // Object context
   * logger.withContext({ className: "UserService", methodName: "create" }).info("User created");
   *
   * @example
   * // Request context (typically set by middleware)
   * logger.withContext({ requestId: "req_123", userId: "user_456" }).info("Processing request");
   */
  withContext(context: string | Partial<LogContext>): Logger {
    // Create a new logger instance to avoid mutating the original
    const contextLogger = new Logger();
    contextLogger.configure(this.config);
    contextLogger.transports = this.transports;
    contextLogger.autoDetectContext = this.autoDetectContext;

    if (typeof context === "string") {
      contextLogger.currentContext = context;
      contextLogger.contextObject = { ...this.contextObject, label: context };
    } else {
      // Merge context objects
      contextLogger.contextObject = { ...this.contextObject, ...context };
      contextLogger.currentContext =
        context.className || context.label || this.currentContext;
    }

    return contextLogger;
  }

  /**
   * Disable automatic context detection for this logger.
   * @returns Logger instance for chaining
   * @public API
   */
  noAutoContext(): Logger {
    this.autoDetectContext = false;
    return this;
  }

  /**
   * Enable automatic context detection for this logger.
   * @returns Logger instance for chaining
   * @public API
   */
  enableAutoContext(): Logger {
    this.autoDetectContext = true;
    return this;
  }

  /**
   * Run a function with request-scoped context.
   * All logs within the function (including async operations) will include this context.
   * @param context - Context to use for the duration of the function
   * @param fn - Function to run
   * @returns Result of the function
   * @public API
   *
   * @example
   * await logger.runWithContext({ requestId: "req_123" }, async () => {
   *   logger.info("Processing..."); // Will include requestId
   *   await someAsyncOperation(); // Nested logs also include requestId
   * });
   */
  runWithContext<T>(
    context: Partial<LogContext>,
    fn: () => T | Promise<T>,
  ): T | Promise<T> {
    const fullContext = { ...this.contextObject, ...context };
    return ContextManager.runWithContext(fullContext as LogContext, fn);
  }

  /**
   * Core logging method.
   * Supports automatic context detection, request-scoped context, and manual context.
   * @param level - Log level
   * @param message - Log message
   * @param options - Additional options
   */
  private log(
    level: LogLevel,
    message: string,
    options?: {
      context?: string;
      data?: unknown;
      error?: Error | unknown;
      trace?: LogTrace;
      performance?: {
        duration?: number;
        memoryDelta?: number;
        cpuUsage?: number;
      };
    },
  ): void {
    const configuredLevel = parseLogLevel(this.config.level);

    if (!shouldLog(level, configuredLevel)) {
      return;
    }

    // Build context from multiple sources (in priority order):
    // 1. Explicit context in options (highest priority)
    // 2. Manual context set via withContext()
    // 3. Request-scoped context from AsyncLocalStorage
    // 4. Auto-detected context from call stack (lowest priority)
    let finalContext = options?.context || this.currentContext;

    // Get request-scoped context if available
    const requestContext = ContextManager.getCurrentContext();
    let mergedContextObject = { ...this.contextObject };

    if (requestContext) {
      mergedContextObject = { ...mergedContextObject, ...requestContext };
      if (!finalContext && requestContext.className) {
        finalContext = requestContext.className;
      }
    }

    // Auto-detect context if enabled and no manual context is set
    if (this.autoDetectContext && !finalContext) {
      const autoContext = ContextManager.autoDetectContext();
      if (autoContext.className) {
        finalContext = autoContext.className;
        mergedContextObject = { ...mergedContextObject, ...autoContext };
      }
    }

    // Apply filters
    if (this.config.filters && finalContext) {
      if (this.config.filters.exclude?.includes(finalContext)) {
        return;
      }
      if (
        this.config.filters.include &&
        this.config.filters.include.length > 0
      ) {
        if (!this.config.filters.include.includes(finalContext)) {
          return;
        }
      }
    }

    // Merge all data sources
    const mergedData =
      options?.data || Object.keys(mergedContextObject).length > 0
        ? {
            ...(typeof options?.data === "object" && options.data !== null
              ? options.data
              : {}),
            // Include request context metadata if present
            ...(mergedContextObject.requestId
              ? { requestId: mergedContextObject.requestId }
              : {}),
            ...(mergedContextObject.userId
              ? { userId: mergedContextObject.userId }
              : {}),
            ...(mergedContextObject.tenantId
              ? { tenantId: mergedContextObject.tenantId }
              : {}),
            ...(mergedContextObject.correlationId
              ? { correlationId: mergedContextObject.correlationId }
              : {}),
          }
        : undefined;

    const entry = createLogEntry(level, message, {
      context: finalContext,
      data:
        Object.keys(mergedData || {}).length > 0 ? mergedData : options?.data,
      error: options?.error,
      trace: options?.trace,
      performance: options?.performance,
      pid: this.pid,
    });

    // Process through grouping manager if enabled
    if (this.groupingManager) {
      const processed = this.groupingManager.processEntry(entry);

      // If it's a grouped entry, format and send it
      if (this.isGroupedLogEntry(processed)) {
        this.sendGroupedEntry(processed);
        return; // Don't send individual entry
      }

      // If it's not grouped yet (count < minOccurrences), send as normal
      // The grouping manager will track it and group it later
    }

    // Send to all enabled transports
    this.sendEntry(entry);
  }

  /**
   * Check if a log entry is a grouped entry.
   * @param entry - Log entry or grouped entry
   * @returns True if grouped entry
   */
  private isGroupedLogEntry(entry: LogEntry | GroupedLogEntry): entry is GroupedLogEntry {
    return (
      typeof entry === "object" &&
      entry !== null &&
      "count" in entry &&
      "representative" in entry &&
      "firstOccurrence" in entry &&
      "lastOccurrence" in entry
    );
  }

  /**
   * Send a grouped log entry to transports.
   * Formats grouped entries and writes them directly to stdout/stderr.
   * @param groupedEntry - Grouped log entry
   */
  private sendGroupedEntry(groupedEntry: GroupedLogEntry): void {
    const isStructured = this.config.structured ?? process.env.NODE_ENV === "production";
    const formatOptions = {
      redact: this.config.redaction?.enabled ?? process.env.NODE_ENV === "production",
    };

    const formatted = isStructured
      ? formatGroupedProd(groupedEntry, formatOptions)
      : formatGroupedDev(groupedEntry, formatOptions);

    // Write formatted grouped entry directly to stdout/stderr
    // This bypasses normal transport formatting since grouped entries are already formatted
    const stream =
      groupedEntry.representative.level >= LogLevel.ERROR ? process.stderr : process.stdout;
    stream.write(formatted);
  }

  /**
   * Send a regular log entry to transports.
   * @param entry - Log entry
   */
  private sendEntry(entry: LogEntry): void {
    for (const transport of this.transports) {
      if (transport.enabled) {
        try {
          const result = transport.log(entry);
          if (result instanceof Promise) {
            // Fire and forget for async transports
            result.catch((err) => {
              // Silently fail to avoid log loops
              console.error(
                `[Logger] Transport ${transport.name} failed:`,
                err,
              );
            });
          }
        } catch (err) {
          // Silently fail to avoid log loops
          console.error(`[Logger] Transport ${transport.name} failed:`, err);
        }
      }
    }
  }

  /**
   * Start a high-resolution timer.
   * @param label - Label for this timer
   * @param logLevel - Log level when timer ends (default: "debug")
   * @returns Timer object with end() method
   * @public API
   *
   * @example
   * ```typescript
   * const timer = logger.startTimer("database-query");
   * // ... do work ...
   * timer.end(); // Logs: "Timer 'database-query' completed in 45.23ms"
   * ```
   */
  startTimer(
    label: string,
    logLevel: "debug" | "info" | "warn" = "debug",
  ): ITimer {
    return new Timer(label, this, logLevel);
  }

  /**
   * Get a metrics collector for tracking multiple operations.
   * @returns PerformanceMetricsCollector instance
   * @public API
   *
   * @example
   * ```typescript
   * const metrics = logger.metrics();
   * metrics.start("db-query").end("db-query");
   * metrics.start("api-call").end("api-call");
   * metrics.summary(); // Logs detailed breakdown
   * ```
   */
  metrics(): PerformanceMetricsCollector {
    return new PerformanceMetricsCollector(this);
  }

  /**
   * Measure performance of an async function.
   * @param fn - Async function to measure
   * @param label - Label for this measurement
   * @returns Promise with result and performance data
   * @public API
   *
   * @example
   * ```typescript
   * const { result, performance } = await logger.measure(
   *   async () => await fetchData(),
   *   "fetch-data"
   * );
   * // Logs: "fetch-data took 123.45ms"
   * ```
   */
  async measure<T>(
    fn: () => T | Promise<T>,
    label: string,
  ): Promise<{
    result: T;
    performance: { duration: number; memoryDelta: number; cpuUsage?: number };
  }> {
    return measurePerformance(fn, label, this);
  }

  /**
   * Measure performance of a synchronous function.
   * @param fn - Function to measure
   * @param label - Label for this measurement
   * @returns Result and performance data
   * @public API
   *
   * @example
   * ```typescript
   * const { result, performance } = logger.measureSync(
   *   () => processData(),
   *   "process-data"
   * );
   * ```
   */
  measureSync<T>(
    fn: () => T,
    label: string,
  ): {
    result: T;
    performance: { duration: number; memoryDelta: number; cpuUsage?: number };
  } {
    return measurePerformanceSync(fn, label, this);
  }

  /**
   * Flush all transports.
   * @returns Promise that resolves when all transports are flushed
   * @public API
   */
  async flush(): Promise<void> {
    const flushPromises = this.transports.map((transport) => {
      if (transport.enabled && transport.flush) {
        return transport.flush();
      }
      return Promise.resolve();
    });

    await Promise.all(flushPromises);
  }

  /**
   * Close all transports.
   * @returns Promise that resolves when all transports are closed
   * @public API
   */
  async close(): Promise<void> {
    const closePromises = this.transports.map((transport) => {
      if (transport.enabled && transport.close) {
        return transport.close();
      }
      return Promise.resolve();
    });

    await Promise.all(closePromises);
  }

  /**
   * Legacy formatMessage method for backward compatibility.
   * @deprecated Use the new structured logging API instead
   * @param logLevel - The level of the log
   * @param message - The main log message
   * @param module - Optional module name
   * @returns The formatted log message
   */
  protected formatMessage(
    logLevel: LogLevelString | "NONE" = "NONE",
    message: string,
    module?: string,
  ): string {
    const level = parseLogLevel(logLevel);
    const entry = createLogEntry(level, message, {
      context: module,
      pid: this.pid,
    });

    // Use dev formatter for legacy format
    return formatDev(entry);
  }
}

export { Logger };
