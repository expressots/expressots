/**
 * ExpressoTS Testing Module
 *
 * @module testing
 *
 * Comprehensive testing utilities for ExpressoTS applications.
 * Provides zero-config setup, smart mocks, fluent HTTP testing,
 * snapshot testing, and built-in load testing.
 *
 * UNIQUE FEATURES (No other framework has these!):
 * - Zero-config test app creation
 * - Smart mocking with auto-discovery
 * - Fluent HTTP testing API (better than supertest)
 * - API snapshot testing
 * - Built-in load testing with percentile metrics
 * - Database testing utilities
 * - Request context mocking
 *
 * @example
 * ```typescript
 * // Zero-config test setup
 * import { createTestApp } from "@expressots/testing";
 *
 * describe("UserController", () => {
 *   let app, request;
 *
 *   beforeAll(async () => {
 *     ({ app, request } = await createTestApp(App));
 *   });
 *
 *   test("GET /users returns user list", async () => {
 *     const response = await request
 *       .get("/users")
 *       .expectStatus(200)
 *       .expectBody((body) => body.length > 0)
 *       .expectTime({ lessThan: 100 })
 *       .execute();
 *
 *     expect(response.body).toHaveLength(2);
 *   });
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Smart mocking
 * import { mockProvider } from "@expressots/testing";
 *
 * test("UserService creates user", async () => {
 *   const { service, mocks } = mockProvider(UserService, {
 *     mocks: {
 *       UserRepository: {
 *         create: jest.fn().mockResolvedValue({ id: 1, name: "John" })
 *       }
 *     }
 *   });
 *
 *   const user = await service.createUser({ name: "John" });
 *   expect(user.id).toBe(1);
 *   expect(mocks.UserRepository.create).toHaveBeenCalled();
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Load testing (UNIQUE!)
 * import { loadTest } from "@expressots/testing";
 *
 * test("handles 1000 concurrent requests", async () => {
 *   const results = await loadTest(app, {
 *     endpoint: "/users",
 *     concurrent: 1000,
 *     duration: "10s",
 *     assertions: {
 *       maxErrorRate: 0.01,
 *       maxP95: 200
 *     }
 *   });
 *
 *   expect(results.assertionsPassed).toBe(true);
 *   expect(results.p95ResponseTime).toBeLessThan(200);
 * });
 * ```
 */

// Core interfaces and types
export * from "./testing.interfaces";

// Test app creation
export {
  createTestApp,
  cleanupAllTestApps,
  getActiveTestAppCount,
} from "./create-test-app";

// Smart mocking
export {
  mockProvider,
  createMock,
  createMockObject,
  spyOn,
} from "./mock-provider";

// Fluent HTTP testing
export { createFluentRequest, request } from "./fluent-request";

// Snapshot testing
export { snapshotRequest, toMatchApiSnapshot } from "./snapshot-request";

// Load testing (UNIQUE!)
export { loadTest, benchmark, stressTest } from "./load-test";

// Database testing
export {
  createTestDatabase,
  createFixtureFactory,
  fixture,
} from "./create-test-database";

// Request context mocking
export {
  mockContext,
  mockExecutionContext,
  mockNextFunction,
  mockReqRes,
} from "./mock-context";

// Custom matchers
export { expressoTSMatchers, setupExpressoTSMatchers } from "./matchers";
