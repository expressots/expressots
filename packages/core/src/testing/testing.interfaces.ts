/**
 * Testing Module - Core Interfaces and Types
 *
 * @module testing
 *
 * Provides comprehensive testing utilities for ExpressoTS applications.
 * These interfaces define the contract for all testing utilities.
 */

import { Container } from "../di/inversify.js";
import { Request, Response } from "express";

// ============================================================================
// Test App Interfaces
// ============================================================================

/**
 * Options for creating a test application.
 *
 * @example
 * ```typescript
 * const { app, container, request } = await createTestApp(App, {
 *   mockProviders: [{ provide: UserService, useValue: mockUserService }],
 *   env: { DATABASE_URL: "memory://test" }
 * });
 * ```
 */
export interface CreateTestAppOptions {
  /**
   * Override providers with mocks.
   * Auto-resolved from container if not specified.
   */
  mockProviders?: Array<MockProviderConfig>;

  /**
   * Environment variables for testing.
   * Merged with process.env.
   */
  env?: Record<string, string>;

  /**
   * Skip specific modules from loading.
   * Useful for isolating tests.
   */
  skipModules?: Array<string>;

  /**
   * Enable request logging during tests.
   * @default false
   */
  enableLogging?: boolean;

  /**
   * Auto-cleanup after each test.
   * @default true
   */
  autoCleanup?: boolean;

  /**
   * Port for the test server.
   * @default 0 (auto-assign)
   */
  port?: number;
}

/**
 * Result of creating a test application.
 */
export interface TestAppResult {
  /**
   * The test application instance.
   */
  app: ITestApp;

  /**
   * The DI container with access to all services.
   */
  container: Container;

  /**
   * Fluent HTTP request builder.
   */
  request: FluentRequestBuilder;

  /**
   * The actual port the server is listening on.
   */
  port: number;

  /**
   * Base URL for the test server.
   */
  baseUrl: string;

  /**
   * Cleanup function to close the server.
   */
  cleanup: () => Promise<void>;
}

/**
 * Test application interface.
 */
export interface ITestApp {
  /**
   * The underlying Express application.
   */
  getHttpServer(): unknown;

  /**
   * Close the test server.
   */
  close(): Promise<void>;

  /**
   * Get a service from the container.
   */
  get<T>(serviceIdentifier: ServiceIdentifier<T>): T;

  /**
   * Check if a service is bound in the container.
   */
  isBound<T>(serviceIdentifier: ServiceIdentifier<T>): boolean;

  /**
   * Override a provider with a mock.
   */
  overrideProvider<T>(
    serviceIdentifier: ServiceIdentifier<T>,
    mock: Partial<T>,
  ): void;
}

// ============================================================================
// Mock Provider Interfaces
// ============================================================================

/**
 * Service identifier type (class or symbol).
 */
export type ServiceIdentifier<T = unknown> =
  | (new (...args: Array<unknown>) => T)
  | symbol
  | string;

/**
 * Configuration for mocking a provider.
 */
export interface MockProviderConfig<T = unknown> {
  /**
   * The service identifier to mock.
   */
  provide: ServiceIdentifier<T>;

  /**
   * The mock implementation.
   * Can be a partial implementation or a complete mock.
   */
  useValue?: Partial<T>;

  /**
   * Factory function to create the mock.
   */
  useFactory?: () => T | Partial<T>;

  /**
   * Class to use as the mock implementation.
   */
  useClass?: new (...args: Array<unknown>) => T;
}

/**
 * Options for the mockProvider function.
 */
export interface MockProviderOptions<T> {
  /**
   * Mock implementations for dependencies.
   * TypeScript will auto-suggest based on the service's dependencies.
   */
  mocks?: MockDependencies<T>;

  /**
   * Additional container bindings.
   */
  additionalBindings?: Array<MockProviderConfig>;

  /**
   * Auto-mock all dependencies not explicitly provided.
   * @default true
   */
  autoMock?: boolean;

  /**
   * Use jest.fn() or vitest's vi.fn() for auto-mocking.
   * @default "jest"
   */
  mockFramework?: "jest" | "vitest";
}

/**
 * Result of mockProvider function.
 */
export interface MockProviderResult<T> {
  /**
   * The mocked service instance.
   */
  service: T;

  /**
   * Access to all mocked dependencies.
   * TypeScript provides auto-completion for mock methods.
   */
  mocks: MockDependencies<T>;

  /**
   * The DI container used for the mock.
   */
  container: Container;

  /**
   * Reset all mocks.
   */
  resetAllMocks: () => void;

  /**
   * Clear all mock call history.
   */
  clearAllMocks: () => void;

  /**
   * Verify that all expected mock calls were made.
   */
  verifyAllMocks: () => void;
}

/**
 * Type helper for mock dependencies.
 * Extracts dependencies from a service class and creates mock types.
 */
export type MockDependencies<T> = {
  [K in keyof ExtractDependencies<T>]?: MockOf<ExtractDependencies<T>[K]>;
};

/**
 * Helper type to extract constructor dependencies.
 */
export type ExtractDependencies<T> = T extends new (...args: infer P) => unknown
  ? P extends Array<unknown>
    ? { [K in keyof P]: P[K] }
    : never
  : Record<string, unknown>;

/**
 * Mock type - makes all methods mockable.
 */
export type MockOf<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? MockFunction<A, R>
    : T[K];
};

/**
 * Mock function interface (compatible with Jest and Vitest).
 */
export interface MockFunction<
  A extends Array<unknown> = Array<unknown>,
  R = unknown,
> {
  (...args: A): R;
  mockReturnValue: (value: R) => MockFunction<A, R>;
  mockResolvedValue: (value: Awaited<R>) => MockFunction<A, R>;
  mockRejectedValue: (error: unknown) => MockFunction<A, R>;
  mockImplementation: (fn: (...args: A) => R) => MockFunction<A, R>;
  mockClear: () => void;
  mockReset: () => void;
  mock: {
    calls: Array<A>;
    results: Array<{ type: "return" | "throw"; value: unknown }>;
  };
}

// ============================================================================
// Fluent Request Interfaces
// ============================================================================

/**
 * HTTP methods supported by the fluent request builder.
 */
export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

/**
 * Fluent request builder for testing HTTP endpoints.
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
export interface FluentRequestBuilder {
  /**
   * Create a GET request.
   */
  get(path: string): FluentRequest;

  /**
   * Create a POST request.
   */
  post(path: string): FluentRequest;

  /**
   * Create a PUT request.
   */
  put(path: string): FluentRequest;

  /**
   * Create a PATCH request.
   */
  patch(path: string): FluentRequest;

  /**
   * Create a DELETE request.
   */
  delete(path: string): FluentRequest;

  /**
   * Create a HEAD request.
   */
  head(path: string): FluentRequest;

  /**
   * Create an OPTIONS request.
   */
  options(path: string): FluentRequest;

  /**
   * Create a request with any method.
   */
  request(method: HttpMethod, path: string): FluentRequest;
}

/**
 * Fluent request chain for building and executing HTTP requests.
 */
export interface FluentRequest {
  /**
   * Set request headers.
   */
  set(headers: Record<string, string>): FluentRequest;
  set(key: string, value: string): FluentRequest;

  /**
   * Set request body (for POST, PUT, PATCH).
   */
  send(body: unknown): FluentRequest;

  /**
   * Set query parameters.
   */
  query(params: Record<string, string | number | boolean>): FluentRequest;

  /**
   * Set authorization header.
   */
  auth(token: string, type?: "Bearer" | "Basic"): FluentRequest;

  /**
   * Attach file for upload.
   */
  attach(field: string, filePath: string): FluentRequest;

  /**
   * Set content type.
   */
  type(contentType: string): FluentRequest;

  /**
   * Set accept header.
   */
  accept(contentType: string): FluentRequest;

  /**
   * Set timeout for the request.
   */
  timeout(ms: number): FluentRequest;

  // ---- Assertions ----

  /**
   * Assert response status code.
   */
  expectStatus(status: number): FluentRequest;

  /**
   * Assert response body.
   * Supports exact match, partial match, or predicate.
   */
  expectBody<T>(
    expected: T | Partial<T> | ((body: T) => boolean),
  ): FluentRequest;

  /**
   * Assert response body with JSON path.
   */
  expectBodyPath(path: string, expected: unknown): FluentRequest;

  /**
   * Assert response headers.
   */
  expectHeaders(headers: Record<string, string | RegExp>): FluentRequest;

  /**
   * Assert a single header.
   */
  expectHeader(key: string, value: string | RegExp): FluentRequest;

  /**
   * Assert response time.
   * Unique ExpressoTS feature: Performance assertions built-in.
   */
  expectTime(options: TimeAssertion): FluentRequest;

  /**
   * Assert content type.
   */
  expectContentType(type: string | RegExp): FluentRequest;

  /**
   * Custom assertion on the response.
   */
  expect<T>(assertion: (response: FluentResponse<T>) => void): FluentRequest;

  /**
   * Execute the request and return the response.
   */
  execute<T = unknown>(): Promise<FluentResponse<T>>;

  /**
   * Alias for execute().
   */
  end<T = unknown>(): Promise<FluentResponse<T>>;
}

/**
 * Time assertion options for performance testing.
 */
export interface TimeAssertion {
  /**
   * Response time must be less than this value (ms).
   */
  lessThan?: number;

  /**
   * Response time must be greater than this value (ms).
   */
  greaterThan?: number;

  /**
   * Response time must be between these values (ms).
   */
  between?: [number, number];
}

/**
 * Fluent response object.
 */
export interface FluentResponse<T = unknown> {
  /**
   * Response status code.
   */
  status: number;

  /**
   * Response status text.
   */
  statusText: string;

  /**
   * Response headers.
   */
  headers: Record<string, string>;

  /**
   * Parsed response body.
   */
  body: T;

  /**
   * Raw response text.
   */
  text: string;

  /**
   * Response time in milliseconds.
   */
  time: number;

  /**
   * Content type header.
   */
  contentType: string;

  /**
   * Check if response is OK (2xx status).
   */
  ok: boolean;

  /**
   * Check if response is redirect (3xx status).
   */
  redirect: boolean;

  /**
   * Check if response is client error (4xx status).
   */
  clientError: boolean;

  /**
   * Check if response is server error (5xx status).
   */
  serverError: boolean;
}

// ============================================================================
// Snapshot Testing Interfaces
// ============================================================================

/**
 * Options for snapshot testing.
 */
export interface SnapshotOptions {
  /**
   * Fields to ignore in snapshot comparison.
   * Useful for dynamic fields like timestamps, IDs.
   */
  ignore?: Array<string>;

  /**
   * Custom snapshot name.
   * Defaults to test name + request path.
   */
  name?: string;

  /**
   * Snapshot directory.
   * @default "__snapshots__"
   */
  directory?: string;

  /**
   * Update existing snapshots.
   * @default false
   */
  update?: boolean;

  /**
   * Custom serializer for the snapshot.
   */
  serializer?: (body: unknown) => string;
}

/**
 * Snapshot request builder.
 *
 * @example
 * ```typescript
 * await snapshotRequest(app)
 *   .get("/users")
 *   .expectSnapshot({ ignore: ["createdAt", "updatedAt"] });
 * ```
 */
export interface SnapshotRequestBuilder {
  get(path: string): SnapshotRequest;
  post(path: string): SnapshotRequest;
  put(path: string): SnapshotRequest;
  patch(path: string): SnapshotRequest;
  delete(path: string): SnapshotRequest;
  head(path: string): SnapshotRequest;
  options(path: string): SnapshotRequest;
}

/**
 * Snapshot request chain.
 */
export interface SnapshotRequest {
  // Request configuration methods
  set(headers: Record<string, string>): SnapshotRequest;
  set(key: string, value: string): SnapshotRequest;
  send(body: unknown): SnapshotRequest;
  query(params: Record<string, string | number | boolean>): SnapshotRequest;
  auth(token: string, type?: "Bearer" | "Basic"): SnapshotRequest;
  attach(field: string, filePath: string): SnapshotRequest;
  type(contentType: string): SnapshotRequest;
  accept(contentType: string): SnapshotRequest;
  timeout(ms: number): SnapshotRequest;

  // Assertion methods
  expectStatus(status: number): SnapshotRequest;
  expectHeaders(headers: Record<string, string | RegExp>): SnapshotRequest;
  expectHeader(key: string, value: string | RegExp): SnapshotRequest;
  expectTime(options: TimeAssertion): SnapshotRequest;
  expectContentType(type: string | RegExp): SnapshotRequest;
  expectBodyPath(path: string, expected: unknown): SnapshotRequest;
  expect<T>(assertion: (response: FluentResponse<T>) => void): SnapshotRequest;

  // Execute
  execute<T = unknown>(): Promise<FluentResponse<T>>;

  // Snapshot-specific methods
  /**
   * Assert response matches snapshot.
   */
  expectSnapshot(options?: SnapshotOptions): Promise<void>;

  /**
   * Create or update snapshot.
   */
  updateSnapshot(options?: Omit<SnapshotOptions, "update">): Promise<void>;

  /**
   * Get current snapshot for comparison.
   */
  getSnapshot(options?: SnapshotOptions): Promise<unknown>;
}

// ============================================================================
// Load Testing Interfaces
// ============================================================================

/**
 * Options for load testing.
 *
 * @example
 * ```typescript
 * const results = await loadTest(app, {
 *   endpoint: "/users",
 *   method: "GET",
 *   concurrent: 1000,
 *   duration: "10s",
 *   rampUp: "2s"
 * });
 * ```
 */
export interface LoadTestOptions {
  /**
   * Endpoint to test.
   */
  endpoint: string;

  /**
   * HTTP method.
   * @default "GET"
   */
  method?: HttpMethod;

  /**
   * Number of concurrent requests.
   */
  concurrent: number;

  /**
   * Test duration (e.g., "10s", "1m", "30s").
   */
  duration: string;

  /**
   * Ramp-up time to reach full concurrency.
   * @default "0s" (instant)
   */
  rampUp?: string;

  /**
   * Request body (for POST, PUT, PATCH).
   */
  body?: unknown;

  /**
   * Request headers.
   */
  headers?: Record<string, string>;

  /**
   * Timeout per request in milliseconds.
   * @default 30000
   */
  timeout?: number;

  /**
   * Real-time assertions during load test.
   */
  assertions?: LoadTestAssertions;

  /**
   * Callback for progress updates.
   */
  onProgress?: (progress: LoadTestProgress) => void;

  /**
   * Number of warmup requests before starting the test.
   * @default 10
   */
  warmupRequests?: number;
}

/**
 * Assertions to apply during load test.
 */
export interface LoadTestAssertions {
  /**
   * Maximum error rate (0-1, e.g., 0.01 = 1%).
   */
  maxErrorRate?: number;

  /**
   * Minimum throughput (requests/second).
   */
  minThroughput?: number;

  /**
   * Maximum p95 response time (ms).
   */
  maxP95?: number;

  /**
   * Maximum p99 response time (ms).
   */
  maxP99?: number;

  /**
   * Maximum average response time (ms).
   */
  maxAverage?: number;
}

/**
 * Progress update during load test.
 */
export interface LoadTestProgress {
  /**
   * Completed requests.
   */
  completed: number;

  /**
   * Failed requests.
   */
  failed: number;

  /**
   * Current requests per second.
   */
  rps: number;

  /**
   * Elapsed time in seconds.
   */
  elapsed: number;

  /**
   * Current p95 response time.
   */
  p95: number;
}

/**
 * Load test results.
 */
export interface LoadTestResults {
  /**
   * Total requests made.
   */
  totalRequests: number;

  /**
   * Successful requests (2xx status).
   */
  successfulRequests: number;

  /**
   * Failed requests (errors or non-2xx status).
   */
  failedRequests: number;

  /**
   * Error count.
   */
  errors: number;

  /**
   * Error rate (0-1).
   */
  errorRate: number;

  /**
   * Average response time (ms).
   */
  averageResponseTime: number;

  /**
   * Minimum response time (ms).
   */
  minResponseTime: number;

  /**
   * Maximum response time (ms).
   */
  maxResponseTime: number;

  /**
   * Median response time (ms).
   */
  medianResponseTime: number;

  /**
   * 95th percentile response time (ms).
   */
  p95ResponseTime: number;

  /**
   * 99th percentile response time (ms).
   */
  p99ResponseTime: number;

  /**
   * Throughput (requests per second).
   */
  throughput: number;

  /**
   * Test duration (ms).
   */
  duration: number;

  /**
   * Response time distribution.
   */
  distribution: ResponseTimeDistribution;

  /**
   * Status code distribution.
   */
  statusCodes: Record<number, number>;

  /**
   * Whether all assertions passed.
   */
  assertionsPassed: boolean;

  /**
   * Failed assertions with details.
   */
  failedAssertions: Array<{
    assertion: string;
    expected: unknown;
    actual: unknown;
  }>;
}

/**
 * Response time distribution buckets.
 */
export interface ResponseTimeDistribution {
  /**
   * Requests < 10ms
   */
  under10ms: number;

  /**
   * Requests 10-50ms
   */
  under50ms: number;

  /**
   * Requests 50-100ms
   */
  under100ms: number;

  /**
   * Requests 100-500ms
   */
  under500ms: number;

  /**
   * Requests 500ms-1s
   */
  under1s: number;

  /**
   * Requests > 1s
   */
  over1s: number;
}

// ============================================================================
// Database Testing Interfaces
// ============================================================================

/**
 * Options for creating a test database.
 *
 * @example
 * ```typescript
 * const db = createTestDatabase({
 *   type: "in-memory",
 *   fixtures: [userFixtures, postFixtures]
 * });
 * ```
 */
export interface CreateTestDatabaseOptions {
  /**
   * Database type.
   * @default "in-memory"
   */
  type?: "in-memory" | "sqlite" | "postgres" | "mysql";

  /**
   * Connection string (for postgres/mysql).
   */
  connectionString?: string;

  /**
   * Fixtures to load.
   */
  fixtures?: Array<DatabaseFixture>;

  /**
   * Auto-migrate schema.
   * @default true
   */
  autoMigrate?: boolean;

  /**
   * Clean database between tests.
   * @default true
   */
  cleanBetweenTests?: boolean;
}

/**
 * Database fixture definition.
 */
export interface DatabaseFixture<T = unknown> {
  /**
   * Table/collection name.
   */
  table: string;

  /**
   * Data to insert.
   */
  data: Array<T>;

  /**
   * Factory function to generate data.
   */
  factory?: (count: number) => Array<T>;
}

/**
 * Test database interface.
 */
export interface ITestDatabase {
  /**
   * Reset database to initial state (with fixtures).
   */
  reset(): Promise<void>;

  /**
   * Clear all data.
   */
  clear(): Promise<void>;

  /**
   * Execute raw query.
   */
  query<T>(sql: string, params?: Array<unknown>): Promise<Array<T>>;

  /**
   * Insert data into a table.
   */
  insert<T>(table: string, data: T): Promise<T>;

  /**
   * Find records.
   */
  find<T>(table: string, where?: Record<string, unknown>): Promise<Array<T>>;

  /**
   * Find one record.
   */
  findOne<T>(table: string, where: Record<string, unknown>): Promise<T | null>;

  /**
   * Update records.
   */
  update<T>(
    table: string,
    where: Record<string, unknown>,
    data: Partial<T>,
  ): Promise<number>;

  /**
   * Delete records.
   */
  delete(table: string, where: Record<string, unknown>): Promise<number>;

  /**
   * Get all tables.
   */
  getTables(): Promise<Array<string>>;

  /**
   * Count records.
   */
  count(table: string, where?: Record<string, unknown>): Promise<number>;

  /**
   * Close database connection.
   */
  close(): Promise<void>;
}

// ============================================================================
// Mock Context Interfaces
// ============================================================================

/**
 * Options for mocking request context.
 *
 * @example
 * ```typescript
 * const context = mockContext({
 *   user: { id: 123, role: "admin" },
 *   headers: { "x-api-key": "test-key" },
 *   params: { id: "456" }
 * });
 * ```
 */
export interface MockContextOptions {
  /**
   * Mock user object.
   */
  user?: Record<string, unknown>;

  /**
   * Mock request headers.
   */
  headers?: Record<string, string>;

  /**
   * Mock URL parameters.
   */
  params?: Record<string, string>;

  /**
   * Mock query parameters.
   */
  query?: Record<string, string | Array<string>>;

  /**
   * Mock request body.
   */
  body?: unknown;

  /**
   * Mock cookies.
   */
  cookies?: Record<string, string>;

  /**
   * Mock session.
   */
  session?: Record<string, unknown>;

  /**
   * Request method.
   * @default "GET"
   */
  method?: HttpMethod;

  /**
   * Request path.
   * @default "/"
   */
  path?: string;

  /**
   * Request URL.
   */
  url?: string;

  /**
   * Request IP.
   * @default "127.0.0.1"
   */
  ip?: string;

  /**
   * Custom request properties.
   */
  request?: Partial<Request>;

  /**
   * Custom response properties.
   */
  response?: Partial<Response>;
}

/**
 * Mock context result.
 */
export interface MockContext {
  /**
   * The mocked request object.
   */
  request: Request;

  /**
   * The mocked response object.
   */
  response: Response;

  /**
   * The next function mock.
   */
  next: MockFunction;

  /**
   * Shorthand access to user.
   */
  user: Record<string, unknown> | undefined;

  /**
   * Reset the context to initial state.
   */
  reset(): void;

  /**
   * Update context with new values.
   */
  update(options: Partial<MockContextOptions>): void;
}

// ============================================================================
// Test Lifecycle Interfaces
// ============================================================================

/**
 * Test lifecycle hooks.
 */
export interface TestLifecycleHooks {
  /**
   * Run before all tests in a suite.
   */
  beforeAll?: () => Promise<void> | void;

  /**
   * Run after all tests in a suite.
   */
  afterAll?: () => Promise<void> | void;

  /**
   * Run before each test.
   */
  beforeEach?: () => Promise<void> | void;

  /**
   * Run after each test.
   */
  afterEach?: () => Promise<void> | void;
}

/**
 * Setup function for test lifecycle.
 */
export type SetupTestLifecycle = (hooks: TestLifecycleHooks) => void;
