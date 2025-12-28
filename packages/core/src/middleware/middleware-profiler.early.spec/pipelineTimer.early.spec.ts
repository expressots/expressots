// Unit tests for: MiddlewareProfiler.pipelineTimer

import { MiddlewareProfiler } from "../middleware-profiler";
import { Request, Response, NextFunction } from "express";

describe("MiddlewareProfiler.pipelineTimer() pipelineTimer method", () => {
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
    it("should track pipeline time when response finishes", (done) => {
      // Arrange
      const timer = profiler.pipelineTimer();

      // Act
      timer(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.on).toHaveBeenCalledWith(
        "finish",
        expect.any(Function),
      );

      setTimeout(() => {
        const stats = profiler.getStats();
        expect(stats.totalRequests).toBe(1);
        expect(stats.avgPipelineMs).toBeGreaterThan(0);
        done();
      }, 20);
    });

    it("should increment totalRequests", (done) => {
      // Arrange
      const timer = profiler.pipelineTimer();

      // Act
      timer(mockRequest as Request, mockResponse as Response, mockNext);
      timer(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      setTimeout(() => {
        const stats = profiler.getStats();
        expect(stats.totalRequests).toBe(2);
        done();
      }, 20);
    });

    it("should not track when disabled", () => {
      // Arrange
      profiler.setEnabled(false);
      const timer = profiler.pipelineTimer();

      // Act
      timer(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.on).not.toHaveBeenCalled();
    });
  });
});

// End of unit tests for: MiddlewareProfiler.pipelineTimer
