// Unit tests for: AppError.forbidden

import { AppError } from "../app-error";
import { StatusCode } from "../status-code";

describe("AppError.forbidden() forbidden static method", () => {
  describe("Happy Path", () => {
    it("should create Forbidden error with default message", () => {
      // Act
      const error = AppError.forbidden();

      // Assert
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe("Forbidden");
      expect(error.statusCode).toBe(StatusCode.Forbidden);
      expect(error.type).toBe("https://expressots.dev/errors/forbidden");
    });

    it("should create Forbidden error with custom message", () => {
      // Act
      const error = AppError.forbidden("Access denied");

      // Assert
      expect(error.message).toBe("Access denied");
      expect(error.statusCode).toBe(StatusCode.Forbidden);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty message", () => {
      // Act
      const error = AppError.forbidden("");

      // Assert
      expect(error.message).toBe("");
      expect(error.statusCode).toBe(StatusCode.Forbidden);
    });
  });
});

// End of unit tests for: AppError.forbidden
