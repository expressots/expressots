// Unit tests for: AppError.notFound

import { AppError } from "../app-error";
import { StatusCode } from "../status-code";

describe("AppError.notFound() notFound static method", () => {
  describe("Happy Path", () => {
    it("should create NotFound error with resource name", () => {
      // Act
      const error = AppError.notFound("User");

      // Assert
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe("User not found");
      expect(error.statusCode).toBe(StatusCode.NotFound);
      expect(error.type).toBe("https://expressots.dev/errors/not-found");
      expect(error.details).toEqual({ resource: "User", id: undefined });
    });

    it("should create NotFound error with resource name and id", () => {
      // Act
      const error = AppError.notFound("User", "123");

      // Assert
      expect(error.message).toBe("User with id 123 not found");
      expect(error.statusCode).toBe(StatusCode.NotFound);
      expect(error.details).toEqual({ resource: "User", id: "123" });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty resource name", () => {
      // Act
      const error = AppError.notFound("");

      // Assert
      expect(error.message).toBe(" not found");
      expect(error.statusCode).toBe(StatusCode.NotFound);
    });

    it("should handle undefined id", () => {
      // Act
      const error = AppError.notFound("User", undefined);

      // Assert
      expect(error.message).toBe("User not found");
      expect(error.details).toEqual({ resource: "User", id: undefined });
    });
  });
});

// End of unit tests for: AppError.notFound

