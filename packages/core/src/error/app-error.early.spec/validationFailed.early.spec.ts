// Unit tests for: AppError.validationFailed

import { AppError, ValidationError } from "../app-error";
import { StatusCode } from "../status-code";

describe("AppError.validationFailed() validationFailed static method", () => {
  describe("Happy Path", () => {
    it("should create validation error with validation errors array", () => {
      // Arrange
      const errors: Array<ValidationError> = [
        { property: "email", messages: ["Invalid email format"] },
        { property: "age", messages: ["Must be 18 or older"] },
      ];

      // Act
      const error = AppError.validationFailed(errors);

      // Assert
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe("Validation failed");
      expect(error.statusCode).toBe(StatusCode.UnprocessableEntity);
      expect(error.type).toBe(
        "https://expressots.dev/errors/validation-failed",
      );
      expect(error.validationErrors).toEqual(errors);
    });

    it("should include value in validation errors when provided", () => {
      // Arrange
      const errors: Array<ValidationError> = [
        {
          property: "email",
          messages: ["Invalid email"],
          value: "invalid-email",
        },
      ];

      // Act
      const error = AppError.validationFailed(errors);

      // Assert
      expect(error.validationErrors).toEqual(errors);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty validation errors array", () => {
      // Arrange
      const errors: Array<ValidationError> = [];

      // Act
      const error = AppError.validationFailed(errors);

      // Assert
      expect(error.validationErrors).toEqual([]);
      expect(error.statusCode).toBe(StatusCode.UnprocessableEntity);
    });
  });
});

// End of unit tests for: AppError.validationFailed
