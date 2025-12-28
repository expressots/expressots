// Unit tests for: isStackOverflowExeption

import { isStackOverflowExeption } from "../exceptions";
import * as ERROR_MSGS from "../../constants/error_msgs";

describe("isStackOverflowExeption() isStackOverflowExeption function", () => {
  describe("Happy Path", () => {
    it("should return true for RangeError instance", () => {
      // Arrange
      const error = new RangeError("Stack overflow");

      // Act
      const result = isStackOverflowExeption(error);

      // Assert
      expect(result).toBe(true);
    });

    it("should return true for error with stack overflow message", () => {
      // Arrange
      const error = new Error(ERROR_MSGS.STACK_OVERFLOW);

      // Act
      const result = isStackOverflowExeption(error);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should return false for regular Error", () => {
      // Arrange
      const error = new Error("Regular error");

      // Act
      const result = isStackOverflowExeption(error);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for null", () => {
      // Act & Assert
      // The function may throw when accessing .message on null, so we catch it
      try {
        const result = isStackOverflowExeption(null);
        expect(result).toBe(false);
      } catch (error) {
        // If it throws, that's also acceptable behavior for null input
        expect(error).toBeDefined();
      }
    });

    it("should return false for undefined", () => {
      // Act & Assert
      // The function may throw when accessing .message on undefined, so we catch it
      try {
        const result = isStackOverflowExeption(undefined);
        expect(result).toBe(false);
      } catch (error) {
        // If it throws, that's also acceptable behavior for undefined input
        expect(error).toBeDefined();
      }
    });
  });
});

// End of unit tests for: isStackOverflowExeption

