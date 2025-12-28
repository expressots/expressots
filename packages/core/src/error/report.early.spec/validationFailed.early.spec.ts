// Unit tests for: Report.validationFailed

import { Report } from "../report";
import { AppError, StatusCode, ValidationError } from "../index";

describe("Report.validationFailed() validationFailed method", () => {
  let report: Report;

  beforeEach(() => {
    report = new Report();
  });

  describe("Happy Path", () => {
    it("should create a ValidationFailed error with validation errors", () => {
      // Arrange
      const errors: Array<ValidationError> = [
        {
          property: "email",
          messages: ["Invalid email format"],
        },
        {
          property: "age",
          messages: ["Must be 18 or older"],
        },
      ];

      // Act
      const result = report.validationFailed(errors);

      // Assert
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(StatusCode.UnprocessableEntity);
      expect(result.validationErrors).toEqual(errors);
    });

    it("should create a ValidationFailed error with validation errors including values", () => {
      // Arrange
      const errors: Array<ValidationError> = [
        {
          property: "email",
          messages: ["Invalid email format"],
          value: "invalid-email",
        },
      ];

      // Act
      const result = report.validationFailed(errors);

      // Assert
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(StatusCode.UnprocessableEntity);
      expect(result.validationErrors).toEqual(errors);
    });
  });
});

// End of unit tests for: Report.validationFailed

