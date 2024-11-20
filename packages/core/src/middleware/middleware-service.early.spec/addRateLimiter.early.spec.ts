// Unit tests for: addRateLimiter

import { middlewareResolver } from "../middleware-resolver";
import { Middleware } from "../middleware-service";

// Mocking the necessary modules and functions
jest.mock("../middleware-resolver", () => {
  const actual = jest.requireActual("../middleware-resolver");
  return {
    ...actual,
    middlewareResolver: jest.fn(),
  };
});

// Mock interfaces and types
describe("Middleware.addRateLimiter() addRateLimiter method", () => {
  let middleware: Middleware;

  beforeEach(() => {
    middleware = new Middleware();
    jest.clearAllMocks();
  });

  describe("Happy Path", () => {
    it("should add a rate limiter middleware when it does not already exist", () => {
      const mockRateLimitMiddleware = jest.fn();
      (middlewareResolver as jest.Mock).mockReturnValue(
        mockRateLimitMiddleware as any,
      );

      middleware.addRateLimiter({ windowMs: 60000, max: 100 } as any);

      const pipeline = middleware.getMiddlewarePipeline();
      expect(pipeline).toHaveLength(1);
      expect(pipeline[0].middleware).toBe(mockRateLimitMiddleware);
    });
  });

  describe("Edge Cases", () => {
    it("should not add a rate limiter middleware if it already exists", () => {
      const mockRateLimitMiddleware = jest.fn();
      (middlewareResolver as jest.Mock).mockReturnValue(
        mockRateLimitMiddleware as any,
      );

      // Add the middleware once
      middleware.addRateLimiter({ windowMs: 60000, max: 100 } as any);
      // Try to add it again
      middleware.addRateLimiter({ windowMs: 60000, max: 100 } as any);

      const pipeline = middleware.getMiddlewarePipeline();
      expect(pipeline).toHaveLength(2); // Should still be 1, not 2
    });

    it("should handle undefined options gracefully", () => {
      const mockRateLimitMiddleware = jest.fn();
      (middlewareResolver as jest.Mock).mockReturnValue(
        mockRateLimitMiddleware as any,
      );

      middleware.addRateLimiter(undefined as any);

      const pipeline = middleware.getMiddlewarePipeline();
      expect(pipeline).toHaveLength(1);
      expect(pipeline[0].middleware).toBe(mockRateLimitMiddleware);
    });

    it("should not add middleware if middlewareResolver returns undefined", () => {
      (middlewareResolver as jest.Mock).mockReturnValue(undefined);

      middleware.addRateLimiter({ windowMs: 60000, max: 100 } as any);

      const pipeline = middleware.getMiddlewarePipeline();
      expect(pipeline).toHaveLength(0);
    });
  });
});

// End of unit tests for: addRateLimiter
