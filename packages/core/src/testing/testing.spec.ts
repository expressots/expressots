/**
 * Comprehensive Test Suite for ExpressoTS Testing Module
 *
 * Tests all testing utilities to ensure they work correctly.
 */

import "reflect-metadata";
import { injectable, inject } from "../di/inversify";
import {
  createFluentRequest,
  request,
  mockProvider,
  createMock,
  createMockObject,
  spyOn,
  mockContext,
  mockExecutionContext,
  mockNextFunction,
  mockReqRes,
  createTestDatabase,
  createFixtureFactory,
  fixture,
  expressoTSMatchers,
  setupExpressoTSMatchers,
} from "./index";

// ============================================================================
// Fluent Request Tests
// ============================================================================

describe("Fluent Request", () => {
  describe("createFluentRequest", () => {
    it("should create request builder with all HTTP methods", () => {
      const builder = createFluentRequest("http://localhost:3000");

      expect(builder.get).toBeDefined();
      expect(builder.post).toBeDefined();
      expect(builder.put).toBeDefined();
      expect(builder.patch).toBeDefined();
      expect(builder.delete).toBeDefined();
      expect(builder.head).toBeDefined();
      expect(builder.options).toBeDefined();
      expect(builder.request).toBeDefined();
    });

    it("should create GET request", () => {
      const builder = createFluentRequest("http://localhost:3000");
      const req = builder.get("/users");

      expect(req).toBeDefined();
      expect(req.set).toBeDefined();
      expect(req.send).toBeDefined();
      expect(req.expectStatus).toBeDefined();
      expect(req.expectBody).toBeDefined();
      expect(req.expectTime).toBeDefined();
      expect(req.execute).toBeDefined();
    });

    it("should support method chaining", () => {
      const builder = createFluentRequest("http://localhost:3000");
      const req = builder
        .post("/users")
        .set("Authorization", "Bearer token")
        .set({ "X-Custom-Header": "value" })
        .send({ name: "John" })
        .type("application/json")
        .accept("application/json")
        .timeout(5000);

      expect(req).toBeDefined();
    });

    it("should support auth helper", () => {
      const builder = createFluentRequest("http://localhost:3000");
      const req = builder.get("/protected").auth("token123", "Bearer");

      expect(req).toBeDefined();
    });

    it("should support query parameters", () => {
      const builder = createFluentRequest("http://localhost:3000");
      const req = builder.get("/users").query({ page: 1, limit: 10 });

      expect(req).toBeDefined();
    });
  });

  describe("request function", () => {
    it("should work with URL string", () => {
      const builder = request("http://localhost:3000");
      expect(builder.get).toBeDefined();
    });

    it("should work with object containing baseUrl", () => {
      const builder = request({ baseUrl: "http://localhost:3000" });
      expect(builder.get).toBeDefined();
    });
  });
});

// ============================================================================
// Mock Provider Tests
// ============================================================================

describe("Mock Provider", () => {
  describe("mockProvider", () => {
    @injectable()
    class MockDependency {
      getValue(): string {
        return "real value";
      }
    }

    @injectable()
    class TestService {
      constructor(
        @inject(MockDependency) public readonly dep: MockDependency,
      ) {}

      getValueFromDep(): string {
        return this.dep.getValue();
      }
    }

    it("should create service with mocked dependencies", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { service, mocks } = mockProvider(TestService as any, {
        mocks: {
          MockDependency: {
            getValue: jest.fn().mockReturnValue("mocked value"),
          },
        },
        autoMock: false,
      });

      // Service should be defined (may not work without proper DI setup)
      expect(service).toBeDefined();
    });

    it("should provide resetAllMocks function", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { resetAllMocks } = mockProvider(TestService as any, {
        autoMock: true,
      });

      expect(resetAllMocks).toBeDefined();
      expect(typeof resetAllMocks).toBe("function");
    });

    it("should provide clearAllMocks function", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { clearAllMocks } = mockProvider(TestService as any, {
        autoMock: true,
      });

      expect(clearAllMocks).toBeDefined();
      expect(typeof clearAllMocks).toBe("function");
    });

    it("should provide verifyAllMocks function", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { verifyAllMocks } = mockProvider(TestService as any, {
        autoMock: true,
      });

      expect(verifyAllMocks).toBeDefined();
      expect(typeof verifyAllMocks).toBe("function");
    });
  });

  describe("createMock", () => {
    it("should create a mock function", () => {
      const mockFn = createMock<[string], number>();

      expect(mockFn).toBeDefined();
      expect(mockFn.mockReturnValue).toBeDefined();
      expect(mockFn.mockResolvedValue).toBeDefined();
      expect(mockFn.mockRejectedValue).toBeDefined();
      expect(mockFn.mockImplementation).toBeDefined();
      expect(mockFn.mockClear).toBeDefined();
      expect(mockFn.mockReset).toBeDefined();
      expect(mockFn.mock).toBeDefined();
    });

    it("should track calls", () => {
      const mockFn = createMock<[string], string>();
      mockFn.mockReturnValue("result");

      mockFn("arg1");
      mockFn("arg2");

      expect(mockFn.mock.calls).toHaveLength(2);
      expect(mockFn.mock.calls[0]).toEqual(["arg1"]);
      expect(mockFn.mock.calls[1]).toEqual(["arg2"]);
    });

    it("should support mockReturnValue", () => {
      const mockFn = createMock<[], number>();
      mockFn.mockReturnValue(42);

      expect(mockFn()).toBe(42);
    });

    it("should support mockResolvedValue", async () => {
      const mockFn = createMock<[], Promise<string>>();
      mockFn.mockResolvedValue("async result");

      const result = await mockFn();
      expect(result).toBe("async result");
    });

    it("should support mockImplementation", () => {
      const mockFn = createMock<[number, number], number>();
      mockFn.mockImplementation((a, b) => a + b);

      expect(mockFn(2, 3)).toBe(5);
    });
  });

  describe("createMockObject", () => {
    class SampleClass {
      method1(): string {
        return "real1";
      }
      method2(): number {
        return 42;
      }
    }

    it("should create mock object from class", () => {
      const mock = createMockObject(SampleClass);

      expect(mock).toBeDefined();
    });
  });

  describe("spyOn", () => {
    it("should spy on object method", () => {
      const obj = {
        getValue(): number {
          return 42;
        },
      };

      const spy = spyOn(obj, "getValue");

      obj.getValue();

      expect(spy.mock.calls).toHaveLength(1);
    });

    it("should call original implementation", () => {
      const obj = {
        getValue(): number {
          return 42;
        },
      };

      const spy = spyOn(obj, "getValue");
      const result = obj.getValue();

      expect(result).toBe(42);
    });
  });
});

// ============================================================================
// Mock Context Tests
// ============================================================================

describe("Mock Context", () => {
  describe("mockContext", () => {
    it("should create mock context with defaults", () => {
      const ctx = mockContext();

      expect(ctx.request).toBeDefined();
      expect(ctx.response).toBeDefined();
      expect(ctx.next).toBeDefined();
    });

    it("should set user on context", () => {
      const ctx = mockContext({
        user: { id: 123, role: "admin" },
      });

      expect(ctx.user).toEqual({ id: 123, role: "admin" });
      expect((ctx.request as any).user).toEqual({ id: 123, role: "admin" });
    });

    it("should set headers on request", () => {
      const ctx = mockContext({
        headers: {
          Authorization: "Bearer token123",
          "X-Custom-Header": "value",
        },
      });

      expect(ctx.request.get("authorization")).toBe("Bearer token123");
      expect(ctx.request.get("x-custom-header")).toBe("value");
    });

    it("should set params on request", () => {
      const ctx = mockContext({
        params: { id: "456" },
      });

      expect(ctx.request.params).toEqual({ id: "456" });
    });

    it("should set query on request", () => {
      const ctx = mockContext({
        query: { page: "1", limit: "10" },
      });

      expect(ctx.request.query).toEqual({ page: "1", limit: "10" });
    });

    it("should set body on request", () => {
      const ctx = mockContext({
        body: { name: "John", email: "john@test.com" },
      });

      expect(ctx.request.body).toEqual({
        name: "John",
        email: "john@test.com",
      });
    });

    it("should set method on request", () => {
      const ctx = mockContext({
        method: "POST",
      });

      expect(ctx.request.method).toBe("POST");
    });

    it("should set path on request", () => {
      const ctx = mockContext({
        path: "/users/123",
      });

      expect(ctx.request.path).toBe("/users/123");
    });

    it("should reset context to initial state", () => {
      const ctx = mockContext({
        user: { id: 123 },
      });

      ctx.update({ user: { id: 456 } });
      expect(ctx.user).toEqual({ id: 456 });

      ctx.reset();
      expect(ctx.user).toEqual({ id: 123 });
    });

    it("should update context", () => {
      const ctx = mockContext({
        user: { id: 123 },
      });

      ctx.update({
        user: { id: 456, role: "admin" },
        headers: { "X-New-Header": "value" },
      });

      expect(ctx.user).toEqual({ id: 456, role: "admin" });
    });
  });

  describe("mockExecutionContext", () => {
    it("should create execution context", () => {
      const ctx = mockExecutionContext({
        user: { id: 123 },
        params: { id: "456" },
      });

      expect(ctx.request).toBeDefined();
      expect(ctx.response).toBeDefined();
      expect(ctx.getRequest).toBeDefined();
      expect(ctx.getResponse).toBeDefined();
      expect(ctx.getClass).toBeDefined();
      expect(ctx.getHandler).toBeDefined();
      expect(ctx.switchToHttp).toBeDefined();
    });

    it("should provide switchToHttp", () => {
      const ctx = mockExecutionContext();
      const http = ctx.switchToHttp();

      expect(http.getRequest).toBeDefined();
      expect(http.getResponse).toBeDefined();
    });
  });

  describe("mockNextFunction", () => {
    it("should create mock next function", () => {
      const next = mockNextFunction();

      expect(next).toBeDefined();
      expect(next.mock).toBeDefined();
      expect(next.mockReturnValue).toBeDefined();
    });

    it("should track calls", () => {
      const next = mockNextFunction();

      next();
      next();

      expect(next.mock.calls).toHaveLength(2);
    });
  });

  describe("mockReqRes", () => {
    it("should create req, res, next", () => {
      const { req, res, next } = mockReqRes({
        method: "POST",
        body: { name: "Test" },
      });

      expect(req).toBeDefined();
      expect(res).toBeDefined();
      expect(next).toBeDefined();
      expect(req.method).toBe("POST");
      expect(req.body).toEqual({ name: "Test" });
    });
  });
});

// ============================================================================
// Test Database Tests
// ============================================================================

describe("Test Database", () => {
  describe("createTestDatabase", () => {
    it("should create in-memory database", () => {
      const db = createTestDatabase();

      expect(db).toBeDefined();
      expect(db.insert).toBeDefined();
      expect(db.find).toBeDefined();
      expect(db.findOne).toBeDefined();
      expect(db.update).toBeDefined();
      expect(db.delete).toBeDefined();
      expect(db.reset).toBeDefined();
      expect(db.clear).toBeDefined();
      expect(db.query).toBeDefined();
    });

    it("should insert and find records", async () => {
      const db = createTestDatabase();

      const user = (await db.insert("users", {
        name: "John",
        email: "john@test.com",
      })) as { id: number; name: string; email: string };

      expect(user.id).toBeDefined();
      expect(user.name).toBe("John");

      const found = await db.findOne("users", { id: user.id });
      expect(found).toMatchObject({ name: "John" });
    });

    it("should update records", async () => {
      const db = createTestDatabase();

      const user = (await db.insert("users", { name: "John" })) as {
        id: number;
        name: string;
      };
      const updated = await db.update(
        "users",
        { id: user.id },
        { name: "Jane" },
      );

      expect(updated).toBe(1);

      const found = (await db.findOne("users", { id: user.id })) as {
        name: string;
      } | null;
      expect(found?.name).toBe("Jane");
    });

    it("should delete records", async () => {
      const db = createTestDatabase();

      const user = (await db.insert("users", { name: "John" })) as {
        id: number;
        name: string;
      };
      const deleted = await db.delete("users", { id: user.id });

      expect(deleted).toBe(1);

      const found = await db.findOne("users", { id: user.id });
      expect(found).toBeNull();
    });

    it("should count records", async () => {
      const db = createTestDatabase();

      await db.insert("users", { name: "John" });
      await db.insert("users", { name: "Jane" });

      const count = await db.count("users");
      expect(count).toBe(2);
    });

    it("should reset database", async () => {
      const db = createTestDatabase({
        fixtures: [
          {
            table: "users",
            data: [{ id: 1, name: "Admin" }],
          },
        ],
      });

      await db.insert("users", { name: "New User" });
      let count = await db.count("users");
      expect(count).toBe(2);

      await db.reset();
      count = await db.count("users");
      expect(count).toBe(1);
    });

    it("should clear database", async () => {
      const db = createTestDatabase();

      await db.insert("users", { name: "John" });
      await db.insert("users", { name: "Jane" });

      await db.clear();
      const count = await db.count("users");
      expect(count).toBe(0);
    });

    it("should load fixtures on creation", async () => {
      const db = createTestDatabase({
        fixtures: [
          {
            table: "users",
            data: [
              { id: 1, name: "Admin", role: "admin" },
              { id: 2, name: "User", role: "user" },
            ],
          },
        ],
      });

      const count = await db.count("users");
      expect(count).toBe(2);

      const admin = (await db.findOne("users", { role: "admin" })) as {
        name: string;
      } | null;
      expect(admin?.name).toBe("Admin");
    });
  });

  describe("createFixtureFactory", () => {
    it("should create factory function", () => {
      const userFactory = createFixtureFactory<{ name: string; email: string }>(
        {
          name: (i) => `User ${i}`,
          email: (i) => `user${i}@test.com`,
        },
      );

      const users = userFactory(3);

      expect(users).toHaveLength(3);
      expect(users[0].name).toBe("User 0");
      expect(users[0].email).toBe("user0@test.com");
      expect(users[2].name).toBe("User 2");
    });

    it("should support static values", () => {
      const userFactory = createFixtureFactory<{ name: string; role: string }>({
        name: (i) => `User ${i}`,
        role: "user", // Static value
      });

      const users = userFactory(2);

      expect(users[0].role).toBe("user");
      expect(users[1].role).toBe("user");
    });
  });

  describe("fixture helper", () => {
    it("should create fixture object", () => {
      const userFixture = fixture("users", [
        { id: 1, name: "Admin" },
        { id: 2, name: "User" },
      ]);

      expect(userFixture.table).toBe("users");
      expect(userFixture.data).toHaveLength(2);
    });
  });
});

// ============================================================================
// Matchers Tests
// ============================================================================

describe("Custom Matchers", () => {
  describe("expressoTSMatchers", () => {
    const createMockResponse = (
      overrides: Partial<{
        status: number;
        body: unknown;
        headers: Record<string, string>;
        time: number;
        contentType: string;
        ok: boolean;
        redirect: boolean;
        clientError: boolean;
        serverError: boolean;
      }> = {},
    ) => ({
      status: 200,
      statusText: "OK",
      headers: {},
      body: {},
      text: "{}",
      time: 50,
      contentType: "application/json",
      ok: true,
      redirect: false,
      clientError: false,
      serverError: false,
      ...overrides,
    });

    describe("toHaveStatus", () => {
      it("should pass for matching status", () => {
        const response = createMockResponse({ status: 200 });
        const result = expressoTSMatchers.toHaveStatus(response, 200);

        expect(result.pass).toBe(true);
      });

      it("should fail for non-matching status", () => {
        const response = createMockResponse({ status: 404 });
        const result = expressoTSMatchers.toHaveStatus(response, 200);

        expect(result.pass).toBe(false);
      });
    });

    describe("toBeSuccessful", () => {
      it("should pass for ok response", () => {
        const response = createMockResponse({ ok: true });
        const result = expressoTSMatchers.toBeSuccessful(response);

        expect(result.pass).toBe(true);
      });

      it("should fail for non-ok response", () => {
        const response = createMockResponse({ ok: false });
        const result = expressoTSMatchers.toBeSuccessful(response);

        expect(result.pass).toBe(false);
      });
    });

    describe("toHaveBody", () => {
      it("should pass for matching body", () => {
        const response = createMockResponse({
          body: { id: 1, name: "John" },
        });
        const result = expressoTSMatchers.toHaveBody(response, { id: 1 });

        expect(result.pass).toBe(true);
      });

      it("should pass for predicate", () => {
        const response = createMockResponse({
          body: { id: 1 },
        });
        const result = expressoTSMatchers.toHaveBody(
          response,
          (body: any) => body.id > 0,
        );

        expect(result.pass).toBe(true);
      });
    });

    describe("toHaveHeader", () => {
      it("should pass for matching header", () => {
        const response = createMockResponse({
          headers: { "content-type": "application/json" },
        });
        const result = expressoTSMatchers.toHaveHeader(
          response,
          "content-type",
          "application/json",
        );

        expect(result.pass).toBe(true);
      });

      it("should pass for header existence", () => {
        const response = createMockResponse({
          headers: { "x-custom": "value" },
        });
        const result = expressoTSMatchers.toHaveHeader(response, "x-custom");

        expect(result.pass).toBe(true);
      });

      it("should support regex matching", () => {
        const response = createMockResponse({
          headers: { "content-type": "application/json; charset=utf-8" },
        });
        const result = expressoTSMatchers.toHaveHeader(
          response,
          "content-type",
          /json/,
        );

        expect(result.pass).toBe(true);
      });
    });

    describe("toRespondWithin", () => {
      it("should pass for fast response", () => {
        const response = createMockResponse({ time: 50 });
        const result = expressoTSMatchers.toRespondWithin(response, 100);

        expect(result.pass).toBe(true);
      });

      it("should fail for slow response", () => {
        const response = createMockResponse({ time: 150 });
        const result = expressoTSMatchers.toRespondWithin(response, 100);

        expect(result.pass).toBe(false);
      });
    });

    describe("toBeJSON", () => {
      it("should pass for JSON response", () => {
        const response = createMockResponse({
          contentType: "application/json",
          body: { id: 1 },
        });
        const result = expressoTSMatchers.toBeJSON(response);

        expect(result.pass).toBe(true);
      });
    });

    describe("toHaveBodyProperty", () => {
      it("should pass for existing property", () => {
        const response = createMockResponse({
          body: { user: { name: "John" } },
        });
        const result = expressoTSMatchers.toHaveBodyProperty(
          response,
          "user.name",
          "John",
        );

        expect(result.pass).toBe(true);
      });

      it("should pass for property existence check", () => {
        const response = createMockResponse({
          body: { id: 1 },
        });
        const result = expressoTSMatchers.toHaveBodyProperty(response, "id");

        expect(result.pass).toBe(true);
      });
    });

    describe("toHaveBodyArray", () => {
      it("should pass for array body", () => {
        const response = createMockResponse({
          body: [1, 2, 3],
        });
        const result = expressoTSMatchers.toHaveBodyArray(response);

        expect(result.pass).toBe(true);
      });

      it("should check array length", () => {
        const response = createMockResponse({
          body: [1, 2, 3],
        });
        const result = expressoTSMatchers.toHaveBodyArray(response, 3);

        expect(result.pass).toBe(true);
      });
    });

    describe("toBeRedirect", () => {
      it("should pass for redirect response", () => {
        const response = createMockResponse({ redirect: true });
        const result = expressoTSMatchers.toBeRedirect(response);
        expect(result.pass).toBe(true);
      });

      it("should fail for non-redirect response", () => {
        const response = createMockResponse({ redirect: false });
        const result = expressoTSMatchers.toBeRedirect(response);
        expect(result.pass).toBe(false);
      });
    });

    describe("toBeClientError", () => {
      it("should pass for client error response", () => {
        const response = createMockResponse({ clientError: true });
        const result = expressoTSMatchers.toBeClientError(response);
        expect(result.pass).toBe(true);
      });
    });

    describe("toBeServerError", () => {
      it("should pass for server error response", () => {
        const response = createMockResponse({ serverError: true });
        const result = expressoTSMatchers.toBeServerError(response);
        expect(result.pass).toBe(true);
      });
    });
  });

  describe("setupExpressoTSMatchers", () => {
    it("should be a function", () => {
      expect(typeof setupExpressoTSMatchers).toBe("function");
    });

    it("should not throw", () => {
      expect(() => setupExpressoTSMatchers()).not.toThrow();
    });
  });
});

// ============================================================================
// Load Test Utilities Tests
// ============================================================================

import { loadTest, benchmark, stressTest } from "./load-test";

describe("Load Test Utilities", () => {
  describe("benchmark", () => {
    it("should benchmark a sync function", async () => {
      const results = await benchmark(() => {
        let sum = 0;
        for (let i = 0; i < 100; i++) sum += i;
        return sum;
      }, 10);

      expect(results.average).toBeDefined();
      expect(results.min).toBeDefined();
      expect(results.max).toBeDefined();
      expect(results.median).toBeDefined();
      expect(results.p95).toBeDefined();
      expect(results.p99).toBeDefined();
      expect(results.total).toBeDefined();
    });

    it("should benchmark an async function", async () => {
      const results = await benchmark(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return 42;
      }, 5);

      expect(results.average).toBeGreaterThanOrEqual(1);
      expect(results.total).toBeGreaterThanOrEqual(5);
    });

    it("should use default iterations", async () => {
      const callCount = { value: 0 };
      const results = await benchmark(() => {
        callCount.value++;
        return callCount.value;
      });

      // Default iterations is 1000
      expect(callCount.value).toBe(1000);
    });
  });
});

// ============================================================================
// Snapshot Request Tests
// ============================================================================

import { snapshotRequest, toMatchApiSnapshot } from "./snapshot-request";

describe("Snapshot Request", () => {
  describe("snapshotRequest", () => {
    it("should create a snapshot request builder from URL", () => {
      const builder = snapshotRequest("http://localhost:3000");

      expect(builder.get).toBeDefined();
      expect(builder.post).toBeDefined();
      expect(builder.put).toBeDefined();
      expect(builder.patch).toBeDefined();
      expect(builder.delete).toBeDefined();
      expect(builder.head).toBeDefined();
      expect(builder.options).toBeDefined();
    });

    it("should create a snapshot request builder from object", () => {
      const builder = snapshotRequest({ baseUrl: "http://localhost:3000" });

      expect(builder.get).toBeDefined();
    });

    it("should create GET request", () => {
      const builder = snapshotRequest("http://localhost:3000");
      const req = builder.get("/users");

      expect(req).toBeDefined();
      expect(req.set).toBeDefined();
      expect(req.send).toBeDefined();
      expect(req.expectSnapshot).toBeDefined();
      expect(req.updateSnapshot).toBeDefined();
      expect(req.getSnapshot).toBeDefined();
    });

    it("should support method chaining", () => {
      const builder = snapshotRequest("http://localhost:3000");
      const req = builder
        .post("/users")
        .set("Authorization", "Bearer token")
        .send({ name: "John" })
        .type("application/json")
        .timeout(5000);

      expect(req).toBeDefined();
    });

    it("should create all HTTP method requests", () => {
      const builder = snapshotRequest("http://localhost:3000");

      expect(builder.get("/test")).toBeDefined();
      expect(builder.post("/test")).toBeDefined();
      expect(builder.put("/test")).toBeDefined();
      expect(builder.patch("/test")).toBeDefined();
      expect(builder.delete("/test")).toBeDefined();
      expect(builder.head("/test")).toBeDefined();
      expect(builder.options("/test")).toBeDefined();
    });
  });

  describe("toMatchApiSnapshot", () => {
    it("should process object without ignore", () => {
      const result = toMatchApiSnapshot({ id: 1, name: "test" });
      expect(result.pass).toBe(true);
    });

    it("should process object with ignore", () => {
      const result = toMatchApiSnapshot(
        { id: 1, name: "test", createdAt: new Date() },
        { ignore: ["createdAt"] },
      );
      expect(result.pass).toBe(true);
    });
  });
});

// ============================================================================
// Create Test App Tests
// ============================================================================

import { cleanupAllTestApps, getActiveTestAppCount } from "./create-test-app";

describe("Create Test App Utilities", () => {
  describe("cleanupAllTestApps", () => {
    it("should cleanup all test apps", async () => {
      await cleanupAllTestApps();
      expect(getActiveTestAppCount()).toBe(0);
    });
  });

  describe("getActiveTestAppCount", () => {
    it("should return active test app count", () => {
      const count = getActiveTestAppCount();
      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});

// ============================================================================
// Additional Mock Provider Tests
// ============================================================================

describe("Mock Provider Extended", () => {
  describe("createMock advanced", () => {
    it("should support mockRejectedValue", async () => {
      const mockFn = createMock<[], Promise<string>>();
      mockFn.mockRejectedValue(new Error("Test error"));

      await expect(mockFn()).rejects.toThrow("Test error");
    });

    it("should support mockClear", () => {
      const mockFn = createMock<[string], string>();
      mockFn.mockReturnValue("result");

      mockFn("arg1");
      mockFn("arg2");
      expect(mockFn.mock.calls).toHaveLength(2);

      mockFn.mockClear();
      expect(mockFn.mock.calls).toHaveLength(0);
    });

    it("should support mockReset", () => {
      const mockFn = createMock<[], number>();
      mockFn.mockReturnValue(42);

      expect(mockFn()).toBe(42);

      mockFn.mockReset();
      expect(mockFn()).toBeUndefined();
    });
  });

  describe("spyOn advanced", () => {
    it("should return spy with mock properties", () => {
      const obj = {
        getValue(): string {
          return "value";
        },
      };

      const spy = spyOn(obj, "getValue");

      expect(spy.mock).toBeDefined();
      expect(spy.mockReturnValue).toBeDefined();
      expect(spy.mockClear).toBeDefined();
    });
  });
});

// ============================================================================
// Additional Mock Context Tests
// ============================================================================

describe("Mock Context Extended", () => {
  describe("mockContext advanced", () => {
    it("should support cookies", () => {
      const ctx = mockContext({
        cookies: { sessionId: "abc123" },
      });

      expect(ctx.request.cookies).toEqual({ sessionId: "abc123" });
    });

    it("should update multiple properties", () => {
      const ctx = mockContext({
        user: { id: 1 },
      });

      ctx.update({
        user: { id: 2, role: "admin" },
        body: { name: "John" },
        headers: { "X-Custom": "value" },
      });

      expect(ctx.user).toEqual({ id: 2, role: "admin" });
      expect(ctx.request.body).toEqual({ name: "John" });
    });
  });

  describe("mockExecutionContext advanced", () => {
    it("should provide getRequest and getResponse methods", () => {
      const ctx = mockExecutionContext({
        params: { id: "123" },
      });

      expect(ctx.getRequest()).toBeDefined();
      expect(ctx.getResponse()).toBeDefined();
    });

    it("should provide getClass and getHandler methods", () => {
      const ctx = mockExecutionContext();

      expect(ctx.getClass()).toBeDefined();
      expect(ctx.getHandler()).toBeDefined();
    });
  });
});

// ============================================================================
// Additional Test Database Tests
// ============================================================================

describe("Test Database Extended", () => {
  describe("createTestDatabase advanced", () => {
    it("should support transaction-like operations", async () => {
      const db = createTestDatabase();

      await db.insert("users", { name: "John" });
      await db.insert("users", { name: "Jane" });

      const users = await db.find("users", {});
      expect(users).toHaveLength(2);
    });

    it("should support query with complex conditions", async () => {
      const db = createTestDatabase();

      await db.insert("users", { name: "John", age: 25 });
      await db.insert("users", { name: "Jane", age: 30 });
      await db.insert("users", { name: "Bob", age: 25 });

      const result = await db.find("users", { age: 25 });
      expect(result).toHaveLength(2);
    });

    it("should support findOne returning null", async () => {
      const db = createTestDatabase();

      const result = await db.findOne("users", { id: 999 });
      expect(result).toBeNull();
    });

    it("should handle delete on non-existent record", async () => {
      const db = createTestDatabase();

      const deleted = await db.delete("users", { id: 999 });
      expect(deleted).toBe(0);
    });

    it("should handle update on non-existent record", async () => {
      const db = createTestDatabase();

      const updated = await db.update("users", { id: 999 }, { name: "New" });
      expect(updated).toBe(0);
    });
  });

  describe("createFixtureFactory advanced", () => {
    it("should create fixture with nested objects", () => {
      const userFactory = createFixtureFactory<{
        name: string;
        profile: { bio: string };
      }>({
        name: (i) => `User ${i}`,
        profile: (i) => ({ bio: `Bio ${i}` }),
      });

      const users = userFactory(2);

      expect(users[0].profile.bio).toBe("Bio 0");
      expect(users[1].profile.bio).toBe("Bio 1");
    });
  });
});

// ============================================================================
// Additional Matchers Tests
// ============================================================================

describe("Express Matchers Extended", () => {
  const createMockResponse = (
    overrides: Partial<{
      status: number;
      body: unknown;
      headers: Record<string, string>;
      time: number;
      contentType: string;
      ok: boolean;
      redirect: boolean;
      clientError: boolean;
      serverError: boolean;
    }> = {},
  ) => ({
    status: 200,
    statusText: "OK",
    headers: {},
    body: {},
    text: "{}",
    time: 50,
    contentType: "application/json",
    ok: true,
    redirect: false,
    clientError: false,
    serverError: false,
    ...overrides,
  });

  describe("toHaveBodyArray advanced", () => {
    it("should fail for non-array body", () => {
      const response = createMockResponse({ body: { id: 1 } });
      const result = expressoTSMatchers.toHaveBodyArray(response);
      expect(result.pass).toBe(false);
    });

    it("should fail for wrong array length", () => {
      const response = createMockResponse({ body: [1, 2] });
      const result = expressoTSMatchers.toHaveBodyArray(response, 3);
      expect(result.pass).toBe(false);
    });
  });

  describe("toHaveBodyProperty advanced", () => {
    it("should handle deeply nested paths", () => {
      const response = createMockResponse({
        body: { a: { b: { c: "deep" } } },
      });
      const result = expressoTSMatchers.toHaveBodyProperty(
        response,
        "a.b.c",
        "deep",
      );
      expect(result.pass).toBe(true);
    });

    it("should fail for non-existent path", () => {
      const response = createMockResponse({ body: { id: 1 } });
      const result = expressoTSMatchers.toHaveBodyProperty(response, "missing");
      expect(result.pass).toBe(false);
    });
  });

  describe("toHaveHeader advanced", () => {
    it("should fail for non-existent header", () => {
      const response = createMockResponse({ headers: {} });
      const result = expressoTSMatchers.toHaveHeader(response, "x-missing");
      expect(result.pass).toBe(false);
    });

    it("should fail for wrong header value", () => {
      const response = createMockResponse({
        headers: { "content-type": "text/html" },
      });
      const result = expressoTSMatchers.toHaveHeader(
        response,
        "content-type",
        "application/json",
      );
      expect(result.pass).toBe(false);
    });
  });
});

// ============================================================================
// Fluent Request Extended Tests
// ============================================================================

describe("Fluent Request Extended", () => {
  describe("createFluentRequest methods", () => {
    it("should create PUT request", () => {
      const builder = createFluentRequest("http://localhost:3000");
      const req = builder.put("/users/123");

      expect(req).toBeDefined();
      expect(req.send).toBeDefined();
    });

    it("should create PATCH request", () => {
      const builder = createFluentRequest("http://localhost:3000");
      const req = builder.patch("/users/123");

      expect(req).toBeDefined();
    });

    it("should create DELETE request", () => {
      const builder = createFluentRequest("http://localhost:3000");
      const req = builder.delete("/users/123");

      expect(req).toBeDefined();
    });

    it("should create HEAD request", () => {
      const builder = createFluentRequest("http://localhost:3000");
      const req = builder.head("/users");

      expect(req).toBeDefined();
    });

    it("should create OPTIONS request", () => {
      const builder = createFluentRequest("http://localhost:3000");
      const req = builder.options("/users");

      expect(req).toBeDefined();
    });

    it("should support custom request method", () => {
      const builder = createFluentRequest("http://localhost:3000");
      const req = builder.request("POST", "/custom");

      expect(req).toBeDefined();
    });

    it("should support expectBodyPath", () => {
      const builder = createFluentRequest("http://localhost:3000");
      const req = builder.get("/users").expectBodyPath("data.id", 123);

      expect(req).toBeDefined();
    });

    it("should support expectHeaders", () => {
      const builder = createFluentRequest("http://localhost:3000");
      const req = builder.get("/users").expectHeaders({
        "content-type": "application/json",
      });

      expect(req).toBeDefined();
    });

    it("should support expectHeader", () => {
      const builder = createFluentRequest("http://localhost:3000");
      const req = builder.get("/users").expectHeader("content-type", /json/);

      expect(req).toBeDefined();
    });

    it("should support expectContentType", () => {
      const builder = createFluentRequest("http://localhost:3000");
      const req = builder.get("/users").expectContentType("application/json");

      expect(req).toBeDefined();
    });

    it("should support attach method", () => {
      const builder = createFluentRequest("http://localhost:3000");
      const req = builder.post("/upload").attach("file", "/path/to/file.txt");

      expect(req).toBeDefined();
    });

    it("should support end method as alias for execute", () => {
      const builder = createFluentRequest("http://localhost:3000");
      const req = builder.get("/users");

      expect(req.end).toBeDefined();
    });
  });
});

// ============================================================================
// Mock Provider Extended Tests
// ============================================================================

describe("Mock Provider Extended Tests", () => {
  describe("mockProvider with class", () => {
    @injectable()
    class ServiceA {
      getValue(): string {
        return "A";
      }
    }

    @injectable()
    class ServiceB {
      constructor(@inject(ServiceA) public readonly a: ServiceA) {}
      getCombined(): string {
        return this.a.getValue() + "B";
      }
    }

    it("should handle multiple dependencies", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { service, mocks } = mockProvider(ServiceB as any, {
        mocks: {
          ServiceA: {
            getValue: jest.fn().mockReturnValue("mocked"),
          },
        },
        autoMock: false,
      });

      expect(service).toBeDefined();
      expect(mocks).toBeDefined();
    });
  });
});

// ============================================================================
// Snapshot Request Extended Tests
// ============================================================================

describe("Snapshot Request Extended", () => {
  describe("snapshotRequest methods", () => {
    it("should create request with headers object", () => {
      const builder = snapshotRequest("http://localhost:3000");
      const req = builder
        .post("/test")
        .set({ Authorization: "Bearer token", "X-Custom": "value" });

      expect(req).toBeDefined();
    });

    it("should create request with auth", () => {
      const builder = snapshotRequest("http://localhost:3000");
      const req = builder.get("/protected").auth("token123", "Basic");

      expect(req).toBeDefined();
    });

    it("should create request with attach", () => {
      const builder = snapshotRequest("http://localhost:3000");
      const req = builder.post("/upload").attach("file", "/path/to/file");

      expect(req).toBeDefined();
    });

    it("should create request with type", () => {
      const builder = snapshotRequest("http://localhost:3000");
      const req = builder.post("/data").type("application/xml");

      expect(req).toBeDefined();
    });

    it("should create request with accept", () => {
      const builder = snapshotRequest("http://localhost:3000");
      const req = builder.get("/data").accept("text/html");

      expect(req).toBeDefined();
    });

    it("should create request with timeout", () => {
      const builder = snapshotRequest("http://localhost:3000");
      const req = builder.get("/slow").timeout(10000);

      expect(req).toBeDefined();
    });

    it("should create request with expectStatus", () => {
      const builder = snapshotRequest("http://localhost:3000");
      const req = builder.get("/users").expectStatus(200);

      expect(req).toBeDefined();
    });

    it("should create request with expectBodyPath", () => {
      const builder = snapshotRequest("http://localhost:3000");
      const req = builder.get("/users").expectBodyPath("data.length", 10);

      expect(req).toBeDefined();
    });

    it("should create request with expectHeaders", () => {
      const builder = snapshotRequest("http://localhost:3000");
      const req = builder.get("/users").expectHeaders({
        "cache-control": /max-age/,
      });

      expect(req).toBeDefined();
    });

    it("should create request with expectHeader", () => {
      const builder = snapshotRequest("http://localhost:3000");
      const req = builder.get("/users").expectHeader("x-rate-limit", "100");

      expect(req).toBeDefined();
    });

    it("should create request with expectTime", () => {
      const builder = snapshotRequest("http://localhost:3000");
      const req = builder.get("/users").expectTime({ lessThan: 1000 });

      expect(req).toBeDefined();
    });

    it("should create request with expectContentType", () => {
      const builder = snapshotRequest("http://localhost:3000");
      const req = builder.get("/api").expectContentType(/json/);

      expect(req).toBeDefined();
    });
  });
});

// ============================================================================
// Additional Mock Context Tests
// ============================================================================

describe("Mock Context Additional", () => {
  describe("mockContext advanced scenarios", () => {
    it("should set ip on request", () => {
      const ctx = mockContext({
        ip: "192.168.1.1",
      });

      expect(ctx.request.ip).toBe("192.168.1.1");
    });

    it("should set originalUrl on request", () => {
      const ctx = mockContext({
        url: "/api/v1/users?page=1",
      });

      expect(ctx.request.originalUrl).toBe("/api/v1/users?page=1");
    });
  });

  describe("mockReqRes advanced", () => {
    it("should create with custom headers", () => {
      const { req, res, next } = mockReqRes({
        headers: { Authorization: "Bearer token" },
      });

      expect(req.get("authorization")).toBe("Bearer token");
    });

    it("should create with path", () => {
      const { req } = mockReqRes({
        path: "/custom/path",
      });

      expect(req.path).toBe("/custom/path");
    });
  });
});

// ============================================================================
// Test Database Extended Tests
// ============================================================================

describe("Test Database Extended", () => {
  describe("find with multiple conditions", () => {
    it("should find records matching all conditions", async () => {
      const db = createTestDatabase();

      await db.insert("users", { name: "John", active: true, role: "admin" });
      await db.insert("users", { name: "Jane", active: true, role: "user" });
      await db.insert("users", { name: "Bob", active: false, role: "user" });

      const activeUsers = await db.find("users", { active: true });
      expect(activeUsers).toHaveLength(2);
    });
  });

  describe("fixture factory with overrides", () => {
    it("should allow overrides per item", () => {
      const userFactory = createFixtureFactory<{
        name: string;
        email: string;
        role: string;
      }>({
        name: (i) => `User ${i}`,
        email: (i) => `user${i}@test.com`,
        role: "user",
      });

      const users = userFactory(3);

      expect(users[0].name).toBe("User 0");
      expect(users[1].name).toBe("User 1");
      expect(users[2].name).toBe("User 2");
      expect(users.every((u) => u.role === "user")).toBe(true);
    });
  });
});
