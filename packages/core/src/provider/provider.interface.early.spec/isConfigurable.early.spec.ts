// Unit tests for: isConfigurable

import { isConfigurable, IConfigurable } from "../provider.interface";

describe("isConfigurable() isConfigurable function", () => {
  describe("Happy Path", () => {
    it("should return true for object with configure method", () => {
      // Arrange
      const obj: IConfigurable = {
        configure: () => ({
          valid: true,
        }),
      };

      // Act
      const result = isConfigurable(obj);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should return false for null", () => {
      // Act
      const result = isConfigurable(null);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for undefined", () => {
      // Act
      const result = isConfigurable(undefined);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for object without configure", () => {
      // Arrange
      const obj = {};

      // Act
      const result = isConfigurable(obj);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for object with non-function configure", () => {
      // Arrange
      const obj = {
        configure: "not a function",
      };

      // Act
      const result = isConfigurable(obj);

      // Assert
      expect(result).toBe(false);
    });
  });
});

// End of unit tests for: isConfigurable
