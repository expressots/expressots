// Unit tests for: addMiddleware

import { RequestHandler, NextFunction, Request, Response } from "express";
import { Middleware, ExpressoMiddleware } from "../middleware-service";

// Mocking the necessary imports
jest.mock("../middleware-resolver", () => {
  const actual = jest.requireActual("../middleware-resolver");
  return {
    ...actual,
    middlewareResolver: jest.fn(),
    getResolverStartupWarnings: jest.fn().mockReturnValue([]),
    clearResolverStartupWarnings: jest.fn(),
  };
});

jest.mock("../../error/error-handler-middleware", () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock types and interfaces
interface MockIExpressoMiddleware {
  use: jest.Mock;
}

type MockMiddlewareConfig = {
  path?: string;
  middlewares: Array<jest.Mock | MockIExpressoMiddleware>;
};

// Concrete implementation of ExpressoMiddleware for testing
class TestExpressoMiddleware extends ExpressoMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    next();
  }
}

describe("Middleware.addMiddleware() addMiddleware method", () => {
  let middleware: Middleware;

  beforeEach(() => {
    middleware = new Middleware();
  });

  describe("Happy Path", () => {
    it("should add an Express request handler middleware", () => {
      const mockHandler: RequestHandler = jest.fn();
      Object.defineProperty(mockHandler, "name", { value: "testHandler" });

      middleware.addMiddleware(mockHandler);

      const pipeline = middleware.getMiddlewarePipeline();
      expect(pipeline).toHaveLength(1);
      expect(pipeline[0].middleware).toBe(mockHandler);
    });

    it("should add a middleware configuration object with path", () => {
      const mockConfig: MockMiddlewareConfig = {
        path: "/api",
        middlewares: [jest.fn()],
      };

      middleware.addMiddleware(mockConfig as any);

      const pipeline = middleware.getMiddlewarePipeline();
      expect(pipeline).toHaveLength(1);
      expect(pipeline[0].middleware).toBe(mockConfig);
    });

    it("should add a custom ExpressoMiddleware instance", () => {
      const customMiddleware = new TestExpressoMiddleware();

      middleware.addMiddleware(customMiddleware as any);

      const pipeline = middleware.getMiddlewarePipeline();
      expect(pipeline).toHaveLength(1);
      expect(pipeline[0].middleware).toBe(customMiddleware);
    });
  });

  describe("Edge Cases", () => {
    it("should handle adding a middleware with an empty configuration", () => {
      const mockConfig: MockMiddlewareConfig = {
        path: "/empty",
        middlewares: [],
      };

      middleware.addMiddleware(mockConfig as any);

      const pipeline = middleware.getMiddlewarePipeline();
      expect(pipeline).toHaveLength(0);
    });

    it("should not add duplicate named middleware", () => {
      const mockHandler: RequestHandler = jest.fn();
      Object.defineProperty(mockHandler, "name", { value: "duplicateHandler" });

      middleware.addMiddleware(mockHandler);
      middleware.addMiddleware(mockHandler);

      const pipeline = middleware.getMiddlewarePipeline();
      expect(pipeline).toHaveLength(1);
    });

    it("should allow truly anonymous middleware to be added multiple times", () => {
      // Create middleware with no name property (truly anonymous)
      const handler1 = function () {};
      const handler2 = function () {};
      // Remove the name property to make them truly anonymous
      Object.defineProperty(handler1, "name", { value: "" });
      Object.defineProperty(handler2, "name", { value: "" });

      middleware.addMiddleware(handler1 as any);
      middleware.addMiddleware(handler2 as any);

      const pipeline = middleware.getMiddlewarePipeline();
      // Anonymous middleware get unique names like "anonymous_0", "anonymous_1"
      expect(pipeline).toHaveLength(2);
    });
  });
});

describe("Middleware.add() add method (alias)", () => {
  let middleware: Middleware;

  beforeEach(() => {
    middleware = new Middleware();
  });

  it("should work as an alias for addMiddleware", () => {
    const mockHandler: RequestHandler = jest.fn();
    Object.defineProperty(mockHandler, "name", { value: "aliasHandler" });

    middleware.add(mockHandler);

    const pipeline = middleware.getMiddlewarePipeline();
    expect(pipeline).toHaveLength(1);
  });
});

// End of unit tests for: addMiddleware
