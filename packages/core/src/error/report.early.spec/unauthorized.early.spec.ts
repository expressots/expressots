// Unit tests for: Report.unauthorized

import { Report } from "../report";
import { AppError, StatusCode } from "../index";

describe("Report.unauthorized() unauthorized method", () => {
  let report: Report;

  beforeEach(() => {
    report = new Report();
  });

  describe("Happy Path", () => {
    it("should create an Unauthorized error with default message", () => {
      // Act
      const result = report.unauthorized();

      // Assert
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe("Unauthorized");
      expect(result.statusCode).toBe(StatusCode.Unauthorized);
    });

    it("should create an Unauthorized error with custom message", () => {
      // Arrange
      const message = "Invalid credentials";

      // Act
      const result = report.unauthorized(message);

      // Assert
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe(message);
      expect(result.statusCode).toBe(StatusCode.Unauthorized);
    });
  });
});

// End of unit tests for: Report.unauthorized
