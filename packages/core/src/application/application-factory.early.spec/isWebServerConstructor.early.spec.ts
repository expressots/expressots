// Unit tests for: isWebServerConstructor

import { IWebServer } from "@expressots/shared";
import { isWebServerConstructor } from "../application-factory";

describe("isWebServerConstructor() isWebServerConstructor type guard", () => {
  class MockWebServer implements IWebServer {
    getHttpServer(): Promise<any> {
      return Promise.resolve({});
    }

    listen(): Promise<any> {
      return Promise.resolve({});
    }

    initEnvironment(): Promise<void> {
      return Promise.resolve();
    }

    setEngine(): Promise<void> {
      return Promise.resolve();
    }
  }

  describe("Happy Path", () => {
    it("should return true for a valid constructor function", () => {
      // Act
      const result = isWebServerConstructor(MockWebServer);

      // Assert
      expect(result).toBe(true);
    });

    it("should return true for an arrow function", () => {
      // Arrange
      const arrowFunction = () => {};

      // Act
      const result = isWebServerConstructor(arrowFunction);

      // Assert
      expect(result).toBe(true);
    });

    it("should return true for a regular function", () => {
      // Arrange
      function regularFunction() {}

      // Act
      const result = isWebServerConstructor(regularFunction);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should return false for null", () => {
      // Act
      const result = isWebServerConstructor(null);

      // Assert
      // The function returns the falsy value (null) when input is null
      expect(result).toBeFalsy();
    });

    it("should return false for undefined", () => {
      // Act
      const result = isWebServerConstructor(undefined);

      // Assert
      // The function returns the falsy value (undefined) when input is undefined
      expect(result).toBeFalsy();
    });

    it("should return false for an object", () => {
      // Arrange
      const obj = {};

      // Act
      const result = isWebServerConstructor(obj);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for a string", () => {
      // Arrange
      const str = "not a function";

      // Act
      const result = isWebServerConstructor(str);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for a number", () => {
      // Arrange
      const num = 123;

      // Act
      const result = isWebServerConstructor(num);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for an array", () => {
      // Arrange
      const arr: Array<any> = [];

      // Act
      const result = isWebServerConstructor(arr);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for boolean true", () => {
      // Act
      const result = isWebServerConstructor(true);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for boolean false", () => {
      // Act
      const result = isWebServerConstructor(false);

      // Assert
      expect(result).toBe(false);
    });
  });
});

// End of unit tests for: isWebServerConstructor
