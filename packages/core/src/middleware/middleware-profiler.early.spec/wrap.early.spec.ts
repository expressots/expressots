// Unit tests for: MiddlewareProfiler.wrap

import { MiddlewareProfiler } from "../middleware-profiler";
import { Request, Response, NextFunction } from "express";

describe("MiddlewareProfiler.wrap() wrap method", () => {
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
    it("should wrap middleware and track execution time", async () => {
      // Arrange
      const handler = jest.fn((req, res, next) => {
        setTimeout(() => next(), 10);
      });
      const wrapped = profiler.wrap("testMiddleware", handler);

      // Act
      wrapped(mockRequest as Request, mockResponse as Response, mockNext);
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Assert
      expect(handler).toHaveBeenCalled();
      const metrics = profiler.getMetricsFor("testMiddleware");
      expect(metrics).not.toBeNull();
      expect(metrics?.name).toBe("testMiddleware");
      expect(metrics?.totalCalls).toBe(1);
    });

    it("should track multiple executions", async () => {
      // Arrange
      const handler = jest.fn((req, res, next) => next());
      const wrapped = profiler.wrap("testMiddleware", handler);

      // Act
      wrapped(mockRequest as Request, mockResponse as Response, mockNext);
      wrapped(mockRequest as Request, mockResponse as Response, mockNext);
      wrapped(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      const metrics = profiler.getMetricsFor("testMiddleware");
      expect(metrics?.totalCalls).toBe(3);
    });

    it("should track errors", async () => {
      // Arrange
      const handler = jest.fn((req, res, next) => {
        next(new Error("Test error"));
      });
      const wrapped = profiler.wrap("testMiddleware", handler);

      // Act
      wrapped(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      const metrics = profiler.getMetricsFor("testMiddleware");
      expect(metrics?.errors).toBe(1);
    });

    it("should handle async middleware", async () => {
      // Arrange
      const handler = jest.fn(async (req, res, next) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        next();
      });
      const wrapped = profiler.wrap("testMiddleware", handler);

      // Act
      wrapped(mockRequest as Request, mockResponse as Response, mockNext);
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Assert
      const metrics = profiler.getMetricsFor("testMiddleware");
      expect(metrics).not.toBeNull();
      expect(metrics?.totalCalls).toBe(1);
    });

    it("should track async middleware errors", async () => {
      // Arrange
      const handler = jest.fn(async (req, res, next) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw new Error("Async error");
      });
      const wrapped = profiler.wrap("testMiddleware", handler);

      // Act
      wrapped(mockRequest as Request, mockResponse as Response, mockNext);
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Assert
      const metrics = profiler.getMetricsFor("testMiddleware");
      expect(metrics?.errors).toBe(1);
    });
  });

  describe("Edge Cases", () => {
    it("should handle middleware that throws synchronously", () => {
      // Arrange
      const handler = jest.fn(() => {
        throw new Error("Sync error");
      });
      const wrapped = profiler.wrap("testMiddleware", handler);

      // Act
      wrapped(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      const metrics = profiler.getMetricsFor("testMiddleware");
      expect(metrics?.errors).toBe(1);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it("should initialize timing entry on first wrap", () => {
      // Arrange
      const handler = jest.fn((req, res, next) => next());

      // Act
      profiler.wrap("newMiddleware", handler);

      // Assert
      const metrics = profiler.getMetricsFor("newMiddleware");
      expect(metrics).toBeNull(); // No calls yet
    });
  });
});

// End of unit tests for: MiddlewareProfiler.wrap

