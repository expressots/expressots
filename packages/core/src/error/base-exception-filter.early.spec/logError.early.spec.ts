// Unit tests for: BaseExceptionFilter.logError

import "reflect-metadata";
import { BaseExceptionFilter } from "../base-exception-filter";
import { ExceptionContext } from "../exception-filter.interface";
import { Logger } from "../../provider/logger/logger.provider";
import { Report } from "../report";

class MockLogger {
  public error = jest.fn();
  public info = jest.fn();
}

class MockReport {
  // Empty mock
}

class TestExceptionFilter extends BaseExceptionFilter {
  public catch(exception: Error, context: ExceptionContext): void {
    // Test implementation
  }
}

describe("BaseExceptionFilter.logError() logError method", () => {
  let filter: TestExceptionFilter;
  let mockLogger: MockLogger;
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: any;
  let context: ExceptionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    filter = new TestExceptionFilter();
    mockLogger = new MockLogger();
    (filter as any).logger = mockLogger as any;
    (filter as any).report = new MockReport() as any;

    mockRequest = { path: "/test" };
    mockResponse = {};
    mockNext = jest.fn();

    context = {
      request: mockRequest,
      response: mockResponse,
      next: mockNext,
      controller: class TestController {},
      handler: "testMethod",
      showStackTrace: false,
    };
  });

  describe("Happy Path", () => {
    it("should log error with controller and handler name", () => {
      // Arrange
      const exception = new Error("Test error");

      // Act
      filter["logError"](exception, context);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("TestController.testMethod"),
        expect.any(String),
      );
    });

    it("should use unknown when controller or handler not available", () => {
      // Arrange
      const exception = new Error("Test error");
      context.controller = undefined;
      context.handler = undefined;

      // Act
      filter["logError"](exception, context);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("unknown.unknown"),
        expect.any(String),
      );
    });

    it("should log stack trace when showStackTrace is true", () => {
      // Arrange
      const exception = new Error("Test error");
      exception.stack = "Error: Test error\n    at test.js:1:1";
      context.showStackTrace = true;

      // Act
      filter["logError"](exception, context);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledTimes(2);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("TestController.testMethod"),
        expect.any(String),
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        exception.stack,
        expect.any(String),
      );
    });
  });

  describe("Edge Cases", () => {
    it("should not log stack trace when showStackTrace is false", () => {
      // Arrange
      const exception = new Error("Test error");
      exception.stack = "Error: Test error\n    at test.js:1:1";
      context.showStackTrace = false;

      // Act
      filter["logError"](exception, context);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).not.toHaveBeenCalledWith(exception.stack, expect.any(String));
    });

    it("should handle exception without stack trace", () => {
      // Arrange
      const exception = new Error("Test error");
      delete exception.stack;
      context.showStackTrace = true;

      // Act
      filter["logError"](exception, context);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });
  });
});

// End of unit tests for: BaseExceptionFilter.logError

