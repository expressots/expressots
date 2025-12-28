// Unit tests for: isPromiseOrContainsPromise

import { isPromiseOrContainsPromise } from "../async";

describe("isPromiseOrContainsPromise() isPromiseOrContainsPromise function", () => {
  describe("Happy Path", () => {
    it("should return true for Promise instance", () => {
      // Arrange
      const promise = Promise.resolve("value");

      // Act
      const result = isPromiseOrContainsPromise(promise);

      // Assert
      expect(result).toBe(true);
    });

    it("should return true for array containing Promise", () => {
      // Arrange
      const array = [1, Promise.resolve("value"), "test"];

      // Act
      const result = isPromiseOrContainsPromise(array);

      // Assert
      expect(result).toBe(true);
    });

    it("should return false for array without Promise", () => {
      // Arrange
      const array = [1, "test", {}];

      // Act
      const result = isPromiseOrContainsPromise(array);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should return false for empty array", () => {
      // Arrange
      const array: Array<unknown> = [];

      // Act
      const result = isPromiseOrContainsPromise(array);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for null", () => {
      // Act
      const result = isPromiseOrContainsPromise(null);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for undefined", () => {
      // Act
      const result = isPromiseOrContainsPromise(undefined);

      // Assert
      expect(result).toBe(false);
    });
  });
});

// End of unit tests for: isPromiseOrContainsPromise

