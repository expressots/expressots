// Unit tests for: MiddlewareProfiler.getMetricsFor

import { MiddlewareProfiler } from "../middleware-profiler";
import { Request, Response, NextFunction } from "express";

describe("MiddlewareProfiler.getMetricsFor() getMetricsFor method", () => {
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
    it("should return null for middleware that hasn't been executed", () => {
      // Act
      const metrics = profiler.getMetricsFor("nonexistent");

      // Assert
      expect(metrics).toBeNull();
    });

    it("should return metrics after middleware execution", async () => {
      // Arrange
      const handler = jest.fn((req, res, next) => next());
      const wrapped = profiler.wrap("testMiddleware", handler);

      // Act
      wrapped(mockRequest as Request, mockResponse as Response, mockNext);
      const metrics = profiler.getMetricsFor("testMiddleware");

      // Assert
      expect(metrics).not.toBeNull();
      expect(metrics?.name).toBe("testMiddleware");
      expect(metrics?.totalCalls).toBe(1);
      expect(metrics?.errors).toBe(0);
      expect(metrics?.avgExecutionMs).toBeGreaterThanOrEqual(0);
      expect(metrics?.minExecutionMs).toBeGreaterThanOrEqual(0);
      expect(metrics?.maxExecutionMs).toBeGreaterThanOrEqual(0);
      expect(metrics?.p50ExecutionMs).toBeGreaterThanOrEqual(0);
      expect(metrics?.p95ExecutionMs).toBeGreaterThanOrEqual(0);
      expect(metrics?.p99ExecutionMs).toBeGreaterThanOrEqual(0);
      expect(metrics?.lastExecutionAt).toBeInstanceOf(Date);
    });

    it("should calculate percentiles correctly", async () => {
      // Arrange
      const handler = jest.fn((req, res, next) => next());
      const wrapped = profiler.wrap("testMiddleware", handler);

      // Act - Execute multiple times
      for (let i = 0; i < 10; i++) {
        wrapped(mockRequest as Request, mockResponse as Response, mockNext);
      }
      const metrics = profiler.getMetricsFor("testMiddleware");

      // Assert
      expect(metrics).not.toBeNull();
      expect(metrics?.totalCalls).toBe(10);
      expect(metrics?.p50ExecutionMs).toBeGreaterThanOrEqual(metrics?.minExecutionMs || 0);
      expect(metrics?.p50ExecutionMs).toBeLessThanOrEqual(metrics?.maxExecutionMs || Infinity);
      expect(metrics?.p95ExecutionMs).toBeGreaterThanOrEqual(metrics?.p50ExecutionMs || 0);
      expect(metrics?.p99ExecutionMs).toBeGreaterThanOrEqual(metrics?.p95ExecutionMs || 0);
    });
  });

  describe("Edge Cases", () => {
    it("should return null for middleware with no execution times", () => {
      // Arrange
      profiler.wrap("testMiddleware", jest.fn());

      // Act
      const metrics = profiler.getMetricsFor("testMiddleware");

      // Assert
      expect(metrics).toBeNull();
    });
  });
});

// End of unit tests for: MiddlewareProfiler.getMetricsFor

