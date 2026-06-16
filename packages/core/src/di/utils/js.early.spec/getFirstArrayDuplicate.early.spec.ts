// Unit tests for: getFirstArrayDuplicate

import { getFirstArrayDuplicate } from "../js";

describe("getFirstArrayDuplicate() getFirstArrayDuplicate function", () => {
  describe("Happy Path", () => {
    it("should return first duplicate value", () => {
      // Arrange
      const array = [1, 2, 3, 2, 4];

      // Act
      const result = getFirstArrayDuplicate(array);

      // Assert
      expect(result).toBe(2);
    });

    it("should return undefined when no duplicates", () => {
      // Arrange
      const array = [1, 2, 3, 4, 5];

      // Act
      const result = getFirstArrayDuplicate(array);

      // Assert
      expect(result).toBeUndefined();
    });

    it("should return first duplicate even if multiple duplicates exist", () => {
      // Arrange
      const array = [1, 2, 3, 2, 3, 4];

      // Act
      const result = getFirstArrayDuplicate(array);

      // Assert
      expect(result).toBe(2);
    });
  });

  describe("Edge Cases", () => {
    it("should return undefined for empty array", () => {
      // Arrange
      const array: Array<unknown> = [];

      // Act
      const result = getFirstArrayDuplicate(array);

      // Assert
      expect(result).toBeUndefined();
    });

    it("should handle string duplicates", () => {
      // Arrange
      const array = ["a", "b", "a", "c"];

      // Act
      const result = getFirstArrayDuplicate(array);

      // Assert
      expect(result).toBe("a");
    });

    it("should handle object duplicates (by reference)", () => {
      // Arrange
      const obj = {};
      const array = [obj, {}, obj];

      // Act
      const result = getFirstArrayDuplicate(array);

      // Assert
      expect(result).toBe(obj);
    });
  });
});

// End of unit tests for: getFirstArrayDuplicate
