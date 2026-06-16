// Unit tests for: viewMiddlewarePipeline

import { Middleware } from "../middleware-service";

// Mocking necessary functions
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
interface MockMiddlewarePipeline {
  order: number;
  middleware: any;
  name?: string;
  category?: string;
  isBuiltIn?: boolean;
}

describe("Middleware.viewMiddlewarePipeline() viewMiddlewarePipeline method", () => {
  let middleware: Middleware;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    middleware = new Middleware();
    consoleSpy = jest.spyOn(console, "table").mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe("Happy Path", () => {
    it("should correctly format and display the middleware pipeline", () => {
      // Add some middleware
      const handler1 = jest.fn();
      Object.defineProperty(handler1, "name", { value: "firstMiddleware" });
      const handler2 = jest.fn();
      Object.defineProperty(handler2, "name", { value: "secondMiddleware" });

      middleware.addMiddleware(handler1);
      middleware.addMiddleware(handler2);

      // Act
      middleware.viewMiddlewarePipeline();

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            order: expect.any(Number),
            path: "Global",
            middleware: expect.any(String),
          }),
        ]),
      );
    });

    it("should display middleware config with path", () => {
      const config = {
        path: "/api",
        middlewares: [jest.fn()],
      };

      middleware.addMiddleware(config as any);
      middleware.viewMiddlewarePipeline();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            path: "/api",
          }),
        ]),
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle an empty middleware pipeline gracefully", () => {
      // Act - should not throw
      expect(() => middleware.viewMiddlewarePipeline()).not.toThrow();

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith([]);
    });

    it("should handle anonymous middleware", () => {
      const anonymousHandler = function () {};
      middleware.addMiddleware(anonymousHandler as any);

      expect(() => middleware.viewMiddlewarePipeline()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});

// End of unit tests for: viewMiddlewarePipeline
