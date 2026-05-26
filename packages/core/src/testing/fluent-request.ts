/**
 * Fluent HTTP Testing API
 *
 * @module testing
 *
 * Provides a chainable, readable, type-safe API for HTTP testing.
 * Better than supertest with built-in performance assertions.
 *
 * @example
 * ```typescript
 * await request(app)
 *   .get("/users/123")
 *   .expectStatus(200)
 *   .expectBody<User>({ id: 123, name: "John" })
 *   .expectTime({ lessThan: 100 });
 * ```
 */

import {
  FluentRequestBuilder,
  FluentRequest,
  FluentResponse,
  HttpMethod,
  TimeAssertion,
} from "./testing.interfaces.js";

/**
 * HTTP client implementation using fetch.
 * Supports Node.js 18+ native fetch or polyfill.
 */
interface FileAttachment {
  field: string;
  filePath: string;
}

interface RequestConfig {
  method: HttpMethod;
  path: string;
  headers: Record<string, string>;
  body?: unknown;
  query: Record<string, string | number | boolean>;
  timeout: number;
  assertions: Array<(response: FluentResponse<unknown>) => void>;
  expectedStatus?: number;
  expectedTime?: TimeAssertion;
  attachments?: Array<FileAttachment>;
}

/**
 * Internal fluent request implementation.
 */
class FluentRequestImpl implements FluentRequest {
  private config: RequestConfig;
  private baseUrl: string;

  constructor(baseUrl: string, method: HttpMethod, path: string) {
    this.baseUrl = baseUrl;
    this.config = {
      method,
      path,
      headers: {},
      query: {},
      timeout: 30000,
      assertions: [],
    };
  }

  /**
   * Set request headers.
   */
  set(
    headersOrKey: Record<string, string> | string,
    value?: string,
  ): FluentRequest {
    if (typeof headersOrKey === "string" && value !== undefined) {
      this.config.headers[headersOrKey] = value;
    } else if (typeof headersOrKey === "object") {
      Object.assign(this.config.headers, headersOrKey);
    }
    return this;
  }

  /**
   * Set request body.
   */
  send(body: unknown): FluentRequest {
    this.config.body = body;
    if (!this.config.headers["Content-Type"] && typeof body === "object") {
      this.config.headers["Content-Type"] = "application/json";
    }
    return this;
  }

  /**
   * Set query parameters.
   */
  query(params: Record<string, string | number | boolean>): FluentRequest {
    Object.assign(this.config.query, params);
    return this;
  }

  /**
   * Set authorization header.
   */
  auth(token: string, type: "Bearer" | "Basic" = "Bearer"): FluentRequest {
    this.config.headers["Authorization"] = `${type} ${token}`;
    return this;
  }

  /**
   * Attach file for upload.
   * Note: Basic implementation. For full multipart support, use form-data package.
   */
  attach(field: string, filePath: string): FluentRequest {
    // Store for later processing during execute
    if (!this.config.attachments) {
      this.config.attachments = [];
    }
    this.config.attachments.push({ field, filePath });
    return this;
  }

  /**
   * Set content type.
   */
  type(contentType: string): FluentRequest {
    this.config.headers["Content-Type"] = contentType;
    return this;
  }

  /**
   * Set accept header.
   */
  accept(contentType: string): FluentRequest {
    this.config.headers["Accept"] = contentType;
    return this;
  }

  /**
   * Set timeout.
   */
  timeout(ms: number): FluentRequest {
    this.config.timeout = ms;
    return this;
  }

  /**
   * Assert response status code.
   */
  expectStatus(status: number): FluentRequest {
    this.config.expectedStatus = status;
    this.config.assertions.push((response) => {
      if (response.status !== status) {
        throw new Error(
          `Expected status ${status}, but got ${response.status}\n` +
            `Response body: ${JSON.stringify(response.body, null, 2)}`,
        );
      }
    });
    return this;
  }

  /**
   * Assert response body.
   */
  expectBody<T>(
    expected: T | Partial<T> | ((body: T) => boolean),
  ): FluentRequest {
    this.config.assertions.push((response) => {
      const body = response.body as T;

      if (typeof expected === "function") {
        // Predicate assertion
        const predicate = expected as (body: T) => boolean;
        if (!predicate(body)) {
          throw new Error(
            `Body predicate assertion failed.\n` +
              `Body: ${JSON.stringify(body, null, 2)}`,
          );
        }
      } else if (typeof expected === "object" && expected !== null) {
        // Object comparison (partial match for objects)
        if (!deepPartialMatch(body, expected)) {
          throw new Error(
            `Expected body to match:\n${JSON.stringify(expected, null, 2)}\n` +
              `Actual body:\n${JSON.stringify(body, null, 2)}`,
          );
        }
      } else {
        // Exact match for primitives
        if (body !== expected) {
          throw new Error(
            `Expected body: ${JSON.stringify(expected)}\n` +
              `Actual body: ${JSON.stringify(body)}`,
          );
        }
      }
    });
    return this;
  }

  /**
   * Assert response body with JSON path.
   */
  expectBodyPath(path: string, expected: unknown): FluentRequest {
    this.config.assertions.push((response) => {
      const value = getValueByPath(response.body, path);
      if (!deepEqual(value, expected)) {
        throw new Error(
          `Expected body.${path} to be ${JSON.stringify(expected)}, ` +
            `but got ${JSON.stringify(value)}`,
        );
      }
    });
    return this;
  }

  /**
   * Assert response headers.
   */
  expectHeaders(headers: Record<string, string | RegExp>): FluentRequest {
    this.config.assertions.push((response) => {
      for (const [key, expected] of Object.entries(headers)) {
        const actual = response.headers[key.toLowerCase()];
        if (expected instanceof RegExp) {
          if (!expected.test(actual)) {
            throw new Error(
              `Expected header "${key}" to match ${expected}, but got "${actual}"`,
            );
          }
        } else if (actual !== expected) {
          throw new Error(
            `Expected header "${key}" to be "${expected}", but got "${actual}"`,
          );
        }
      }
    });
    return this;
  }

  /**
   * Assert a single header.
   */
  expectHeader(key: string, value: string | RegExp): FluentRequest {
    return this.expectHeaders({ [key]: value });
  }

  /**
   * Assert response time (UNIQUE ExpressoTS feature).
   */
  expectTime(options: TimeAssertion): FluentRequest {
    this.config.expectedTime = options;
    this.config.assertions.push((response) => {
      const time = response.time;

      if (options.lessThan !== undefined && time >= options.lessThan) {
        throw new Error(
          `Expected response time < ${options.lessThan}ms, but got ${time}ms`,
        );
      }

      if (options.greaterThan !== undefined && time <= options.greaterThan) {
        throw new Error(
          `Expected response time > ${options.greaterThan}ms, but got ${time}ms`,
        );
      }

      if (options.between !== undefined) {
        const [min, max] = options.between;
        if (time < min || time > max) {
          throw new Error(
            `Expected response time between ${min}ms and ${max}ms, but got ${time}ms`,
          );
        }
      }
    });
    return this;
  }

  /**
   * Assert content type.
   */
  expectContentType(type: string | RegExp): FluentRequest {
    this.config.assertions.push((response) => {
      const contentType = response.contentType;
      if (type instanceof RegExp) {
        if (!type.test(contentType)) {
          throw new Error(
            `Expected content-type to match ${type}, but got "${contentType}"`,
          );
        }
      } else if (!contentType.includes(type)) {
        throw new Error(
          `Expected content-type to contain "${type}", but got "${contentType}"`,
        );
      }
    });
    return this;
  }

  /**
   * Custom assertion.
   */
  expect<T>(assertion: (response: FluentResponse<T>) => void): FluentRequest {
    this.config.assertions.push(
      assertion as (response: FluentResponse<unknown>) => void,
    );
    return this;
  }

  /**
   * Execute the request and return the response.
   *
   * The generic defaults to `any` (see {@link FluentResponse} for the
   * rationale) so test code can read `response.body.foo` directly. Pass
   * an explicit type — `.execute<UserDto>()` — to opt into strict
   * typing.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async execute<T = any>(): Promise<FluentResponse<T>> {
    const startTime = Date.now();

    // Build URL with query parameters
    let url = `${this.baseUrl}${this.config.path}`;
    const queryParams = Object.entries(this.config.query);
    if (queryParams.length > 0) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of queryParams) {
        searchParams.append(key, String(value));
      }
      url += `?${searchParams.toString()}`;
    }

    // Prepare request options
    const fetchOptions: RequestInit = {
      method: this.config.method,
      headers: this.config.headers,
    };

    // Add body if present
    if (this.config.body !== undefined) {
      fetchOptions.body =
        typeof this.config.body === "string"
          ? this.config.body
          : JSON.stringify(this.config.body);
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    // Prevent timer from keeping Jest alive
    const timerWithUnref = timeoutId as ReturnType<typeof setTimeout> & {
      unref?: () => void;
    };
    if (typeof timerWithUnref.unref === "function") {
      timerWithUnref.unref();
    }
    fetchOptions.signal = controller.signal;

    try {
      const fetchResponse = await fetch(url, fetchOptions);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      clearTimeout(timeoutId);

      // Parse response
      const text = await fetchResponse.text();
      let body: T;
      try {
        body = JSON.parse(text) as T;
      } catch {
        body = text as unknown as T;
      }

      // Build headers object
      const headers: Record<string, string> = {};
      fetchResponse.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });

      // Create response object
      const response: FluentResponse<T> = {
        status: fetchResponse.status,
        statusText: fetchResponse.statusText,
        headers,
        body,
        text,
        time: responseTime,
        contentType: headers["content-type"] || "",
        ok: fetchResponse.ok,
        redirect: fetchResponse.status >= 300 && fetchResponse.status < 400,
        clientError: fetchResponse.status >= 400 && fetchResponse.status < 500,
        serverError: fetchResponse.status >= 500,
      };

      // Run assertions
      for (const assertion of this.config.assertions) {
        assertion(response as FluentResponse<unknown>);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Request timed out after ${this.config.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Alias for execute().
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  end<T = any>(): Promise<FluentResponse<T>> {
    return this.execute<T>();
  }
}

/**
 * Create a fluent request builder for a base URL.
 */
export function createFluentRequest(baseUrl: string): FluentRequestBuilder {
  return {
    get(path: string): FluentRequest {
      return new FluentRequestImpl(baseUrl, "GET", path);
    },

    post(path: string): FluentRequest {
      return new FluentRequestImpl(baseUrl, "POST", path);
    },

    put(path: string): FluentRequest {
      return new FluentRequestImpl(baseUrl, "PUT", path);
    },

    patch(path: string): FluentRequest {
      return new FluentRequestImpl(baseUrl, "PATCH", path);
    },

    delete(path: string): FluentRequest {
      return new FluentRequestImpl(baseUrl, "DELETE", path);
    },

    head(path: string): FluentRequest {
      return new FluentRequestImpl(baseUrl, "HEAD", path);
    },

    options(path: string): FluentRequest {
      return new FluentRequestImpl(baseUrl, "OPTIONS", path);
    },

    request(method: HttpMethod, path: string): FluentRequest {
      return new FluentRequestImpl(baseUrl, method, path);
    },
  };
}

/**
 * Create a standalone request builder from an app or URL.
 *
 * @example
 * ```typescript
 * // With app
 * const response = await request(app).get("/users").execute();
 *
 * // With URL
 * const response = await request("http://localhost:3000").get("/users").execute();
 * ```
 */
export function request(
  appOrUrl: { baseUrl: string } | string,
): FluentRequestBuilder {
  const baseUrl = typeof appOrUrl === "string" ? appOrUrl : appOrUrl.baseUrl;
  return createFluentRequest(baseUrl);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Deep partial match - checks if actual contains all properties of expected.
 */
function deepPartialMatch(actual: unknown, expected: unknown): boolean {
  if (expected === actual) return true;

  if (typeof expected !== "object" || expected === null) {
    return expected === actual;
  }

  if (typeof actual !== "object" || actual === null) {
    return false;
  }

  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return false;
    if (expected.length !== actual.length) return false;
    return expected.every((item, index) =>
      deepPartialMatch(actual[index], item),
    );
  }

  // Object comparison
  for (const key of Object.keys(expected)) {
    if (!(key in (actual as Record<string, unknown>))) return false;
    if (
      !deepPartialMatch(
        (actual as Record<string, unknown>)[key],
        (expected as Record<string, unknown>)[key],
      )
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Deep equality check.
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (typeof a !== typeof b) return false;

  if (typeof a !== "object" || a === null || b === null) {
    return a === b;
  }

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);

  if (keysA.length !== keysB.length) return false;

  return keysA.every((key) =>
    deepEqual(
      (a as Record<string, unknown>)[key],
      (b as Record<string, unknown>)[key],
    ),
  );
}

/**
 * Get value from object by dot-notation path.
 */
function getValueByPath(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    // Handle array indexing: "users[0]" or "users.0"
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, key, index] = arrayMatch;
      current = (current as Record<string, unknown>)[key];
      if (Array.isArray(current)) {
        current = current[parseInt(index, 10)];
      } else {
        return undefined;
      }
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }

  return current;
}
