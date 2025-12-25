/**
 * @file request-logging.middleware.ts
 * @description HTTP request/response logging middleware with context enrichment
 * @module @expressots/adapter-express
 *
 * Features:
 * - Request ID generation/extraction
 * - Request/response timing
 * - Slow request detection
 * - Configurable verbosity levels
 * - Body logging with redaction support
 */

import { Request, Response, NextFunction } from "express";
import {
  Logger,
  ContextManager,
  LogContext,
  getFlowTracker,
  removeFlowTracker,
} from "@expressots/core";

/**
 * Verbosity levels for request logging.
 * @public API
 */
export type RequestLogVerbosity = "minimal" | "normal" | "detailed" | "debug";

/**
 * Configuration for request logging middleware.
 * @public API
 */
export interface RequestLoggingConfig {
  /** Verbosity level for request logs */
  verbosity: RequestLogVerbosity;
  /** Log request body (with redaction) */
  logBody: boolean;
  /** Log request headers */
  logHeaders: boolean;
  /** Log response body */
  logResponseBody: boolean;
  /** Threshold for slow request warning (ms) */
  slowRequestThreshold: number;
  /** Patterns to skip logging (e.g., health checks) */
  skipPatterns: Array<RegExp>;
  /** Custom header name for request ID */
  requestIdHeader: string;
  /** Custom header name for correlation ID (for distributed tracing) */
  correlationIdHeader: string;
  /** Include user agent in logs */
  logUserAgent: boolean;
  /** Include IP address in logs */
  logIp: boolean;
}

/**
 * Default request logging configuration.
 */
export function getDefaultRequestLoggingConfig(): RequestLoggingConfig {
  return {
    verbosity: "normal",
    logBody: false,
    logHeaders: false,
    logResponseBody: false,
    slowRequestThreshold: 1000, // 1 second
    skipPatterns: [/^\/health$/, /^\/ready$/, /^\/live$/, /^\/_health$/],
    requestIdHeader: "x-request-id",
    correlationIdHeader: "x-correlation-id",
    logUserAgent: true,
    logIp: true,
  };
}

/**
 * Create request logging middleware.
 * @param logger - Logger instance to use
 * @param config - Optional configuration
 * @returns Express middleware function
 * @public API
 */
export function createRequestLoggingMiddleware(
  logger: Logger,
  config?: Partial<RequestLoggingConfig>,
): (req: Request, res: Response, next: NextFunction) => void {
  const finalConfig: RequestLoggingConfig = {
    ...getDefaultRequestLoggingConfig(),
    ...config,
  };

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip logging for configured patterns
    if (finalConfig.skipPatterns.some((pattern) => pattern.test(req.path))) {
      next();
      return;
    }

    // Create HTTP context with custom header names
    const httpContext = ContextManager.createHttpContext(req, {
      requestIdHeader: finalConfig.requestIdHeader,
      correlationIdHeader: finalConfig.correlationIdHeader,
    });

    // Set request/correlation ID headers for downstream services
    res.setHeader(finalConfig.requestIdHeader, httpContext.requestId);
    if (httpContext.correlationId) {
      res.setHeader(finalConfig.correlationIdHeader, httpContext.correlationId);
    }

    // Create log context
    const logContext: LogContext = {
      requestId: httpContext.requestId,
      userId: httpContext.userId,
      tenantId: httpContext.tenantId,
      metadata: {
        method: httpContext.method,
        path: httpContext.path,
      },
    };

    // Initialize flow tracker (if flow tracking is enabled)
    const flowConfig = logger.getConfig()?.flow;
    const flowTracker = getFlowTracker(
      httpContext.requestId,
      httpContext.method,
      httpContext.path,
      flowConfig,
    );

    // Log request start based on verbosity
    logRequestStart(logger, httpContext, finalConfig);

    // Capture response timing
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    // Store error on request for later retrieval
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).__expressotsFlowError = undefined;

    // Override res.end to capture response
    const originalEnd = res.end;
    let endCalled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res.end = function (this: Response, ...args: Array<any>): Response {
      // Prevent multiple calls
      if (endCalled) {
        return originalEnd.apply(this, args as Parameters<typeof originalEnd>);
      }
      endCalled = true;

      const duration = Date.now() - startTime;
      const memoryDelta = process.memoryUsage().heapUsed - startMemory;

      // Get error from request if available (set by controllers, guards, or error handlers)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const error = (req as any).__expressotsFlowError as Error | undefined;

      // Finalize flow and get flow data (pass error if available)
      const flow = flowTracker.finalize(res.statusCode, error);

      // Log response with flow data
      logRequestEnd(logger, httpContext, res, duration, memoryDelta, finalConfig, flow);

      // Cleanup flow tracker
      removeFlowTracker(httpContext.requestId);

      // Call original end
      return originalEnd.apply(this, args as Parameters<typeof originalEnd>);
    };

    // Wrap next to capture errors passed to next()
    const wrappedNext = (err?: unknown): void => {
      if (err) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any).__expressotsFlowError = err instanceof Error ? err : new Error(String(err));
      }
      next(err);
    };

    // Also hook into res.status() to capture error status codes
    // This helps capture errors that Express error handlers set
    const originalStatus = res.status.bind(res);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (res as any).status = function (this: Response, code: number): Response {
      // If status is >= 400 and no error is stored yet, try to get it from Express error handling
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (code >= 400 && !(req as any).__expressotsFlowError) {
        // Check if there's an error in the response locals (Express error handlers sometimes put it there)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errorFromLocals = (res as any).locals?.error;
        if (errorFromLocals) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (req as any).__expressotsFlowError = errorFromLocals instanceof Error ? errorFromLocals : new Error(String(errorFromLocals));
        }
      }
      return originalStatus(code);
    };

    // Run the rest of the middleware chain with context
    ContextManager.runWithContext(logContext, () => {
      wrappedNext();
    });
  };
}

/**
 * Log request start.
 */
function logRequestStart(
  logger: Logger,
  context: ReturnType<typeof ContextManager.createHttpContext>,
  config: RequestLoggingConfig,
): void {
  const { verbosity, logHeaders, logUserAgent, logIp } = config;

  if (verbosity === "minimal") {
    // Minimal: Just log that request started
    logger.debug(`→ ${context.method} ${context.path}`, { requestId: context.requestId });
    return;
  }

  // Build log data based on verbosity
  const logData: Record<string, unknown> = {
    requestId: context.requestId,
  };

  if (logIp && context.ip) {
    logData.ip = context.ip;
  }

  if (logUserAgent && context.userAgent) {
    logData.userAgent =
      context.userAgent.length > 50
        ? context.userAgent.substring(0, 50) + "..."
        : context.userAgent;
  }

  if (context.userId) {
    logData.userId = context.userId;
  }

  if (context.tenantId) {
    logData.tenantId = context.tenantId;
  }

  if (verbosity === "detailed" || verbosity === "debug") {
    if (logHeaders && context.headers) {
      logData.headers = context.headers;
    }
  }

  logger.info(`→ ${context.method} ${context.path}`, "request", logData);
}

/**
 * Log request end.
 */
function logRequestEnd(
  logger: Logger,
  context: ReturnType<typeof ContextManager.createHttpContext>,
  res: Response,
  duration: number,
  memoryDelta: number,
  config: RequestLoggingConfig,
  flow?: import("@expressots/core").RequestFlow,
): void {
  const { verbosity, slowRequestThreshold } = config;
  const statusCode = res.statusCode;

  // Determine log level based on status and duration
  const isSlowRequest = duration >= slowRequestThreshold;
  const isError = statusCode >= 400;

  // Build log data
  const logData: Record<string, unknown> = {
    requestId: context.requestId,
    status: statusCode,
    duration: `${duration}ms`,
  };

  if (verbosity === "detailed" || verbosity === "debug") {
    logData.memoryDelta = `${(memoryDelta / 1024).toFixed(1)}KB`;
  }

  if (context.userId) {
    logData.userId = context.userId;
  }

  // Format message
  const statusEmoji = isError ? "✗" : "✓";
  const message = `← ${context.method} ${context.path} ${statusCode} ${statusEmoji} ${duration}ms`;

  // Log with appropriate level and include flow data if available
  if (isError && statusCode >= 500) {
    logger.error(message, "request", { ...logData, flow });
  } else if (isError) {
    logger.warn(message, "request", { ...logData, flow });
  } else if (isSlowRequest) {
    logger.warn(`[SLOW] ${message}`, "request", {
      ...logData,
      slowRequestThreshold: `${slowRequestThreshold}ms`,
      flow,
    });
  } else if (verbosity !== "minimal") {
    logger.info(message, "request", { ...logData, flow });
  } else {
    // debug only takes 2 args: message and data
    logger.debug(`[request] ${message}`, { ...logData, flow });
  }
}

/**
 * Express middleware that assigns a request ID to each request.
 * Simpler alternative to full request logging.
 * @param headerName - Header name for request ID (default: x-request-id)
 * @returns Express middleware
 * @public API
 */
export function requestIdMiddleware(
  headerName: string = "x-request-id",
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const existingId = req.headers[headerName.toLowerCase()] as string;
    const requestId = existingId || ContextManager.generateRequestId();

    // Set on request for access by other middleware
    (req as Request & { requestId: string }).requestId = requestId;

    // Set on response header
    res.setHeader(headerName, requestId);

    // Run with context
    ContextManager.runWithContext({ requestId }, () => {
      next();
    });
  };
}
