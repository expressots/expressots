// Unit tests for: ValidationError constructor

import { ValidationError } from "../validation.error";
import { ValidationError as ValidationErrorType } from "../app-error";
import { StatusCode } from "../status-code";

describe("ValidationError() ValidationError constructor", () => {
  describe("Happy Path", () => {
    it("should create ValidationError with errors array", () => {
      // Arrange
      const errors: Array<ValidationErrorType> = [
        { property: "email", messages: ["Invalid email format"] },
        { property: "age", messages: ["Must be 18 or older"] },
      ];

      // Act
      const error = new ValidationError(errors);

      // Assert
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe("Validation failed");
      expect(error.statusCode).toBe(StatusCode.UnprocessableEntity);
      expect(error.type).toBe("https://expressots.dev/errors/validation-failed");
      expect(error.errors).toEqual(errors);
      expect(error.validationErrors).toEqual(errors);
    });

    it("should include value in errors when provided", () => {
      // Arrange
      const errors: Array<ValidationErrorType> = [
        {
          property: "email",
          messages: ["Invalid email"],
          value: "invalid-email",
        },
      ];

      // Act
      const error = new ValidationError(errors);

      // Assert
      expect(error.errors).toEqual(errors);
      expect(error.validationErrors).toEqual(errors);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty errors array", () => {
      // Arrange
      const errors: Array<ValidationErrorType> = [];

      // Act
      const error = new ValidationError(errors);

      // Assert
      expect(error.errors).toEqual([]);
      expect(error.validationErrors).toEqual([]);
      expect(error.statusCode).toBe(StatusCode.UnprocessableEntity);
    });
  });
});

// End of unit tests for: ValidationError constructor

