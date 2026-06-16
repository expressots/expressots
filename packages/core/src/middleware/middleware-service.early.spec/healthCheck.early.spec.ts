// Unit tests for: addHealthCheck

import { Middleware } from "../middleware-service";

jest.mock("../middleware-resolver", () => {
  const actual = jest.requireActual("../middleware-resolver");
  return {
    ...actual,
    middlewareResolver: jest.fn(),
  };
});

jest.mock("../../error/error-handler-middleware", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("Middleware.addHealthCheck() addHealthCheck method", () => {
  let middleware: Middleware;

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = new Middleware();
  });

  describe("Happy Path", () => {
    it("should add health check endpoint with default path", () => {
      middleware.addHealthCheck();

      const pipeline = middleware.getMiddlewarePipeline();
      expect(pipeline.length).toBe(1);

      const entry = pipeline[0];
      expect(entry.middleware).toHaveProperty("path", "/health/middleware");
    });

    it("should add health check endpoint with custom path", () => {
      middleware.addHealthCheck({ path: "/custom-health" });

      const pipeline = middleware.getMiddlewarePipeline();
      const entry = pipeline[0];
      expect(entry.middleware).toHaveProperty("path", "/custom-health");
    });

    it("should configure detailed health check", () => {
      middleware.addHealthCheck({
        path: "/health",
        detailed: true,
      });

      const pipeline = middleware.getMiddlewarePipeline();
      expect(pipeline.length).toBe(1);
    });

    it("should configure health check with metrics", () => {
      middleware.enableProfiling();
      middleware.addHealthCheck({
        includeMetrics: true,
      });

      const pipeline = middleware.getMiddlewarePipeline();
      expect(pipeline.length).toBe(1);
    });
  });

  describe("Health Check Response", () => {
    it("should create handler that responds with middleware info", () => {
      // Add some middleware first
      const handler = jest.fn();
      Object.defineProperty(handler, "name", { value: "testHandler" });
      middleware.addMiddleware(handler);

      middleware.addHealthCheck();

      const pipeline = middleware.getMiddlewarePipeline();
      const healthEntry = pipeline.find(
        (p) => (p.middleware as any)?.path === "/health/middleware",
      );

      expect(healthEntry).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty options", () => {
      middleware.addHealthCheck({});

      const pipeline = middleware.getMiddlewarePipeline();
      expect(pipeline.length).toBe(1);
    });

    it("should not add duplicate health check endpoints", () => {
      middleware.addHealthCheck();
      const initialLength = middleware.getMiddlewarePipeline().length;

      middleware.addHealthCheck();

      // Should add as different path config
      expect(middleware.getMiddlewarePipeline().length).toBe(initialLength);
    });
  });
});

// End of unit tests for: addHealthCheck
