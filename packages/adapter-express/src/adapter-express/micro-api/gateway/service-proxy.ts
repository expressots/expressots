import { Request, Response, NextFunction } from "express";
import { CircuitBreaker, CircuitBreakerConfig } from "./circuit-breaker.js";

/**
 * Configuration for ServiceProxy
 */
export interface ServiceProxyConfig {
  /** Target service URL */
  target: string;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Number of retries on failure (default: 0) */
  retries?: number;
  /** Additional headers to add to proxied requests */
  headers?: Record<string, string>;
  /** Path rewrite function */
  pathRewrite?: (path: string) => string;
  /** Enable circuit breaker (default: false) */
  circuitBreaker?: boolean | CircuitBreakerConfig;
  /** Log requests (default: false) */
  debug?: boolean;
}

/**
 * Proxy response from fetch
 */
interface ProxyResponse {
  status: number;
  headers: Headers;
  text(): Promise<string>;
}

/**
 * ServiceProxy - Proxy requests to other microservices.
 *
 * Features:
 * - Automatic request forwarding
 * - Path rewriting
 * - Custom headers
 * - Request timeout
 * - Retry support
 * - Optional circuit breaker integration
 *
 * @example
 * ```typescript
 * // Proxy to user service
 * const userProxy = createProxy({
 *     target: "http://user-service:3001",
 *     pathRewrite: (path) => path.replace("/api/users", ""),
 *     timeout: 5000,
 *     retries: 3,
 *     circuitBreaker: true,
 * });
 *
 * app.Route.get("/api/users/*", userProxy.handler());
 * app.Route.post("/api/users/*", userProxy.handler());
 * ```
 */
export class ServiceProxy {
  private config: Required<Omit<ServiceProxyConfig, "circuitBreaker">> & {
    circuitBreaker?: CircuitBreaker;
  };

  constructor(config: ServiceProxyConfig) {
    this.config = {
      target: config.target,
      timeout: config.timeout ?? 30000,
      retries: config.retries ?? 0,
      headers: config.headers ?? {},
      pathRewrite: config.pathRewrite ?? ((path: string): string => path),
      debug: config.debug ?? false,
    };

    // Initialize circuit breaker if enabled
    if (config.circuitBreaker) {
      const cbConfig =
        typeof config.circuitBreaker === "object" ? config.circuitBreaker : undefined;
      this.config.circuitBreaker = new CircuitBreaker(cbConfig);
    }
  }

  /**
   * Create an Express handler for proxying requests
   */
  handler(): (req: Request, res: Response, next: NextFunction) => void {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const result = await this.proxyRequest(req);

        // Copy status and headers
        res.status(result.status);
        result.headers.forEach((value: string, key: string) => {
          // Skip certain headers
          if (!["content-encoding", "transfer-encoding"].includes(key.toLowerCase())) {
            res.setHeader(key, value);
          }
        });

        // Send body
        const body = await result.text();
        res.send(body);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (this.config.debug) {
          console.error(`[Proxy] Error:`, errorMessage);
        }

        if (errorMessage === "Circuit breaker is OPEN") {
          res.status(503).json({
            error: "Service temporarily unavailable",
            service: this.config.target,
          });
        } else if (error instanceof Error && error.name === "AbortError") {
          res.status(504).json({
            error: "Gateway timeout",
            service: this.config.target,
          });
        } else {
          res.status(502).json({
            error: "Bad gateway",
            message: errorMessage,
            service: this.config.target,
          });
        }
      }
    };
  }

  /**
   * Proxy a request to the target service
   */
  private async proxyRequest(req: Request): Promise<ProxyResponse> {
    const execute = async (): Promise<ProxyResponse> => {
      return await this.executeWithRetry(req);
    };

    if (this.config.circuitBreaker) {
      return await this.config.circuitBreaker.execute(execute);
    }

    return await execute();
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry(req: Request, attempt: number = 0): Promise<ProxyResponse> {
    try {
      return await this.executeRequest(req);
    } catch (error) {
      if (attempt < this.config.retries) {
        // Exponential backoff
        await this.delay(Math.pow(2, attempt) * 100);
        return await this.executeWithRetry(req, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Execute a single request
   */
  private async executeRequest(req: Request): Promise<ProxyResponse> {
    // Rewrite path if configured
    const path = this.config.pathRewrite(req.path);
    const url = new URL(path, this.config.target);

    // A crafted path such as '//evil.com/x' or 'http://evil.com' overrides
    // the base in the URL constructor; refuse anything that escapes the
    // configured target origin (SSRF guard).
    if (url.origin !== new URL(this.config.target).origin) {
      throw new Error(
        `Proxy request blocked: path '${req.path}' resolves outside the configured target origin`,
      );
    }

    // Copy query parameters
    Object.entries(req.query).forEach(([key, value]) => {
      if (typeof value === "string") {
        url.searchParams.append(key, value);
      }
    });

    // Build headers
    const headers: Record<string, string> = {
      ...this.extractHeaders(req),
      ...this.config.headers,
    };

    // Build request options
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    const requestInit: RequestInit = {
      method: req.method,
      headers,
      signal: controller.signal,
    };

    // Add body for non-GET requests
    if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
      requestInit.body = JSON.stringify(req.body);
      headers["content-type"] = "application/json";
    }

    if (this.config.debug) {
      console.log(`[Proxy] ${req.method} ${url.toString()}`);
    }

    try {
      const response = await fetch(url.toString(), requestInit);
      clearTimeout(timeoutId);
      // Cast to ProxyResponse to avoid conflict with Express Response type
      return response as unknown as ProxyResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Extract relevant headers from incoming request
   */
  private extractHeaders(req: Request): Record<string, string> {
    const headers: Record<string, string> = {};
    const forwardHeaders = [
      "authorization",
      "content-type",
      "accept",
      "user-agent",
      "x-request-id",
      "x-trace-id",
      "x-span-id",
      "x-correlation-id",
    ];

    forwardHeaders.forEach((header) => {
      const value = req.headers[header];
      if (typeof value === "string") {
        headers[header] = value;
      }
    });

    // Add X-Forwarded headers
    headers["x-forwarded-for"] = req.ip || req.socket.remoteAddress || "unknown";
    headers["x-forwarded-host"] = req.headers.host || "";
    headers["x-forwarded-proto"] = req.protocol;

    return headers;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get circuit breaker stats (if enabled)
   */
  getCircuitBreakerStats(): ReturnType<CircuitBreaker["getStats"]> | undefined {
    return this.config.circuitBreaker?.getStats();
  }
}

/**
 * Create a new service proxy
 */
export function createProxy(config: ServiceProxyConfig): ServiceProxy {
  return new ServiceProxy(config);
}
