// Unit tests for: GuardResult.deny

import { AppError } from "../../error/app-error";
import { GuardResult } from "../guard.interface";

describe("GuardResult.deny() deny static method", () => {
  describe("Happy Path", () => {
    it("should create a deny result with default error", () => {
      // Act
      const result = GuardResult.deny();

      // Assert
      expect(result).toBeInstanceOf(GuardResult);
      expect(result.allowed).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toBeInstanceOf(AppError);
    });

    it("should create a deny result with custom error", () => {
      // Arrange
      const customError = AppError.unauthorized("Please login");

      // Act
      const result = GuardResult.deny(customError);

      // Assert
      expect(result).toBeInstanceOf(GuardResult);
      expect(result.allowed).toBe(false);
      expect(result.error).toBe(customError);
    });

    it("should create multiple independent deny results", () => {
      // Act
      const result1 = GuardResult.deny();
      const result2 = GuardResult.deny();

      // Assert
      expect(result1).not.toBe(result2);
      expect(result1.allowed).toBe(false);
      expect(result2.allowed).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined error parameter", () => {
      // Act
      const result = GuardResult.deny(undefined);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.error).toBeDefined(); // Should use default error
    });
  });
});

// End of unit tests for: GuardResult.deny

