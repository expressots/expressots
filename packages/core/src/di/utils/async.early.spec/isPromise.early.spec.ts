// Unit tests for: isPromise

import { isPromise } from "../async";

describe("isPromise() isPromise function", () => {
  describe("Happy Path", () => {
    it("should return true for Promise instance", () => {
      // Arrange
      const promise = Promise.resolve("value");

      // Act
      const result = isPromise(promise);

      // Assert
      expect(result).toBe(true);
    });

    it("should return true for Promise-like object", () => {
      // Arrange
      const promiseLike = {
        then: () => {},
      };

      // Act
      const result = isPromise(promiseLike);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should return false for null", () => {
      // Act
      const result = isPromise(null);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for undefined", () => {
      // Act
      const result = isPromise(undefined);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for plain object", () => {
      // Arrange
      const obj = {};

      // Act
      const result = isPromise(obj);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for string", () => {
      // Arrange
      const str = "test";

      // Act
      const result = isPromise(str);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for number", () => {
      // Arrange
      const num = 123;

      // Act
      const result = isPromise(num);

      // Assert
      expect(result).toBe(false);
    });
  });
});

// End of unit tests for: isPromise
