/**
 * Request Context Mocking
 *
 * @module testing
 *
 * Mock entire request contexts for testing guards, middleware, and services.
 *
 * @example
 * ```typescript
 * const context = mockContext({
 *   user: { id: 123, role: "admin" },
 *   headers: { "x-api-key": "test-key" },
 *   params: { id: "456" }
 * });
 *
 * const guard = container.get(AdminGuard);
 * const result = await guard.canActivate(context);
 * expect(result).toBe(true);
 * ```
 */

import { Request, Response } from "express";
import {
  MockContextOptions,
  MockContext,
  MockFunction,
} from "./testing.interfaces";

/**
 * Create a mock function.
 */
function createMockFn(): MockFunction {
  const calls: Array<Array<unknown>> = [];
  const results: Array<{ type: "return" | "throw"; value: unknown }> = [];
  let returnValue: unknown;
  let resolvedValue: unknown;
  let rejectedValue: unknown;
  let implementation: ((...args: Array<unknown>) => unknown) | undefined;

  const mockFn = ((...args: Array<unknown>): unknown => {
    calls.push(args);

    if (implementation) {
      try {
        const result = implementation(...args);
        results.push({ type: "return", value: result });
        return result;
      } catch (error) {
        results.push({ type: "throw", value: error });
        throw error;
      }
    }

    if (rejectedValue !== undefined) {
      results.push({ type: "throw", value: rejectedValue });
      return Promise.reject(rejectedValue);
    }

    if (resolvedValue !== undefined) {
      results.push({ type: "return", value: resolvedValue });
      return Promise.resolve(resolvedValue);
    }

    results.push({ type: "return", value: returnValue });
    return returnValue;
  }) as MockFunction;

  mockFn.mockReturnValue = (value: unknown): MockFunction => {
    returnValue = value;
    return mockFn;
  };

  mockFn.mockResolvedValue = (value: unknown): MockFunction => {
    resolvedValue = value;
    return mockFn;
  };

  mockFn.mockRejectedValue = (error: unknown): MockFunction => {
    rejectedValue = error;
    return mockFn;
  };

  mockFn.mockImplementation = (
    fn: (...args: Array<unknown>) => unknown,
  ): MockFunction => {
    implementation = fn;
    return mockFn;
  };

  mockFn.mockClear = (): void => {
    calls.length = 0;
    results.length = 0;
  };

  mockFn.mockReset = (): void => {
    mockFn.mockClear();
    returnValue = undefined;
    resolvedValue = undefined;
    rejectedValue = undefined;
    implementation = undefined;
  };

  mockFn.mock = { calls, results };

  return mockFn;
}

/**
 * Create a mock Express request object.
 */
function createMockRequest(options: MockContextOptions): Request {
  const {
    user,
    headers = {},
    params = {},
    query = {},
    body,
    cookies = {},
    session = {},
    method = "GET",
    path = "/",
    url,
    ip = "127.0.0.1",
    request: customRequest = {},
  } = options;

  // Normalize headers to lowercase
  const normalizedHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    normalizedHeaders[key.toLowerCase()] = value;
  }

  const mockReq: Partial<Request> = {
    method,
    path,
    url: url || path,
    baseUrl: "",
    originalUrl: url || path,
    params,
    query: query as Request["query"],
    body,
    headers: normalizedHeaders as Request["headers"],
    cookies,
    ip,
    ips: [ip],
    protocol: "http",
    secure: false,
    hostname: "localhost",
    host: "localhost",
    subdomains: [],
    fresh: false,
    stale: true,
    xhr: false,
    route: undefined,
    signedCookies: {},
    app: {} as Request["app"],
    res: undefined,

    // Methods
    get: ((name: string): string | undefined => {
      return normalizedHeaders[name.toLowerCase()];
    }) as Request["get"],

    header: ((name: string): string | undefined => {
      return normalizedHeaders[name.toLowerCase()];
    }) as Request["header"],

    accepts: createMockFn().mockReturnValue(
      true,
    ) as unknown as Request["accepts"],
    acceptsCharsets: createMockFn().mockReturnValue(
      true,
    ) as unknown as Request["acceptsCharsets"],
    acceptsEncodings: createMockFn().mockReturnValue(
      true,
    ) as unknown as Request["acceptsEncodings"],
    acceptsLanguages: createMockFn().mockReturnValue(
      true,
    ) as unknown as Request["acceptsLanguages"],

    is: ((type: string | Array<string>): string | false | null => {
      const contentType = normalizedHeaders["content-type"] || "";
      if (Array.isArray(type)) {
        return type.find((t) => contentType.includes(t)) || false;
      }
      return contentType.includes(type) ? type : false;
    }) as Request["is"],

    range: createMockFn().mockReturnValue(
      undefined,
    ) as unknown as Request["range"],

    ...customRequest,
  };

  // Add user if provided
  if (user) {
    (mockReq as Request & { user?: unknown }).user = user;
  }

  // Add session if provided
  if (session) {
    (mockReq as Request & { session?: unknown }).session = session;
  }

  return mockReq as Request;
}

/**
 * Create a mock Express response object.
 */
function createMockResponse(options: MockContextOptions): Response {
  const { response: customResponse = {} } = options;

  let statusCode = 200;
  const statusMessage = "OK";
  const responseHeaders: Record<string, string> = {};
  let responseBody: unknown;
  const locals: Record<string, unknown> = {};

  const mockRes: Partial<Response> = {
    statusCode,
    statusMessage,
    headersSent: false,
    locals,
    app: {} as Response["app"],
    req: undefined,

    // Chainable methods
    status: function (this: Response, code: number): Response {
      statusCode = code;
      this.statusCode = code;
      return this;
    } as Response["status"],

    sendStatus: function (this: Response, code: number): Response {
      statusCode = code;
      this.statusCode = code;
      return this;
    } as Response["sendStatus"],
  };

  // Create the mock response object with proper this binding
  // We'll define methods that return the mockRes object
  const setFn = function (
    this: Response,
    field: string | Record<string, string>,
    val?: string,
  ): Response {
    if (typeof field === "object") {
      for (const [key, value] of Object.entries(field)) {
        responseHeaders[key.toLowerCase()] = value;
      }
    } else if (val !== undefined) {
      responseHeaders[field.toLowerCase()] = val;
    }
    return mockRes as Response;
  };

  Object.assign(mockRes, {
    set: setFn as Response["set"],

    header: setFn as Response["header"],

    get: function (field: string): string | undefined {
      return responseHeaders[field.toLowerCase()];
    } as Response["get"],

    json: function (body: unknown): Response {
      responseBody = body;
      responseHeaders["content-type"] = "application/json";
      return mockRes as Response;
    } as Response["json"],

    send: function (body: unknown): Response {
      responseBody = body;
      return mockRes as Response;
    } as Response["send"],

    end: createMockFn() as unknown as Response["end"],

    type: function (typeValue: string): Response {
      responseHeaders["content-type"] = typeValue;
      return mockRes as Response;
    } as Response["type"],

    contentType: function (typeValue: string): Response {
      responseHeaders["content-type"] = typeValue;
      return mockRes as Response;
    } as Response["contentType"],

    format: createMockFn() as unknown as Response["format"],

    attachment: function (filename?: string): Response {
      responseHeaders["content-disposition"] = filename
        ? `attachment; filename="${filename}"`
        : "attachment";
      return mockRes as Response;
    } as Response["attachment"],

    cookie: createMockFn() as unknown as Response["cookie"],
    clearCookie: createMockFn() as unknown as Response["clearCookie"],

    redirect: createMockFn() as unknown as Response["redirect"],
    render: createMockFn() as unknown as Response["render"],

    location: function (url: string): Response {
      responseHeaders["location"] = url;
      return mockRes as Response;
    } as Response["location"],

    links: createMockFn() as unknown as Response["links"],

    vary: function (field: string): Response {
      responseHeaders["vary"] = field;
      return mockRes as Response;
    } as Response["vary"],

    append: function (field: string, val: string | Array<string>): Response {
      const existing = responseHeaders[field.toLowerCase()];
      const newVal = Array.isArray(val) ? val.join(", ") : val;
      responseHeaders[field.toLowerCase()] = existing
        ? `${existing}, ${newVal}`
        : newVal;
      return mockRes as Response;
    } as Response["append"],

    ...customResponse,
  });

  // Add getters for response data (useful for assertions)
  Object.defineProperty(mockRes, "_body", {
    get: () => responseBody,
    enumerable: true,
  });

  Object.defineProperty(mockRes, "_headers", {
    get: () => ({ ...responseHeaders }),
    enumerable: true,
  });

  Object.defineProperty(mockRes, "_status", {
    get: () => statusCode,
    enumerable: true,
  });

  return mockRes as Response;
}

/**
 * Create a mock request context for testing.
 *
 * @layer public
 * @audience application-developers
 * @concept testing
 *
 * Creates mock Express request and response objects for testing
 * guards, middleware, interceptors, and services.
 *
 * @param options - Mock context options
 * @returns Mock context with request, response, and utilities
 *
 * @example
 * ```typescript
 * // Basic usage
 * const ctx = mockContext({
 *   user: { id: 123, role: "admin" },
 *   headers: { "authorization": "Bearer token123" }
 * });
 *
 * // Test a guard
 * const guard = container.get(AuthGuard);
 * const canActivate = await guard.canActivate(ctx);
 * expect(canActivate).toBe(true);
 *
 * // Test middleware
 * const middleware = container.get(LoggingMiddleware);
 * await middleware.use(ctx.request, ctx.response, ctx.next);
 * expect(ctx.next).toHaveBeenCalled();
 *
 * // Update context
 * ctx.update({ user: { id: 456, role: "user" } });
 *
 * // Reset to initial state
 * ctx.reset();
 * ```
 */
export function mockContext(options: MockContextOptions = {}): MockContext {
  let currentOptions = { ...options };
  let request = createMockRequest(currentOptions);
  let response = createMockResponse(currentOptions);
  let next = createMockFn();

  const context: MockContext = {
    get request() {
      return request;
    },

    get response() {
      return response;
    },

    get next() {
      return next;
    },

    get user() {
      return currentOptions.user;
    },

    reset() {
      currentOptions = { ...options };
      request = createMockRequest(currentOptions);
      response = createMockResponse(currentOptions);
      next = createMockFn();
    },

    update(newOptions: Partial<MockContextOptions>) {
      currentOptions = { ...currentOptions, ...newOptions };
      request = createMockRequest(currentOptions);
      response = createMockResponse(currentOptions);
    },
  };

  return context;
}

/**
 * Create a mock execution context compatible with ExpressoTS guards/interceptors.
 *
 * @example
 * ```typescript
 * const execContext = mockExecutionContext({
 *   user: { id: 123 },
 *   params: { id: "456" }
 * });
 *
 * const result = await guard.canActivate(execContext);
 * ```
 */
export function mockExecutionContext(options: MockContextOptions = {}): {
  request: Request;
  response: Response;
  getRequest: () => Request;
  getResponse: () => Response;
  getClass: () => new (...args: Array<unknown>) => unknown;
  getHandler: () => (...args: Array<unknown>) => unknown;
  switchToHttp: () => {
    getRequest: () => Request;
    getResponse: () => Response;
  };
} {
  const ctx = mockContext(options);

  // Mock controller class
  class MockController {}

  // Mock handler function
  const mockHandler = (): unknown => undefined;

  return {
    request: ctx.request,
    response: ctx.response,
    getRequest: (): Request => ctx.request,
    getResponse: (): Response => ctx.response,
    getClass: (): new (...args: Array<unknown>) => unknown => MockController,
    getHandler: (): ((...args: Array<unknown>) => unknown) => mockHandler,
    switchToHttp: () => ({
      getRequest: (): Request => ctx.request,
      getResponse: (): Response => ctx.response,
    }),
  };
}

/**
 * Create a mock next function that tracks calls.
 *
 * @example
 * ```typescript
 * const next = mockNextFunction();
 * await middleware.use(req, res, next);
 * expect(next).toHaveBeenCalled();
 * expect(next.mock.calls.length).toBe(1);
 * ```
 */
export function mockNextFunction(): MockFunction {
  return createMockFn();
}

/**
 * Create mock request/response pair for simple middleware testing.
 *
 * @example
 * ```typescript
 * const { req, res, next } = mockReqRes({
 *   method: "POST",
 *   body: { name: "Test" }
 * });
 *
 * await validationMiddleware(req, res, next);
 * expect(next).toHaveBeenCalled();
 * ```
 */
export function mockReqRes(options: MockContextOptions = {}): {
  req: Request;
  res: Response;
  next: MockFunction;
} {
  const ctx = mockContext(options);
  return {
    req: ctx.request,
    res: ctx.response,
    next: ctx.next,
  };
}
