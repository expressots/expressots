/**
 * @file logger.context.ts
 * @description Context management for structured logging with automatic detection
 * @module @expressots/core/provider/logger
 *
 * Provides:
 * - Automatic class/method detection from call stack
 * - HTTP request context enrichment
 * - Child logger creation with inherited context
 * - Thread-safe context storage using AsyncLocalStorage
 */

import { AsyncLocalStorage } from "async_hooks";

/**
 * Represents the context for a single log entry.
 * @public API
 */
export interface LogContext {
  /** Class name (auto-detected or manual) */
  className?: string;
  /** Method name (auto-detected or manual) */
  methodName?: string;
  /** Custom context label */
  label?: string;
  /** Request ID for HTTP requests */
  requestId?: string;
  /** User identifier (if authenticated) */
  userId?: string;
  /** Tenant identifier (for multi-tenant apps) */
  tenantId?: string;
  /** Correlation ID for distributed tracing */
  correlationId?: string;
  /** Parent span ID for tracing */
  parentSpanId?: string;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * HTTP-specific context for request logging.
 * @public API
 */
export interface HttpContext {
  /** Request ID (generated or from header) */
  requestId: string;
  /** Correlation ID for distributed tracing (defaults to requestId if not provided) */
  correlationId?: string;
  /** HTTP method (GET, POST, etc.) */
  method: string;
  /** Request path */
  path: string;
  /** Client IP address */
  ip?: string;
  /** User agent string */
  userAgent?: string;
  /** User identifier */
  userId?: string;
  /** Tenant identifier */
  tenantId?: string;
  /** Request start time (for duration calculation) */
  startTime: number;
  /** Request headers (selected) */
  headers?: Record<string, string>;
}

/**
 * Configuration for automatic context detection.
 * @public API
 */
export interface ContextDetectionConfig {
  /** Enable automatic class name detection */
  detectClassName: boolean;
  /** Enable automatic method name detection */
  detectMethodName: boolean;
  /** Maximum stack depth to search */
  maxStackDepth: number;
  /** Patterns to skip in stack trace (e.g., node_modules) */
  skipPatterns: Array<RegExp>;
}

/**
 * Default configuration for context detection.
 */
export function getDefaultContextDetectionConfig(): ContextDetectionConfig {
  return {
    detectClassName: true,
    detectMethodName: true,
    maxStackDepth: 10,
    skipPatterns: [
      /node_modules/,
      /^internal\//,
      /^node:/,
      /logger\.provider/,
      /logger\.context/,
    ],
  };
}

/**
 * AsyncLocalStorage for request-scoped context.
 * This allows context to flow through async operations automatically.
 */
const contextStorage = new AsyncLocalStorage<LogContext>();

/**
 * Context manager for the logging system.
 * Provides automatic context detection and management.
 * @public API
 */
export class ContextManager {
  private static config: ContextDetectionConfig =
    getDefaultContextDetectionConfig();
  private static globalContext: LogContext = {};

  /**
   * Configure context detection behavior.
   * @param config - Partial configuration to merge
   */
  static configure(config: Partial<ContextDetectionConfig>): void {
    ContextManager.config = {
      ...ContextManager.config,
      ...config,
    };
  }

  /**
   * Set global context that applies to all logs.
   * @param context - Global context to set
   */
  static setGlobalContext(context: LogContext): void {
    ContextManager.globalContext = { ...context };
  }

  /**
   * Get the current global context.
   */
  static getGlobalContext(): LogContext {
    return { ...ContextManager.globalContext };
  }

  /**
   * Get the current request-scoped context.
   */
  static getCurrentContext(): LogContext | undefined {
    return contextStorage.getStore();
  }

  /**
   * Run a function with a specific context.
   * The context will be available to all async operations within the function.
   * @param context - Context to use
   * @param fn - Function to run
   * @returns Result of the function
   */
  static runWithContext<T>(context: LogContext, fn: () => T): T {
    return contextStorage.run(context, fn);
  }

  /**
   * Run an async function with a specific context.
   * @param context - Context to use
   * @param fn - Async function to run
   * @returns Promise with result of the function
   */
  static async runWithContextAsync<T>(
    context: LogContext,
    fn: () => Promise<T>,
  ): Promise<T> {
    return contextStorage.run(context, fn);
  }

  /**
   * Get the merged context (global + request-scoped + auto-detected).
   * @param manualContext - Optional manual context to include
   * @param skipAutoDetect - Skip automatic detection (for performance)
   * @returns Merged context
   */
  static getContext(
    manualContext?: Partial<LogContext>,
    skipAutoDetect?: boolean,
  ): LogContext {
    const globalContext = ContextManager.globalContext;
    const requestContext = contextStorage.getStore() || {};
    const autoContext = skipAutoDetect
      ? {}
      : ContextManager.autoDetectContext();

    return {
      ...globalContext,
      ...requestContext,
      ...autoContext,
      ...manualContext,
    };
  }

  /**
   * Automatically detect context from the call stack.
   * @returns Detected context
   */
  static autoDetectContext(): Partial<LogContext> {
    if (
      !ContextManager.config.detectClassName &&
      !ContextManager.config.detectMethodName
    ) {
      return {};
    }

    const context: Partial<LogContext> = {};
    const stack = ContextManager.getCallStack();

    for (
      let i = 0;
      i < Math.min(stack.length, ContextManager.config.maxStackDepth);
      i++
    ) {
      const frame = stack[i];

      // Skip frames matching skip patterns
      if (
        ContextManager.config.skipPatterns.some((pattern) =>
          pattern.test(frame.file || ""),
        )
      ) {
        continue;
      }

      // Skip anonymous or native functions
      if (!frame.functionName || frame.functionName === "anonymous") {
        continue;
      }

      // Try to extract class and method names
      const { className, methodName } = ContextManager.parseFrameName(
        frame.functionName,
      );

      if (
        ContextManager.config.detectClassName &&
        className &&
        !context.className
      ) {
        context.className = className;
      }

      if (
        ContextManager.config.detectMethodName &&
        methodName &&
        !context.methodName
      ) {
        context.methodName = methodName;
      }

      // Stop if we have both
      if (context.className && context.methodName) {
        break;
      }
    }

    return context;
  }

  /**
   * Parse a stack frame to extract the function/method name.
   */
  private static getCallStack(): Array<{
    functionName?: string;
    file?: string;
    line?: number;
    column?: number;
  }> {
    const originalPrepareStackTrace = Error.prepareStackTrace;
    const originalStackTraceLimit = Error.stackTraceLimit;

    try {
      Error.stackTraceLimit = ContextManager.config.maxStackDepth + 5;

      const stack: Array<{
        functionName?: string;
        file?: string;
        line?: number;
        column?: number;
      }> = [];

      // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
      Error.prepareStackTrace = (_err, structuredStack): string => {
        for (const frame of structuredStack) {
          stack.push({
            functionName:
              frame.getFunctionName() || frame.getMethodName() || undefined,
            file: frame.getFileName() || undefined,
            line: frame.getLineNumber() || undefined,
            column: frame.getColumnNumber() || undefined,
          });
        }
        return "";
      };

      // Create and access error to populate stack
      const err = new Error();
      // Access .stack to trigger prepareStackTrace
      void err.stack;

      return stack;
    } finally {
      Error.prepareStackTrace = originalPrepareStackTrace;
      Error.stackTraceLimit = originalStackTraceLimit;
    }
  }

  /**
   * Parse a function name to extract class and method names.
   * Handles patterns like:
   * - "ClassName.methodName"
   * - "ClassName.prototype.methodName"
   * - "methodName" (standalone function)
   */
  private static parseFrameName(name: string): {
    className?: string;
    methodName?: string;
  } {
    if (!name) {
      return {};
    }

    // Handle "ClassName.prototype.methodName" or "ClassName.methodName"
    const prototypeMatch = name.match(/^(\w+)(?:\.prototype)?\.(\w+)$/);
    if (prototypeMatch) {
      return {
        className: prototypeMatch[1],
        methodName: prototypeMatch[2],
      };
    }

    // Handle "new ClassName" (constructor)
    const constructorMatch = name.match(/^new (\w+)$/);
    if (constructorMatch) {
      return {
        className: constructorMatch[1],
        methodName: "constructor",
      };
    }

    // Handle simple function name
    const simpleMatch = name.match(/^(\w+)$/);
    if (simpleMatch) {
      return {
        methodName: simpleMatch[1],
      };
    }

    return {};
  }

  /**
   * Create HTTP context from an Express request.
   * @param req - Express request object
   * @param options - Optional header configuration
   * @returns HTTP context
   */
  static createHttpContext(
    req: {
      method?: string;
      path?: string;
      url?: string;
      ip?: string;
      headers?: Record<string, string | Array<string> | undefined>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user?: any;
    },
    options?: {
      requestIdHeader?: string;
      correlationIdHeader?: string;
    },
  ): HttpContext {
    const requestIdHeader = options?.requestIdHeader || "x-request-id";
    const correlationIdHeader =
      options?.correlationIdHeader || "x-correlation-id";

    // Generate or get request ID from configured header
    const requestId =
      (req.headers?.[requestIdHeader.toLowerCase()] as string) ||
      ContextManager.generateRequestId();

    // Get correlation ID from configured header (defaults to request ID if not present)
    const correlationId =
      (req.headers?.[correlationIdHeader.toLowerCase()] as string) || requestId;

    return {
      requestId,
      correlationId,
      method: req.method || "UNKNOWN",
      path: req.path || req.url || "/",
      ip: req.ip || (req.headers?.["x-forwarded-for"] as string) || undefined,
      userAgent: req.headers?.["user-agent"] as string | undefined,
      userId: req.user?.id || req.user?.sub || undefined,
      tenantId: (req.headers?.["x-tenant-id"] as string) || undefined,
      startTime: Date.now(),
      headers: ContextManager.extractSafeHeaders(req.headers),
    };
  }

  /**
   * Generate a unique request ID.
   * Uses a combination of timestamp and random string.
   */
  static generateRequestId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 10);
    return `req_${timestamp}_${random}`;
  }

  /**
   * Extract safe headers (exclude sensitive ones).
   */
  private static extractSafeHeaders(
    headers?: Record<string, string | Array<string> | undefined>,
  ): Record<string, string> | undefined {
    if (!headers) return undefined;

    const sensitiveHeaders = [
      "authorization",
      "cookie",
      "x-api-key",
      "x-auth-token",
      "x-csrf-token",
    ];

    const safeHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (
        !sensitiveHeaders.includes(key.toLowerCase()) &&
        value !== undefined
      ) {
        safeHeaders[key] = Array.isArray(value) ? value.join(", ") : value;
      }
    }

    return Object.keys(safeHeaders).length > 0 ? safeHeaders : undefined;
  }

  /**
   * Format context for display (e.g., "[ClassName.methodName]").
   * @param context - Context to format
   * @returns Formatted string
   */
  static formatContext(context: LogContext): string {
    const parts: Array<string> = [];

    if (context.className && context.methodName) {
      parts.push(`${context.className}.${context.methodName}`);
    } else if (context.className) {
      parts.push(context.className);
    } else if (context.methodName) {
      parts.push(context.methodName);
    } else if (context.label) {
      parts.push(context.label);
    }

    if (context.requestId) {
      parts.push(`req:${context.requestId.slice(0, 8)}`);
    }

    return parts.length > 0 ? `[${parts.join(" | ")}]` : "";
  }
}

/**
 * Decorator for automatically setting context on a class.
 * @param contextName - Context name to use (defaults to class name)
 * @returns Class decorator
 */
export function LogContext(contextName?: string): ClassDecorator {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return function (target: Function): void {
    // Store context name as metadata
    Reflect.defineMetadata("log:context", contextName || target.name, target);
  };
}

/**
 * Decorator for automatically setting context on a method.
 * @param contextName - Context name to use (defaults to method name)
 * @returns Method decorator
 */
export function LogMethod(contextName?: string): MethodDecorator {
  // eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/explicit-function-return-type
  return function (
    _target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const methodName = contextName || String(propertyKey);

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    descriptor.value = function (...args: Array<unknown>): unknown {
      const className =
        Reflect.getMetadata("log:context", this.constructor) ||
        this.constructor.name;

      return ContextManager.runWithContext(
        {
          className,
          methodName,
        },
        () => originalMethod.apply(this, args),
      );
    };

    return descriptor;
  };
}
