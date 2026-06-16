// Unit tests for: MiddlewareProfiler.reset

import { MiddlewareProfiler } from "../middleware-profiler";
import { Request, Response, NextFunction } from "express";

describe("MiddlewareProfiler.reset() reset method", () => {
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
    it("should reset all metrics", async () => {
      // Arrange
      const handler = jest.fn((req, res, next) => next());
      const wrapped = profiler.wrap("testMiddleware", handler);
      const timer = profiler.pipelineTimer();

      wrapped(mockRequest as Request, mockResponse as Response, mockNext);
      timer(mockRequest as Request, mockResponse as Response, mockNext);
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Act
      profiler.reset();

      // Assert
      const stats = profiler.getStats();
      expect(stats.totalMiddleware).toBe(0);
      expect(stats.totalRequests).toBe(0);
      expect(stats.metrics).toEqual([]);
      expect(profiler.getMetricsFor("testMiddleware")).toBeNull();
    });

    it("should allow new metrics after reset", async () => {
      // Arrange
      const handler = jest.fn((req, res, next) => next());
      const wrapped1 = profiler.wrap("testMiddleware", handler);

      wrapped1(mockRequest as Request, mockResponse as Response, mockNext);
      await new Promise((resolve) => setTimeout(resolve, 10));
      profiler.reset();

      // Act - Create a new wrapped handler after reset
      const wrapped2 = profiler.wrap("testMiddleware", handler);
      wrapped2(mockRequest as Request, mockResponse as Response, mockNext);
      await new Promise((resolve) => setTimeout(resolve, 10));
      const metrics = profiler.getMetricsFor("testMiddleware");

      // Assert
      expect(metrics).not.toBeNull();
      expect(metrics?.totalCalls).toBe(1);
    });
  });
});

// End of unit tests for: MiddlewareProfiler.reset
