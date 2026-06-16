// Unit tests for: isClonable

import { isClonable } from "../clonable";
import { interfaces } from "../../interfaces/interfaces";

describe("isClonable() isClonable function", () => {
  describe("Happy Path", () => {
    it("should return true for object with clone method", () => {
      // Arrange
      const clonable: interfaces.Clonable<unknown> = {
        clone: () => ({}),
      };

      // Act
      const result = isClonable(clonable);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should return false for null", () => {
      // Act
      const result = isClonable(null);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for undefined", () => {
      // Act
      const result = isClonable(undefined);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for plain object without clone", () => {
      // Arrange
      const obj = {};

      // Act
      const result = isClonable(obj);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for object with non-function clone", () => {
      // Arrange
      const obj = {
        clone: "not a function",
      };

      // Act
      const result = isClonable(obj);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for string", () => {
      // Arrange
      const str = "test";

      // Act
      const result = isClonable(str);

      // Assert
      expect(result).toBe(false);
    });
  });
});

// End of unit tests for: isClonable
