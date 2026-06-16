// Unit tests for: AppError.conflict

import { AppError } from "../app-error";
import { StatusCode } from "../status-code";

describe("AppError.conflict() conflict static method", () => {
  describe("Happy Path", () => {
    it("should create Conflict error with message", () => {
      // Act
      const error = AppError.conflict("Resource already exists");

      // Assert
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe("Resource already exists");
      expect(error.statusCode).toBe(StatusCode.Conflict);
      expect(error.type).toBe("https://expressots.dev/errors/conflict");
    });

    it("should create Conflict error with message and details", () => {
      // Arrange
      const details = { resourceId: "123", reason: "Duplicate entry" };

      // Act
      const error = AppError.conflict("Resource already exists", details);

      // Assert
      expect(error.message).toBe("Resource already exists");
      expect(error.statusCode).toBe(StatusCode.Conflict);
      expect(error.details).toEqual(details);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty message", () => {
      // Act
      const error = AppError.conflict("");

      // Assert
      expect(error.message).toBe("");
      expect(error.statusCode).toBe(StatusCode.Conflict);
    });

    it("should handle undefined details", () => {
      // Act
      const error = AppError.conflict("Conflict", undefined);

      // Assert
      expect(error.message).toBe("Conflict");
      expect(error.details).toBeUndefined();
    });
  });
});

// End of unit tests for: AppError.conflict
