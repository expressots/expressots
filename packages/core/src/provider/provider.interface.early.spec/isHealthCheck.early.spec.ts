// Unit tests for: isHealthCheck

import { isHealthCheck, IHealthCheck } from "../provider.interface";

describe("isHealthCheck() isHealthCheck function", () => {
  describe("Happy Path", () => {
    it("should return true for object with healthCheck method", () => {
      // Arrange
      const obj: IHealthCheck = {
        healthCheck: () => ({
          status: "healthy",
        }),
      };

      // Act
      const result = isHealthCheck(obj);

      // Assert
      expect(result).toBe(true);
    });

    it("should return true for object with async healthCheck method", () => {
      // Arrange
      const obj: IHealthCheck = {
        healthCheck: async () => ({
          status: "healthy",
        }),
      };

      // Act
      const result = isHealthCheck(obj);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should return false for null", () => {
      // Act
      const result = isHealthCheck(null);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for undefined", () => {
      // Act
      const result = isHealthCheck(undefined);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for object without healthCheck", () => {
      // Arrange
      const obj = {};

      // Act
      const result = isHealthCheck(obj);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for object with non-function healthCheck", () => {
      // Arrange
      const obj = {
        healthCheck: "not a function",
      };

      // Act
      const result = isHealthCheck(obj);

      // Assert
      expect(result).toBe(false);
    });
  });
});

// End of unit tests for: isHealthCheck

