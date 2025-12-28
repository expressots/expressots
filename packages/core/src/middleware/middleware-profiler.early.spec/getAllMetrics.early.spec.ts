// Unit tests for: MiddlewareProfiler.getAllMetrics

import { MiddlewareProfiler } from "../middleware-profiler";
import { Request, Response, NextFunction } from "express";

describe("MiddlewareProfiler.getAllMetrics() getAllMetrics method", () => {
  let profiler: MiddlewareProfiler;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    profiler = new MiddlewareProfiler();
    mockRequest = {};
    mockResponse = {};
    mockNext = jest.fn();
  });

  describe("Happy Path", () => {
    it("should return empty array when no middleware executed", () => {
      // Act
      const metrics = profiler.getAllMetrics();

      // Assert
      expect(metrics).toEqual([]);
    });

    it("should return metrics for all executed middleware", async () => {
      // Arrange
      const handler1 = jest.fn((req, res, next) => next());
      const handler2 = jest.fn((req, res, next) => next());
      const wrapped1 = profiler.wrap("middleware1", handler1);
      const wrapped2 = profiler.wrap("middleware2", handler2);

      // Act
      wrapped1(mockRequest as Request, mockResponse as Response, mockNext);
      wrapped2(mockRequest as Request, mockResponse as Response, mockNext);
      const metrics = profiler.getAllMetrics();

      // Assert
      expect(metrics.length).toBe(2);
      expect(metrics.map((m) => m.name)).toContain("middleware1");
      expect(metrics.map((m) => m.name)).toContain("middleware2");
    });

    it("should sort metrics by average execution time (slowest first)", async () => {
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
      const metrics = profiler.getAllMetrics();

      // Assert
      expect(metrics.length).toBe(2);
      expect(metrics[0].name).toBe("slow");
      expect(metrics[1].name).toBe("fast");
      expect(metrics[0].avgExecutionMs).toBeGreaterThan(metrics[1].avgExecutionMs);
    });
  });
});

// End of unit tests for: MiddlewareProfiler.getAllMetrics

