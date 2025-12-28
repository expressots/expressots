// Unit tests for: Report.badRequest

import { Report } from "../report";
import { AppError, StatusCode } from "../index";

describe("Report.badRequest() badRequest method", () => {
  let report: Report;

  beforeEach(() => {
    report = new Report();
  });

  describe("Happy Path", () => {
    it("should create a BadRequest error with message", () => {
      // Arrange
      const message = "Invalid input";

      // Act
      const result = report.badRequest(message);

      // Assert
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe(message);
      expect(result.statusCode).toBe(StatusCode.BadRequest);
    });

    it("should create a BadRequest error with message and details", () => {
      // Arrange
      const message = "Invalid input";
      const details = { field: "email", reason: "Invalid format" };

      // Act
      const result = report.badRequest(message, details);

      // Assert
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe(message);
      expect(result.statusCode).toBe(StatusCode.BadRequest);
      expect(result.details).toEqual(details);
    });
  });
});

// End of unit tests for: Report.badRequest
