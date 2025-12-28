// Unit tests for: AppError.unauthorized

import { AppError } from "../app-error";
import { StatusCode } from "../status-code";

describe("AppError.unauthorized() unauthorized static method", () => {
  describe("Happy Path", () => {
    it("should create Unauthorized error with default message", () => {
      // Act
      const error = AppError.unauthorized();

      // Assert
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe("Unauthorized");
      expect(error.statusCode).toBe(StatusCode.Unauthorized);
      expect(error.type).toBe("https://expressots.dev/errors/unauthorized");
    });

    it("should create Unauthorized error with custom message", () => {
      // Act
      const error = AppError.unauthorized("Invalid credentials");

      // Assert
      expect(error.message).toBe("Invalid credentials");
      expect(error.statusCode).toBe(StatusCode.Unauthorized);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty message", () => {
      // Act
      const error = AppError.unauthorized("");

      // Assert
      expect(error.message).toBe("");
      expect(error.statusCode).toBe(StatusCode.Unauthorized);
    });
  });
});

// End of unit tests for: AppError.unauthorized

