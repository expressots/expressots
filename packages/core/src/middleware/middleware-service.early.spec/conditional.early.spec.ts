// Unit tests for: addConditional and when methods

import { Request } from "express";
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

describe("Middleware Conditional Methods", () => {
  let middleware: Middleware;

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = new Middleware();
  });

  describe("addConditional()", () => {
    it("should add conditional middleware with condition function", () => {
      const handler = jest.fn();
      const condition = (req: Request) => req.path.startsWith("/api");

      middleware.addConditional({
        middleware: handler,
        condition,
        name: "conditional-handler",
      });

      expect(middleware.count()).toBe(1);
      expect(middleware.getByName("conditional-handler")).toBeDefined();
    });

    it("should execute middleware only when condition is true", () => {
      const handler = jest.fn((req, res, next) => next());
      const next = jest.fn();
      const condition = (req: Request) => req.path === "/api";

      middleware.addConditional({
        middleware: handler,
        condition,
        name: "conditional-handler",
      });

      const pipeline = middleware.getMiddlewarePipeline();
      const wrappedMiddleware = pipeline[0].middleware as any;

      // Test when condition is true
      const apiReq = { path: "/api" } as Request;
      wrappedMiddleware(apiReq, {}, next);
      expect(handler).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it("should skip middleware when condition is false", () => {
      const handler = jest.fn((req, res, next) => next());
      const next = jest.fn();
      const condition = (req: Request) => req.path === "/api";

      middleware.addConditional({
        middleware: handler,
        condition,
        name: "conditional-handler",
      });

      const pipeline = middleware.getMiddlewarePipeline();
      const wrappedMiddleware = pipeline[0].middleware as any;

      // Test when condition is false
      const publicReq = { path: "/public" } as Request;
      wrappedMiddleware(publicReq, {}, next);
      expect(handler).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it("should auto-generate name when not provided", () => {
      middleware.addConditional({
        middleware: jest.fn(),
        condition: () => true,
      });

      expect(middleware.count()).toBe(1);
    });

    it("should not add duplicate conditional middleware", () => {
      middleware.addConditional({
        middleware: jest.fn(),
        condition: () => true,
        name: "test-conditional",
      });

      middleware.addConditional({
        middleware: jest.fn(),
        condition: () => true,
        name: "test-conditional",
      });

      expect(middleware.count()).toBe(1);
    });

    it("should assign custom category when provided", () => {
      middleware.addConditional({
        middleware: jest.fn(),
        condition: () => true,
        name: "security-check",
        category: "security",
      });

      const entry = middleware.getByName("security-check");
      expect(entry?.category).toBe("security");
    });
  });

  describe("when()", () => {
    it("should add middleware when boolean condition is true", () => {
      // Create a handler with arity > 0 to be treated as middleware
      const handler = function (req: any, res: any, next: any) {
        next();
      };
      Object.defineProperty(handler, "name", { value: "conditionalHandler" });

      middleware.when(true, handler);

      expect(middleware.count()).toBe(1);
    });

    it("should not add middleware when boolean condition is false", () => {
      const handler = function (req: any, res: any, next: any) {
        next();
      };

      middleware.when(false, handler);

      expect(middleware.count()).toBe(0);
    });

    it("should evaluate function condition", () => {
      // Create a handler with arity > 0 to be treated as middleware
      const handler = function (req: any, res: any, next: any) {
        next();
      };
      Object.defineProperty(handler, "name", { value: "conditionalHandler" });

      middleware.when(() => true, handler);

      expect(middleware.count()).toBe(1);
    });

    it("should execute callback function when condition is true", () => {
      // Create callback with arity 0 to be treated as callback
      let callbackCalled = false;
      const callback = () => {
        callbackCalled = true;
      };

      middleware.when(true, callback);

      expect(callbackCalled).toBe(true);
    });

    it("should not execute callback when condition is false", () => {
      let callbackCalled = false;
      const callback = () => {
        callbackCalled = true;
      };

      middleware.when(false, callback);

      expect(callbackCalled).toBe(false);
    });

    it("should differentiate between middleware and callback by arity", () => {
      // Middleware has arity 3
      const middlewareHandler = function (req: any, res: any, next: any) {
        next();
      };
      Object.defineProperty(middlewareHandler, "name", { value: "mwHandler" });

      middleware.when(true, middlewareHandler);
      expect(middleware.count()).toBe(1);

      // Callback has arity 0
      let callbackExecuted = false;
      const callback = () => {
        callbackExecuted = true;
      };
      middleware.when(true, callback);
      expect(callbackExecuted).toBe(true);
    });
  });
});

// End of unit tests for: addConditional and when methods
