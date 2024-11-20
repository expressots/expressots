// Unit tests for: addMiddleware

import { RequestHandler } from "express";
import { Middleware } from "../middleware-service";

// Mocking the necessary imports
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

// Mock types and interfaces

interface MockIExpressoMiddleware {
  use: jest.Mock;
}
type MockMiddlewareConfig = any;

describe("Middleware.addMiddleware() addMiddleware method", () => {
  let middleware: Middleware;

  beforeEach(() => {
    middleware = new Middleware();
  });

  describe("Happy Path", () => {});

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
  });
});

// End of unit tests for: addMiddleware
