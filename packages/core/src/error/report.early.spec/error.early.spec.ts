// Unit tests for: error

import { AppError } from "../app-error";
import { Report } from "../report";

// Mocking Logger
class MockLogger {
  public error = jest.fn();
}

// Mocking Error
interface MockError {
  message: string;
}

describe("Report.error() error method", () => {
  let report: Report;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockLogger = new MockLogger();
    report = new Report() as any;
    (report as any).logger = mockLogger as any;
  });

  describe("Happy Path", () => {
    it("should create and return an AppError when given an Error object", () => {
      // Arrange
      const mockError: MockError = { message: "Test error message" };
      const statusCode = 400;
      const service = "TestService";

      // Act
      const result = report.error(mockError as any, statusCode, service);

      // Assert
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe(mockError.message);
      expect(result.statusCode).toBe(statusCode);
      expect(result.service).toBe(service);
    });

    it("should create and return an AppError when given a string", () => {
      // Arrange
      const errorMessage = "Test error message";
      const statusCode = 404;
      const service = "TestService";

      // Act
      const result = report.error(errorMessage, statusCode, service);

      // Assert
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe(errorMessage);
      expect(result.statusCode).toBe(statusCode);
      expect(result.service).toBe(service);
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined statusCode and service gracefully", () => {
      // Arrange
      const mockError: MockError = { message: "Test error message" };

      // Act
      const result = report.error(mockError as any);

      // Assert
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe(mockError.message);
      expect(result.statusCode).toBeUndefined();
      expect(result.service).toBeUndefined();
    });

    it("should handle an empty string as an error message", () => {
      // Arrange
      const errorMessage = "";

      // Act
      const result = report.error(errorMessage);

      // Assert
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe(errorMessage);
      expect(result.statusCode).toBeUndefined();
      expect(result.service).toBeUndefined();
    });

    it("should handle null as an error message", () => {
      // Arrange
      const errorMessage = null;

      // Act
      const result = report.error(errorMessage as any);

      // Assert
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe("");
      expect(result.statusCode).toBeUndefined();
      expect(result.service).toBeUndefined();
    });
  });
});

// End of unit tests for: error
