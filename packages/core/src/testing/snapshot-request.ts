/**
 * API Snapshot Testing
 *
 * @module testing
 *
 * Provides snapshot testing for API responses.
 * Automatically detects breaking changes in API structure.
 *
 * @example
 * ```typescript
 * await snapshotRequest(app)
 *   .get("/users")
 *   .expectSnapshot({ ignore: ["createdAt", "updatedAt"] });
 * ```
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import {
  SnapshotRequestBuilder,
  SnapshotRequest,
  SnapshotOptions,
  FluentRequest,
  HttpMethod,
  FluentResponse,
} from "./testing.interfaces.js";
import { createFluentRequest } from "./fluent-request.js";

/**
 * Internal snapshot request implementation.
 */
class SnapshotRequestImpl implements SnapshotRequest {
  private baseUrl: string;
  private method: HttpMethod;
  private urlPath: string;
  private fluentRequest: FluentRequest;
  private testName: string;

  constructor(baseUrl: string, method: HttpMethod, urlPath: string) {
    this.baseUrl = baseUrl;
    this.method = method;
    this.urlPath = urlPath;
    this.fluentRequest = createFluentRequest(baseUrl).request(method, urlPath);
    this.testName = getTestName();
  }

  // Delegate all FluentRequest methods
  set(headers: Record<string, string>): SnapshotRequest;
  set(key: string, value: string): SnapshotRequest;
  set(
    headersOrKey: Record<string, string> | string,
    value?: string,
  ): SnapshotRequest {
    if (typeof headersOrKey === "string" && value !== undefined) {
      this.fluentRequest.set(headersOrKey, value);
    } else {
      this.fluentRequest.set(headersOrKey as Record<string, string>);
    }
    return this;
  }

  send(body: unknown): SnapshotRequest {
    this.fluentRequest.send(body);
    return this;
  }

  query(params: Record<string, string | number | boolean>): SnapshotRequest {
    this.fluentRequest.query(params);
    return this;
  }

  auth(token: string, type?: "Bearer" | "Basic"): SnapshotRequest {
    this.fluentRequest.auth(token, type);
    return this;
  }

  attach(field: string, filePath: string): SnapshotRequest {
    this.fluentRequest.attach(field, filePath);
    return this;
  }

  type(contentType: string): SnapshotRequest {
    this.fluentRequest.type(contentType);
    return this;
  }

  accept(contentType: string): SnapshotRequest {
    this.fluentRequest.accept(contentType);
    return this;
  }

  timeout(ms: number): SnapshotRequest {
    this.fluentRequest.timeout(ms);
    return this;
  }

  expectStatus(status: number): SnapshotRequest {
    this.fluentRequest.expectStatus(status);
    return this;
  }

  expectBodyPath(jsonPath: string, expected: unknown): SnapshotRequest {
    this.fluentRequest.expectBodyPath(jsonPath, expected);
    return this;
  }

  expectHeaders(headers: Record<string, string | RegExp>): SnapshotRequest {
    this.fluentRequest.expectHeaders(headers);
    return this;
  }

  expectHeader(key: string, value: string | RegExp): SnapshotRequest {
    this.fluentRequest.expectHeader(key, value);
    return this;
  }

  expectTime(options: {
    lessThan?: number;
    greaterThan?: number;
    between?: [number, number];
  }): SnapshotRequest {
    this.fluentRequest.expectTime(options);
    return this;
  }

  expectContentType(typeValue: string | RegExp): SnapshotRequest {
    this.fluentRequest.expectContentType(typeValue);
    return this;
  }

  expect<T>(assertion: (response: FluentResponse<T>) => void): SnapshotRequest {
    this.fluentRequest.expect(assertion);
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute<T = any>(): Promise<FluentResponse<T>> {
    return this.fluentRequest.execute<T>();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  end<T = any>(): Promise<FluentResponse<T>> {
    return this.fluentRequest.end<T>();
  }

  /**
   * Assert response matches snapshot.
   *
   * @param options - Snapshot options
   */
  async expectSnapshot(options: SnapshotOptions = {}): Promise<void> {
    const response = await this.fluentRequest.execute();
    const snapshotPath = this.getSnapshotPath(options);
    const serializedBody = this.serializeForSnapshot(response.body, options);

    // Check if snapshot exists
    if (fs.existsSync(snapshotPath)) {
      // Compare with existing snapshot
      const existingSnapshot = fs.readFileSync(snapshotPath, "utf-8");

      if (options.update) {
        // Update mode - write new snapshot
        this.writeSnapshot(snapshotPath, serializedBody);
        console.log(`📸 Snapshot updated: ${snapshotPath}`);
      } else if (existingSnapshot !== serializedBody) {
        // Show diff and throw error
        const diff = generateDiff(existingSnapshot, serializedBody);
        throw new Error(
          `Snapshot mismatch!\n\n` +
            `Expected:\n${existingSnapshot}\n\n` +
            `Received:\n${serializedBody}\n\n` +
            `Diff:\n${diff}\n\n` +
            `💡 To update the snapshot, run with { update: true } or use updateSnapshot()`,
        );
      }
    } else {
      // Create new snapshot
      this.writeSnapshot(snapshotPath, serializedBody);
      console.log(`📸 Snapshot created: ${snapshotPath}`);
    }
  }

  /**
   * Create or update snapshot.
   */
  async updateSnapshot(
    options: Omit<SnapshotOptions, "update"> = {},
  ): Promise<void> {
    return this.expectSnapshot({ ...options, update: true });
  }

  /**
   * Get current snapshot for comparison.
   */
  async getSnapshot(options: SnapshotOptions = {}): Promise<unknown> {
    const snapshotPath = this.getSnapshotPath(options);

    if (fs.existsSync(snapshotPath)) {
      const content = fs.readFileSync(snapshotPath, "utf-8");
      try {
        return JSON.parse(content);
      } catch {
        return content;
      }
    }

    return null;
  }

  /**
   * Get the snapshot file path.
   */
  private getSnapshotPath(options: SnapshotOptions): string {
    const directory = options.directory || "__snapshots__";
    const name = options.name || this.generateSnapshotName();

    // Ensure directory exists
    const snapshotDir = path.resolve(process.cwd(), directory);
    if (!fs.existsSync(snapshotDir)) {
      fs.mkdirSync(snapshotDir, { recursive: true });
    }

    return path.join(snapshotDir, `${name}.snap`);
  }

  /**
   * Generate a unique snapshot name based on test and request.
   */
  private generateSnapshotName(): string {
    const testPart = this.testName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    const requestPart = `${this.method.toLowerCase()}_${this.urlPath.replace(/[^a-zA-Z0-9]/g, "_")}`;

    return `${testPart}_${requestPart}`;
  }

  /**
   * Serialize body for snapshot, applying ignore rules.
   */
  private serializeForSnapshot(
    body: unknown,
    options: SnapshotOptions,
  ): string {
    let processed = body;

    // Apply ignore rules
    if (options.ignore && options.ignore.length > 0) {
      processed = removeIgnoredFields(body, options.ignore);
    }

    // Use custom serializer if provided
    if (options.serializer) {
      return options.serializer(processed);
    }

    // Default: Pretty-print JSON
    return JSON.stringify(processed, null, 2);
  }

  /**
   * Write snapshot to file.
   */
  private writeSnapshot(snapshotPath: string, content: string): void {
    fs.writeFileSync(snapshotPath, content, "utf-8");
  }
}

/**
 * Create a snapshot request builder.
 *
 * @param appOrUrl - Test app or base URL
 * @returns Snapshot request builder
 *
 * @example
 * ```typescript
 * await snapshotRequest(app)
 *   .get("/users")
 *   .expectSnapshot({ ignore: ["id", "createdAt"] });
 * ```
 */
export function snapshotRequest(
  appOrUrl: { baseUrl: string } | string,
): SnapshotRequestBuilder {
  const baseUrl = typeof appOrUrl === "string" ? appOrUrl : appOrUrl.baseUrl;

  return {
    get(urlPath: string): SnapshotRequest {
      return new SnapshotRequestImpl(baseUrl, "GET", urlPath);
    },

    post(urlPath: string): SnapshotRequest {
      return new SnapshotRequestImpl(baseUrl, "POST", urlPath);
    },

    put(urlPath: string): SnapshotRequest {
      return new SnapshotRequestImpl(baseUrl, "PUT", urlPath);
    },

    patch(urlPath: string): SnapshotRequest {
      return new SnapshotRequestImpl(baseUrl, "PATCH", urlPath);
    },

    delete(urlPath: string): SnapshotRequest {
      return new SnapshotRequestImpl(baseUrl, "DELETE", urlPath);
    },

    head(urlPath: string): SnapshotRequest {
      return new SnapshotRequestImpl(baseUrl, "HEAD", urlPath);
    },

    options(urlPath: string): SnapshotRequest {
      return new SnapshotRequestImpl(baseUrl, "OPTIONS", urlPath);
    },
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the current test name from the test framework.
 */
function getTestName(): string {
  // Try Jest
  type ExpectWithState = typeof expect & {
    getState?: () => { currentTestName?: string };
  };
  const expectWithState = expect as ExpectWithState;
  if (typeof expect !== "undefined" && expectWithState.getState) {
    const state = expectWithState.getState();
    if (state && state.currentTestName) {
      return state.currentTestName;
    }
  }

  // Try Vitest
  type GlobalWithVitest = typeof globalThis & {
    __vitest_worker__?: { current?: { name?: string } };
  };
  const globalWithVitest = globalThis as GlobalWithVitest;
  if (typeof globalWithVitest.__vitest_worker__ !== "undefined") {
    const worker = globalWithVitest.__vitest_worker__;
    if (worker?.current?.name) {
      return worker.current.name;
    }
  }

  // Fallback: Generate hash based on stack trace
  const stack = new Error().stack || "";
  return crypto.createHash("md5").update(stack).digest("hex").substring(0, 8);
}

/**
 * Remove ignored fields from an object recursively.
 */
function removeIgnoredFields(obj: unknown, ignore: Array<string>): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => removeIgnoredFields(item, ignore));
  }

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (ignore.includes(key)) {
        result[key] = "[IGNORED]";
      } else if (typeof value === "object" && value !== null) {
        result[key] = removeIgnoredFields(value, ignore);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  return obj;
}

/**
 * Generate a simple diff between two strings.
 */
function generateDiff(expected: string, received: string): string {
  const expectedLines = expected.split("\n");
  const receivedLines = received.split("\n");
  const diff: Array<string> = [];

  const maxLines = Math.max(expectedLines.length, receivedLines.length);

  for (let i = 0; i < maxLines; i++) {
    const expectedLine = expectedLines[i];
    const receivedLine = receivedLines[i];

    if (expectedLine === receivedLine) {
      diff.push(`  ${expectedLine || ""}`);
    } else {
      if (expectedLine !== undefined) {
        diff.push(`- ${expectedLine}`);
      }
      if (receivedLine !== undefined) {
        diff.push(`+ ${receivedLine}`);
      }
    }
  }

  return diff.join("\n");
}

/**
 * Snapshot assertion helper for use with Jest/Vitest.
 *
 * @example
 * ```typescript
 * expect(response.body).toMatchApiSnapshot({
 *   ignore: ["id", "createdAt"]
 * });
 * ```
 */
export function toMatchApiSnapshot(
  received: unknown,
  options: SnapshotOptions = {},
): { pass: boolean; message: () => string } {
  const processed = options.ignore
    ? removeIgnoredFields(received, options.ignore)
    : received;

  // Use Jest/Vitest's built-in snapshot matching
  type ExpectWithState = typeof expect & { getState?: () => unknown };
  if (typeof expect !== "undefined" && (expect as ExpectWithState).getState) {
    try {
      expect(processed).toMatchSnapshot();
      return {
        pass: true,
        message: () => "Snapshot matched",
      };
    } catch (error) {
      return {
        pass: false,
        message: () => (error as Error).message,
      };
    }
  }

  return {
    pass: true,
    message: () => "Snapshot matching not available in this environment",
  };
}
