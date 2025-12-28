// Unit tests for: MiddlewareProfiler.setEnabled

import { MiddlewareProfiler } from "../middleware-profiler";
import { Request, Response, NextFunction } from "express";

describe("MiddlewareProfiler.setEnabled() setEnabled method", () => {
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
    it("should enable profiling when set to true", () => {
      // Arrange
      profiler.setEnabled(false);

      // Act
      profiler.setEnabled(true);

      // Assert
      expect(profiler.isEnabled()).toBe(true);
    });

    it("should disable profiling when set to false", () => {
      // Arrange
      profiler.setEnabled(true);

      // Act
      profiler.setEnabled(false);

      // Assert
      expect(profiler.isEnabled()).toBe(false);
    });

    it("should skip profiling when disabled", () => {
      // Arrange
      const handler = jest.fn((req, res, next) => next());
      const wrapped = profiler.wrap("test", handler);
      profiler.setEnabled(false);

      // Act
      wrapped(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(handler).toHaveBeenCalled();
      expect(profiler.getMetricsFor("test")).toBeNull();
    });
  });
});

// End of unit tests for: MiddlewareProfiler.setEnabled

