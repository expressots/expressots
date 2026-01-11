import { CircuitBreaker, CircuitBreakerConfig } from "../gateway/circuit-breaker";

/**
 * Configuration for ServiceClient
 */
export interface ServiceClientConfig {
  /** Service name for logging/metrics */
  name: string;
  /** Base URL of the service */
  baseUrl: string;
  /** Request timeout in ms (default: 5000) */
  timeout?: number;
  /** Number of retries on failure (default: 3) */
  retries?: number;
  /** Enable circuit breaker (default: true) */
  circuitBreaker?: boolean | CircuitBreakerConfig;
  /** Default headers to send with all requests */
  headers?: Record<string, string>;
}

/**
 * Options for individual service calls
 */
export interface ServiceCallOptions {
  /** HTTP method (default: "GET") */
  method?: string;
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body (will be JSON stringified) */
  body?: unknown;
  /** Query parameters */
  params?: Record<string, string>;
  /** Override timeout for this request */
  timeout?: number;
}

/**
 * ServiceClient - HTTP client for service-to-service communication.
 *
 * Features:
 * - Automatic retries with exponential backoff
 * - Circuit breaker integration
 * - Request timeout
 * - JSON request/response handling
 * - Trace context propagation
 *
 * @example
 * ```typescript
 * const userService = new ServiceClient({
 *     name: "user-service",
 *     baseUrl: "http://user-service:3001",
 *     timeout: 5000,
 *     retries: 3,
 *     circuitBreaker: true,
 * });
 *
 * // GET request
 * const user = await userService.call<User>("/users/123");
 *
 * // POST request
 * const newUser = await userService.call<User>("/users", {
 *     method: "POST",
 *     body: { name: "John", email: "john@example.com" },
 * });
 *
 * // With query parameters
 * const users = await userService.call<User[]>("/users", {
 *     params: { page: "1", limit: "10" },
 * });
 * ```
 */
export class ServiceClient {
  private config: Required<Omit<ServiceClientConfig, "circuitBreaker">> & {
    circuitBreaker?: CircuitBreaker;
  };
  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
  };

  constructor(config: ServiceClientConfig) {
    this.config = {
      name: config.name,
      baseUrl: config.baseUrl.replace(/\/$/, ""), // Remove trailing slash
      timeout: config.timeout ?? 5000,
      retries: config.retries ?? 3,
      headers: config.headers ?? {},
    };

    // Initialize circuit breaker
    if (config.circuitBreaker !== false) {
      const cbConfig =
        typeof config.circuitBreaker === "object" ? config.circuitBreaker : undefined;
      this.config.circuitBreaker = new CircuitBreaker(cbConfig);
    }
  }

  /**
   * Make a request to the service
   * @param path - Request path
   * @param options - Request options
   */
  async call<T>(path: string, options: ServiceCallOptions = {}): Promise<T> {
    this.stats.totalRequests++;

    const execute = async (): Promise<T> => {
      return await this.executeWithRetry(path, options);
    };

    try {
      let result: T;
      if (this.config.circuitBreaker) {
        result = await this.config.circuitBreaker.execute(execute);
      } else {
        result = await execute();
      }
      this.stats.successfulRequests++;
      return result;
    } catch (error) {
      this.stats.failedRequests++;
      throw error;
    }
  }

  /**
   * GET request helper
   */
  async get<T>(path: string, options?: Omit<ServiceCallOptions, "method" | "body">): Promise<T> {
    return this.call<T>(path, { ...options, method: "GET" });
  }

  /**
   * POST request helper
   */
  async post<T>(
    path: string,
    body?: unknown,
    options?: Omit<ServiceCallOptions, "method" | "body">,
  ): Promise<T> {
    return this.call<T>(path, { ...options, method: "POST", body });
  }

  /**
   * PUT request helper
   */
  async put<T>(
    path: string,
    body?: unknown,
    options?: Omit<ServiceCallOptions, "method" | "body">,
  ): Promise<T> {
    return this.call<T>(path, { ...options, method: "PUT", body });
  }

  /**
   * PATCH request helper
   */
  async patch<T>(
    path: string,
    body?: unknown,
    options?: Omit<ServiceCallOptions, "method" | "body">,
  ): Promise<T> {
    return this.call<T>(path, { ...options, method: "PATCH", body });
  }

  /**
   * DELETE request helper
   */
  async delete<T>(path: string, options?: Omit<ServiceCallOptions, "method" | "body">): Promise<T> {
    return this.call<T>(path, { ...options, method: "DELETE" });
  }

  /**
   * Get service stats
   */
  getStats(): {
    name: string;
    baseUrl: string;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    circuitBreaker?: ReturnType<CircuitBreaker["getStats"]>;
  } {
    return {
      name: this.config.name,
      baseUrl: this.config.baseUrl,
      ...this.stats,
      circuitBreaker: this.config.circuitBreaker?.getStats(),
    };
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(
    path: string,
    options: ServiceCallOptions,
    attempt: number = 1,
  ): Promise<T> {
    try {
      return await this.executeRequest<T>(path, options);
    } catch (error) {
      if (attempt < this.config.retries) {
        // Exponential backoff
        await this.delay(Math.pow(2, attempt) * 100);
        return await this.executeWithRetry(path, options, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Execute a single request
   */
  private async executeRequest<T>(path: string, options: ServiceCallOptions): Promise<T> {
    // Build URL
    const url = new URL(path, this.config.baseUrl);

    // Add query parameters
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    // Build headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...this.config.headers,
      ...options.headers,
    };

    // Setup timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout ?? this.config.timeout);

    try {
      const response = await fetch(url.toString(), {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorBody}`);
      }

      return await response.json();
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Request timeout: ${this.config.name} ${path}`);
      }

      throw error;
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
