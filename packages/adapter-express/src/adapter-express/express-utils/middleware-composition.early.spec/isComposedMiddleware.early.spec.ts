// Unit tests for: isComposedMiddleware

import { combine, sequence, isComposedMiddleware } from "../middleware-composition";

describe("isComposedMiddleware() type guard", () => {
  let mockMiddleware: jest.Mock;

  beforeEach(() => {
    mockMiddleware = jest.fn();
  });

  describe("Happy Path", () => {
    it("should return true for combine() result", () => {
      // Arrange
      const composed = combine(mockMiddleware);

      // Act
      const result = isComposedMiddleware(composed);

      // Assert
      expect(result).toBe(true);
    });

    it("should return true for sequence() result", () => {
      // Arrange
      const composed = sequence(mockMiddleware);

      // Act
      const result = isComposedMiddleware(composed);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should return false for null", () => {
      // Act
      const result = isComposedMiddleware(null);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for undefined", () => {
      // Act
      const result = isComposedMiddleware(undefined);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for plain object", () => {
      // Arrange
      const plainObject = { middleware: [], type: "combine" };

      // Act
      const result = isComposedMiddleware(plainObject);

      // Assert
      // Should return false because it doesn't have the proper structure
      expect(result).toBe(false);
    });

    it("should return false for object with wrong type", () => {
      // Arrange
      const wrongObject = {
        middleware: [mockMiddleware],
        type: "invalid",
      };

      // Act
      const result = isComposedMiddleware(wrongObject);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for object without middleware array", () => {
      // Arrange
      const wrongObject = {
        type: "combine",
      };

      // Act
      const result = isComposedMiddleware(wrongObject);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for string", () => {
      // Act
      const result = isComposedMiddleware("not middleware");

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for number", () => {
      // Act
      const result = isComposedMiddleware(123);

      // Assert
      expect(result).toBe(false);
    });
  });
});

// End of unit tests for: isComposedMiddleware
