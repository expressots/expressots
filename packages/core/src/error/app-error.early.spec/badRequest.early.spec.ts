// Unit tests for: AppError.badRequest

import { AppError } from "../app-error";
import { StatusCode } from "../status-code";

describe("AppError.badRequest() badRequest static method", () => {
  describe("Happy Path", () => {
    it("should create BadRequest error with message", () => {
      // Act
      const error = AppError.badRequest("Invalid input");

      // Assert
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe("Invalid input");
      expect(error.statusCode).toBe(StatusCode.BadRequest);
      expect(error.type).toBe("https://expressots.dev/errors/bad-request");
    });

    it("should create BadRequest error with message and details", () => {
      // Arrange
      const details = { field: "email", reason: "Invalid format" };

      // Act
      const error = AppError.badRequest("Invalid input", details);

      // Assert
      expect(error.message).toBe("Invalid input");
      expect(error.statusCode).toBe(StatusCode.BadRequest);
      expect(error.details).toEqual(details);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty message", () => {
      // Act
      const error = AppError.badRequest("");

      // Assert
      expect(error.message).toBe("");
      expect(error.statusCode).toBe(StatusCode.BadRequest);
    });

    it("should handle undefined details", () => {
      // Act
      const error = AppError.badRequest("Invalid input", undefined);

      // Assert
      expect(error.message).toBe("Invalid input");
      expect(error.details).toBeUndefined();
    });
  });
});

// End of unit tests for: AppError.badRequest
