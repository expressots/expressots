// Unit tests for: Report.conflict

import { Report } from "../report";
import { AppError, StatusCode } from "../index";

describe("Report.conflict() conflict method", () => {
  let report: Report;

  beforeEach(() => {
    report = new Report();
  });

  describe("Happy Path", () => {
    it("should create a Conflict error with message", () => {
      // Arrange
      const message = "Resource already exists";

      // Act
      const result = report.conflict(message);

      // Assert
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe(message);
      expect(result.statusCode).toBe(StatusCode.Conflict);
    });

    it("should create a Conflict error with message and details", () => {
      // Arrange
      const message = "Resource already exists";
      const details = { resourceId: "123", existingValue: "test@example.com" };

      // Act
      const result = report.conflict(message, details);

      // Assert
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe(message);
      expect(result.statusCode).toBe(StatusCode.Conflict);
      expect(result.details).toEqual(details);
    });
  });
});

// End of unit tests for: Report.conflict
