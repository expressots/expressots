// Unit tests for: tryAndThrowErrorIfStackOverflow

import {
  tryAndThrowErrorIfStackOverflow,
  isStackOverflowExeption,
} from "../exceptions";
import * as ERROR_MSGS from "../../constants/error_msgs";

describe("tryAndThrowErrorIfStackOverflow() tryAndThrowErrorIfStackOverflow function", () => {
  describe("Happy Path", () => {
    it("should return result when function succeeds", () => {
      // Arrange
      const fn = () => "success";

      // Act
      const result = tryAndThrowErrorIfStackOverflow(fn, () => new Error("Custom"));

      // Assert
      expect(result).toBe("success");
    });

    it("should throw custom error for stack overflow", () => {
      // Arrange
      const stackOverflowError = new RangeError(ERROR_MSGS.STACK_OVERFLOW);
      const fn = () => {
        throw stackOverflowError;
      };
      const customError = new Error("Custom stack overflow error");

      // Act & Assert
      expect(() =>
        tryAndThrowErrorIfStackOverflow(fn, () => customError),
      ).toThrow("Custom stack overflow error");
    });

    it("should throw original error for non-stack-overflow errors", () => {
      // Arrange
      const regularError = new Error("Regular error");
      const fn = () => {
        throw regularError;
      };

      // Act & Assert
      expect(() =>
        tryAndThrowErrorIfStackOverflow(fn, () => new Error("Custom")),
      ).toThrow("Regular error");
    });
  });
});

// End of unit tests for: tryAndThrowErrorIfStackOverflow

