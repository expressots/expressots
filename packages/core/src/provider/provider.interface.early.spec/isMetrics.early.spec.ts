// Unit tests for: isMetrics

import { isMetrics, IMetrics } from "../provider.interface";

describe("isMetrics() isMetrics function", () => {
  describe("Happy Path", () => {
    it("should return true for object with getMetrics method", () => {
      // Arrange
      const obj: IMetrics = {
        getMetrics: () => ({
          count: 10,
        }),
      };

      // Act
      const result = isMetrics(obj);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should return false for null", () => {
      // Act
      const result = isMetrics(null);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for undefined", () => {
      // Act
      const result = isMetrics(undefined);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for object without getMetrics", () => {
      // Arrange
      const obj = {};

      // Act
      const result = isMetrics(obj);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for object with non-function getMetrics", () => {
      // Arrange
      const obj = {
        getMetrics: "not a function",
      };

      // Act
      const result = isMetrics(obj);

      // Assert
      expect(result).toBe(false);
    });
  });
});

// End of unit tests for: isMetrics

