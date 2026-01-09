// Unit tests for: getMiddlewarePipeline

import { RequestHandler } from "express";
import { Middleware } from "../middleware-service";

// Mocking the necessary modules
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

// Mock interfaces and types
interface MockIExpressoMiddleware {
  use: jest.Mock;
}

type MockMiddlewareConfig = {
  path?: string;
  middlewares: Array<jest.Mock | MockIExpressoMiddleware>;
};

// Test suite for getMiddlewarePipeline
describe("Middleware.getMiddlewarePipeline() getMiddlewarePipeline method", () => {
  let middleware: Middleware;

  beforeEach(() => {
    middleware = new Middleware();
  });

  describe("Happy Path", () => {
    it("should return an empty array when no middleware is added", () => {
      const pipeline = middleware.getMiddlewarePipeline();
      expect(pipeline).toEqual([]);
    });

    it("should return middleware in the order they were added", () => {
      // Create distinct middleware with different names
      const mockMiddleware1: RequestHandler = jest.fn();
      Object.defineProperty(mockMiddleware1, "name", { value: "middleware1" });
      const mockMiddleware2: RequestHandler = jest.fn();
      Object.defineProperty(mockMiddleware2, "name", { value: "middleware2" });

      middleware.addMiddleware(mockMiddleware1 as any);
      middleware.addMiddleware(mockMiddleware2 as any);

      const pipeline = middleware.getMiddlewarePipeline();
      expect(pipeline.length).toBe(2);
      expect(pipeline[0].middleware).toBe(mockMiddleware1);
      expect(pipeline[1].middleware).toBe(mockMiddleware2);
    });

    it("should return sorted pipeline by insertion order", () => {
      const handler1 = jest.fn();
      Object.defineProperty(handler1, "name", { value: "first" });
      const handler2 = jest.fn();
      Object.defineProperty(handler2, "name", { value: "second" });
      const handler3 = jest.fn();
      Object.defineProperty(handler3, "name", { value: "third" });

      middleware.addMiddleware(handler1);
      middleware.addMiddleware(handler2);
      middleware.addMiddleware(handler3);

      const pipeline = middleware.getMiddlewarePipeline();

      expect(pipeline[0].order).toBeLessThan(pipeline[1].order);
      expect(pipeline[1].order).toBeLessThan(pipeline[2].order);
    });
  });

  describe("Edge Cases", () => {
    it("should handle adding the same named middleware multiple times", () => {
      const mockMiddleware: RequestHandler = jest.fn();
      Object.defineProperty(mockMiddleware, "name", { value: "duplicate" });

      middleware.addMiddleware(mockMiddleware as any);
      middleware.addMiddleware(mockMiddleware as any);

      const pipeline = middleware.getMiddlewarePipeline();
      expect(pipeline.length).toBe(1);
      expect(pipeline[0].middleware).toBe(mockMiddleware);
    });

    it("should handle adding a middleware configuration object", () => {
      const mockConfig: MockMiddlewareConfig = {
        path: "/test",
        middlewares: [jest.fn() as any],
      };

      middleware.addMiddleware(mockConfig as any);

      const pipeline = middleware.getMiddlewarePipeline();
      expect(pipeline.length).toBe(1);
      expect(pipeline[0].middleware).toBe(mockConfig);
    });

    it("should handle adding a custom Expresso middleware", () => {
      const mockExpressoMiddleware: MockIExpressoMiddleware = {
        use: jest.fn(),
      };

      middleware.addMiddleware(mockExpressoMiddleware as any);

      const pipeline = middleware.getMiddlewarePipeline();
      expect(pipeline.length).toBe(1);
      expect(pipeline[0].middleware).toBe(mockExpressoMiddleware);
    });

    it("should cache sorted pipeline for performance", () => {
      const handler = jest.fn();
      Object.defineProperty(handler, "name", { value: "test" });
      middleware.addMiddleware(handler);

      const pipeline1 = middleware.getMiddlewarePipeline();
      const pipeline2 = middleware.getMiddlewarePipeline();

      // Same reference means cache is being used
      expect(pipeline1).toBe(pipeline2);
    });

    it("should invalidate cache when middleware is added", () => {
      const handler1 = jest.fn();
      Object.defineProperty(handler1, "name", { value: "first" });
      middleware.addMiddleware(handler1);

      const pipeline1 = middleware.getMiddlewarePipeline();

      const handler2 = jest.fn();
      Object.defineProperty(handler2, "name", { value: "second" });
      middleware.addMiddleware(handler2);

      const pipeline2 = middleware.getMiddlewarePipeline();

      expect(pipeline1).not.toBe(pipeline2);
      expect(pipeline2.length).toBe(2);
    });
  });
});

// End of unit tests for: getMiddlewarePipeline
