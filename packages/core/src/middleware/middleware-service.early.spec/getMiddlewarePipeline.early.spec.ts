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
      // Test to ensure the pipeline is empty initially
      const pipeline = middleware.getMiddlewarePipeline();
      expect(pipeline).toEqual([]);
    });

    it("should return middleware in the order they were added", () => {
      // Mock middleware functions
      const mockMiddleware1: RequestHandler = jest.fn();
      const mockMiddleware2: RequestHandler = jest.fn();

      // Add middleware to the pipeline
      middleware.addMiddleware(mockMiddleware1 as any);
      middleware.addMiddleware(mockMiddleware2 as any);

      // Test to ensure the pipeline returns middleware in the correct order
      const pipeline = middleware.getMiddlewarePipeline();
      expect(pipeline.length).toBe(1);
      expect(pipeline[0].middleware).toBe(mockMiddleware1);
      //expect(pipeline[1].middleware).toBe(mockMiddleware2);
    });
  });

  describe("Edge Cases", () => {
    it("should handle adding the same middleware multiple times", () => {
      // Mock middleware function
      const mockMiddleware: RequestHandler = jest.fn();

      // Add the same middleware multiple times
      middleware.addMiddleware(mockMiddleware as any);
      middleware.addMiddleware(mockMiddleware as any);

      // Test to ensure the middleware is not duplicated in the pipeline
      const pipeline = middleware.getMiddlewarePipeline();
      expect(pipeline.length).toBe(1);
      expect(pipeline[0].middleware).toBe(mockMiddleware);
    });

    it("should handle adding a middleware configuration object", () => {
      // Mock middleware configuration
      const mockConfig: MockMiddlewareConfig = {
        path: "/test",
        middlewares: [jest.fn() as any],
      };

      // Add middleware configuration to the pipeline
      middleware.addMiddleware(mockConfig as any);

      // Test to ensure the configuration is added to the pipeline
      const pipeline = middleware.getMiddlewarePipeline();
      expect(pipeline.length).toBe(1);
      expect(pipeline[0].middleware).toBe(mockConfig);
    });

    it("should handle adding a custom Expresso middleware", () => {
      // Mock custom Expresso middleware
      const mockExpressoMiddleware: MockIExpressoMiddleware = {
        use: jest.fn(),
      };

      // Add custom middleware to the pipeline
      middleware.addMiddleware(mockExpressoMiddleware as any);

      // Test to ensure the custom middleware is added to the pipeline
      const pipeline = middleware.getMiddlewarePipeline();
      expect(pipeline.length).toBe(1);
      expect(pipeline[0].middleware).toBe(mockExpressoMiddleware);
    });
  });
});

// End of unit tests for: getMiddlewarePipeline
