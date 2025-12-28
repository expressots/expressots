// Unit tests for: Report.internalServerError

import { Report } from "../report";
import { AppError, StatusCode } from "../index";

describe("Report.internalServerError() internalServerError method", () => {
  let report: Report;

  beforeEach(() => {
    report = new Report();
  });

  describe("Happy Path", () => {
    it("should create an InternalServerError with default message", () => {
      // Act
      const result = report.internalServerError();

      // Assert
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe("Internal Server Error");
      expect(result.statusCode).toBe(StatusCode.InternalServerError);
      expect(result.type).toBe(
        "https://expressots.dev/errors/internal-server-error",
      );
    });

    it("should create an InternalServerError with custom message", () => {
      // Arrange
      const message = "Database connection failed";

      // Act
      const result = report.internalServerError(message);

      // Assert
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe(message);
      expect(result.statusCode).toBe(StatusCode.InternalServerError);
      expect(result.type).toBe(
        "https://expressots.dev/errors/internal-server-error",
      );
    });

    it("should create an InternalServerError with message and service", () => {
      // Arrange
      const message = "Database connection failed";
      const service = "DatabaseService";

      // Act
      const result = report.internalServerError(message, service);

      // Assert
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe(message);
      expect(result.statusCode).toBe(StatusCode.InternalServerError);
      expect(result.service).toBe(service);
      expect(result.type).toBe(
        "https://expressots.dev/errors/internal-server-error",
      );
    });
  });
});

// End of unit tests for: Report.internalServerError
