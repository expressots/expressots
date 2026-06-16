// Unit tests for: MiddlewareProfiler.getStats

import { MiddlewareProfiler } from "../middleware-profiler";
import { Request, Response, NextFunction } from "express";

describe("MiddlewareProfiler.getStats() getStats method", () => {
  let profiler: MiddlewareProfiler;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    profiler = new MiddlewareProfiler();
    mockRequest = {};
    mockResponse = {
      on: jest.fn((event: string, callback: () => void) => {
        if (event === "finish") {
          setTimeout(callback, 10);
        }
        return mockResponse as Response;
      }) as any,
    };
    mockNext = jest.fn();
  });

  describe("Happy Path", () => {
    it("should return stats with zero values when no middleware executed", () => {
      // Act
      const stats = profiler.getStats();

      // Assert
      expect(stats.totalMiddleware).toBe(0);
      expect(stats.totalRequests).toBe(0);
      expect(stats.avgPipelineMs).toBe(0);
      expect(stats.slowestMiddleware).toBeNull();
      expect(stats.fastestMiddleware).toBeNull();
      expect(stats.metrics).toEqual([]);
    });

    it("should return stats with middleware metrics", async () => {
      // Arrange
      const handler = jest.fn((req, res, next) => next());
      const wrapped = profiler.wrap("testMiddleware", handler);
      const timer = profiler.pipelineTimer();

      // Act
      timer(mockRequest as Request, mockResponse as Response, mockNext);
      wrapped(mockRequest as Request, mockResponse as Response, mockNext);
      await new Promise((resolve) => setTimeout(resolve, 20));
      const stats = profiler.getStats();

      // Assert
      expect(stats.totalMiddleware).toBe(1);
      expect(stats.totalRequests).toBe(1);
      expect(stats.avgPipelineMs).toBeGreaterThan(0);
      expect(stats.slowestMiddleware).toBe("testMiddleware");
      expect(stats.fastestMiddleware).toBe("testMiddleware");
      expect(stats.metrics.length).toBe(1);
    });

    it("should identify slowest and fastest middleware", async () => {
      // Arrange
      const slowHandler = jest.fn((req, res, next) => {
        setTimeout(() => next(), 20);
      });
      const fastHandler = jest.fn((req, res, next) => next());
      const wrappedSlow = profiler.wrap("slow", slowHandler);
      const wrappedFast = profiler.wrap("fast", fastHandler);

      // Act
      wrappedSlow(mockRequest as Request, mockResponse as Response, mockNext);
      wrappedFast(mockRequest as Request, mockResponse as Response, mockNext);
      await new Promise((resolve) => setTimeout(resolve, 30));
      const stats = profiler.getStats();

      // Assert
      expect(stats.slowestMiddleware).toBe("slow");
      expect(stats.fastestMiddleware).toBe("fast");
    });
  });
});

// End of unit tests for: MiddlewareProfiler.getStats
