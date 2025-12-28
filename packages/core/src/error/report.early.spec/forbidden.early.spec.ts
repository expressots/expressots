// Unit tests for: Report.forbidden

import { Report } from "../report";
import { AppError, StatusCode } from "../index";

describe("Report.forbidden() forbidden method", () => {
  let report: Report;

  beforeEach(() => {
    report = new Report();
  });

  describe("Happy Path", () => {
    it("should create a Forbidden error with default message", () => {
      // Act
      const result = report.forbidden();

      // Assert
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe("Forbidden");
      expect(result.statusCode).toBe(StatusCode.Forbidden);
    });

    it("should create a Forbidden error with custom message", () => {
      // Arrange
      const message = "Insufficient permissions";

      // Act
      const result = report.forbidden(message);

      // Assert
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe(message);
      expect(result.statusCode).toBe(StatusCode.Forbidden);
    });
  });
});

// End of unit tests for: Report.forbidden
