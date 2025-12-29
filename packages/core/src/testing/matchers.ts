/**
 * Custom Matchers for Jest/Vitest
 *
 * @module testing
 *
 * Extends Jest/Vitest with ExpressoTS-specific matchers.
 *
 * @example
 * ```typescript
 * // Setup in test/setup.ts
 * import { setupExpressoTSMatchers } from "@expressots/testing";
 * setupExpressoTSMatchers();
 *
 * // Use in tests
 * expect(response).toHaveStatus(200);
 * expect(response).toHaveBody({ id: 1 });
 * expect(response).toRespondWithin(100);
 * ```
 */

import { FluentResponse } from "./testing.interfaces";

/**
 * Matcher result interface compatible with Jest/Vitest.
 */
interface MatcherResult {
  pass: boolean;
  message: () => string;
}

/**
 * Custom matchers for ExpressoTS responses.
 */
export const expressoTSMatchers = {
  /**
   * Assert response has specific status code.
   *
   * @example
   * expect(response).toHaveStatus(200);
   * expect(response).toHaveStatus(201);
   */
  toHaveStatus(received: FluentResponse, expected: number): MatcherResult {
    const pass = received.status === expected;

    return {
      pass,
      message: () =>
        pass
          ? `Expected response not to have status ${expected}, but it did`
          : `Expected response to have status ${expected}, but got ${received.status}`,
    };
  },

  /**
   * Assert response is successful (2xx).
   *
   * @example
   * expect(response).toBeSuccessful();
   */
  toBeSuccessful(received: FluentResponse): MatcherResult {
    const pass = received.ok;

    return {
      pass,
      message: () =>
        pass
          ? `Expected response not to be successful, but got status ${received.status}`
          : `Expected response to be successful (2xx), but got status ${received.status}`,
    };
  },

  /**
   * Assert response is a redirect (3xx).
   *
   * @example
   * expect(response).toBeRedirect();
   */
  toBeRedirect(received: FluentResponse): MatcherResult {
    const pass = received.redirect;

    return {
      pass,
      message: () =>
        pass
          ? `Expected response not to be a redirect, but got status ${received.status}`
          : `Expected response to be a redirect (3xx), but got status ${received.status}`,
    };
  },

  /**
   * Assert response is a client error (4xx).
   *
   * @example
   * expect(response).toBeClientError();
   */
  toBeClientError(received: FluentResponse): MatcherResult {
    const pass = received.clientError;

    return {
      pass,
      message: () =>
        pass
          ? `Expected response not to be a client error, but got status ${received.status}`
          : `Expected response to be a client error (4xx), but got status ${received.status}`,
    };
  },

  /**
   * Assert response is a server error (5xx).
   *
   * @example
   * expect(response).toBeServerError();
   */
  toBeServerError(received: FluentResponse): MatcherResult {
    const pass = received.serverError;

    return {
      pass,
      message: () =>
        pass
          ? `Expected response not to be a server error, but got status ${received.status}`
          : `Expected response to be a server error (5xx), but got status ${received.status}`,
    };
  },

  /**
   * Assert response has specific body content.
   *
   * @example
   * expect(response).toHaveBody({ id: 1, name: "John" });
   * expect(response).toHaveBody((body) => body.id > 0);
   */
  toHaveBody(
    received: FluentResponse,
    expected: unknown | ((body: unknown) => boolean)
  ): MatcherResult {
    let pass: boolean;

    if (typeof expected === "function") {
      pass = expected(received.body);
    } else {
      pass = deepPartialMatch(received.body, expected);
    }

    return {
      pass,
      message: () =>
        pass
          ? `Expected response body not to match ${JSON.stringify(expected)}`
          : `Expected response body to match ${JSON.stringify(expected)}, but got ${JSON.stringify(received.body)}`,
    };
  },

  /**
   * Assert response has specific header.
   *
   * @example
   * expect(response).toHaveHeader("content-type", "application/json");
   * expect(response).toHaveHeader("x-custom-header");
   */
  toHaveHeader(
    received: FluentResponse,
    header: string,
    value?: string | RegExp
  ): MatcherResult {
    const headerValue = received.headers[header.toLowerCase()];
    let pass: boolean;

    if (value === undefined) {
      pass = headerValue !== undefined;
    } else if (value instanceof RegExp) {
      pass = value.test(headerValue || "");
    } else {
      pass = headerValue === value;
    }

    return {
      pass,
      message: () =>
        pass
          ? `Expected response not to have header "${header}"${value ? ` with value "${value}"` : ""}`
          : `Expected response to have header "${header}"${value ? ` with value "${value}"` : ""}, but got "${headerValue}"`,
    };
  },

  /**
   * Assert response content type.
   *
   * @example
   * expect(response).toHaveContentType("application/json");
   * expect(response).toHaveContentType(/json/);
   */
  toHaveContentType(
    received: FluentResponse,
    expected: string | RegExp
  ): MatcherResult {
    const contentType = received.contentType;
    let pass: boolean;

    if (expected instanceof RegExp) {
      pass = expected.test(contentType);
    } else {
      pass = contentType.includes(expected);
    }

    return {
      pass,
      message: () =>
        pass
          ? `Expected content type not to match "${expected}", but got "${contentType}"`
          : `Expected content type to match "${expected}", but got "${contentType}"`,
    };
  },

  /**
   * Assert response time is within threshold.
   *
   * @example
   * expect(response).toRespondWithin(100); // Less than 100ms
   */
  toRespondWithin(received: FluentResponse, maxMs: number): MatcherResult {
    const pass = received.time < maxMs;

    return {
      pass,
      message: () =>
        pass
          ? `Expected response time not to be less than ${maxMs}ms, but was ${received.time}ms`
          : `Expected response time to be less than ${maxMs}ms, but was ${received.time}ms`,
    };
  },

  /**
   * Assert response has JSON body.
   *
   * @example
   * expect(response).toBeJSON();
   */
  toBeJSON(received: FluentResponse): MatcherResult {
    const isJSON = received.contentType.includes("application/json") &&
      typeof received.body === "object";

    return {
      pass: isJSON,
      message: () =>
        isJSON
          ? `Expected response not to be JSON`
          : `Expected response to be JSON, but content-type was "${received.contentType}"`,
    };
  },

  /**
   * Assert response body has property.
   *
   * @example
   * expect(response).toHaveBodyProperty("user.id");
   * expect(response).toHaveBodyProperty("user.name", "John");
   */
  toHaveBodyProperty(
    received: FluentResponse,
    path: string,
    value?: unknown
  ): MatcherResult {
    const actualValue = getValueByPath(received.body, path);
    let pass: boolean;

    if (value === undefined) {
      pass = actualValue !== undefined;
    } else {
      pass = deepEqual(actualValue, value);
    }

    return {
      pass,
      message: () =>
        pass
          ? `Expected body not to have property "${path}"${value !== undefined ? ` with value ${JSON.stringify(value)}` : ""}`
          : `Expected body to have property "${path}"${value !== undefined ? ` with value ${JSON.stringify(value)}, but got ${JSON.stringify(actualValue)}` : ", but it was undefined"}`,
    };
  },

  /**
   * Assert response body is an array.
   *
   * @example
   * expect(response).toHaveBodyArray();
   * expect(response).toHaveBodyArray(3); // Array with length 3
   */
  toHaveBodyArray(received: FluentResponse, length?: number): MatcherResult {
    const isArray = Array.isArray(received.body);
    let pass = isArray;

    if (isArray && length !== undefined) {
      pass = (received.body as Array<unknown>).length === length;
    }

    return {
      pass,
      message: (): string => {
        if (!isArray) {
          return `Expected body to be an array, but got ${typeof received.body}`;
        }
        if (length !== undefined && pass) {
          return `Expected body array not to have length ${length}`;
        }
        if (length !== undefined && !pass) {
          return `Expected body array to have length ${length}, but got ${(received.body as Array<unknown>).length}`;
        }
        return pass
          ? `Expected body not to be an array`
          : `Expected body to be an array`;
      },
    };
  },

  /**
   * Assert response body matches JSON schema (basic validation).
   *
   * @example
   * expect(response).toMatchSchema({
   *   type: "object",
   *   properties: {
   *     id: { type: "number" },
   *     name: { type: "string" }
   *   }
   * });
   */
  toMatchSchema(received: FluentResponse, schema: JSONSchema): MatcherResult {
    const errors = validateSchema(received.body, schema);
    const pass = errors.length === 0;

    return {
      pass,
      message: () =>
        pass
          ? `Expected body not to match schema`
          : `Expected body to match schema, but found errors:\n${errors.map(e => `  - ${e}`).join("\n")}`,
    };
  },
};

/**
 * Setup ExpressoTS matchers for Jest/Vitest.
 *
 * @example
 * ```typescript
 * // In test/setup.ts or jest.setup.ts
 * import { setupExpressoTSMatchers } from "@expressots/testing";
 * setupExpressoTSMatchers();
 * ```
 */
export function setupExpressoTSMatchers(): void {
  if (typeof expect !== "undefined" && typeof expect.extend === "function") {
    expect.extend(expressoTSMatchers);
  } else {
    console.warn(
      "Could not setup ExpressoTS matchers: expect.extend is not available. " +
      "Make sure you're running this in a Jest or Vitest environment."
    );
  }
}

// ============================================================================
// TypeScript Declaration Merging
// ============================================================================

/**
 * Extend Jest/Vitest expect interface.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toHaveStatus(status: number): R;
      toBeSuccessful(): R;
      toBeRedirect(): R;
      toBeClientError(): R;
      toBeServerError(): R;
      toHaveBody(expected: unknown | ((body: unknown) => boolean)): R;
      toHaveHeader(header: string, value?: string | RegExp): R;
      toHaveContentType(expected: string | RegExp): R;
      toRespondWithin(maxMs: number): R;
      toBeJSON(): R;
      toHaveBodyProperty(path: string, value?: unknown): R;
      toHaveBodyArray(length?: number): R;
      toMatchSchema(schema: JSONSchema): R;
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Deep partial match.
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
    return expected.every((item, index) => deepPartialMatch(actual[index], item));
  }

  for (const key of Object.keys(expected)) {
    if (!(key in (actual as Record<string, unknown>))) return false;
    if (!deepPartialMatch(
      (actual as Record<string, unknown>)[key],
      (expected as Record<string, unknown>)[key]
    )) {
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
  if (typeof a !== "object" || a === null || b === null) return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);

  if (keysA.length !== keysB.length) return false;

  return keysA.every(key =>
    deepEqual(
      (a as Record<string, unknown>)[key],
      (b as Record<string, unknown>)[key]
    )
  );
}

/**
 * Get value by path.
 */
function getValueByPath(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

// ============================================================================
// JSON Schema Validation (Basic)
// ============================================================================

/**
 * Basic JSON Schema type.
 */
interface JSONSchema {
  type?: "string" | "number" | "boolean" | "object" | "array" | "null";
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: Array<string>;
  enum?: Array<unknown>;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

/**
 * Basic JSON Schema validation.
 */
function validateSchema(value: unknown, schema: JSONSchema, path: string = ""): Array<string> {
  const errors: Array<string> = [];

  // Type validation
  if (schema.type) {
    const actualType = getJSONType(value);
    if (actualType !== schema.type) {
      errors.push(`${path || "value"} should be ${schema.type}, got ${actualType}`);
      return errors;
    }
  }

  // Enum validation
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path || "value"} should be one of [${schema.enum.join(", ")}]`);
  }

  // Number constraints
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${path || "value"} should be >= ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${path || "value"} should be <= ${schema.maximum}`);
    }
  }

  // String constraints
  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${path || "value"} should have length >= ${schema.minLength}`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(`${path || "value"} should have length <= ${schema.maxLength}`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${path || "value"} should match pattern ${schema.pattern}`);
    }
  }

  // Object validation
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;

    // Required properties
    if (schema.required) {
      for (const prop of schema.required) {
        if (!(prop in obj)) {
          errors.push(`${path ? `${path}.` : ""}${prop} is required`);
        }
      }
    }

    // Nested properties
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in obj) {
          errors.push(...validateSchema(obj[key], propSchema, `${path ? `${path}.` : ""}${key}`));
        }
      }
    }
  }

  // Array validation
  if (Array.isArray(value) && schema.items) {
    for (let i = 0; i < value.length; i++) {
      errors.push(...validateSchema(value[i], schema.items, `${path}[${i}]`));
    }
  }

  return errors;
}

/**
 * Get JSON type of value.
 */
function getJSONType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

