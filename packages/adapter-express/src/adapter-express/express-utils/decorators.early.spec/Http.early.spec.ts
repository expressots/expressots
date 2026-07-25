// Unit tests for: Http

import { HTTP_CODE_METADATA } from "../constants";
import { Http } from "../decorators";
import "reflect-metadata";

// Mocking the necessary modules and functions
jest.mock("../resolver-multer", () => {
  const actual = jest.requireActual("../resolver-multer");
  return {
    ...actual,
    // Mock specific functions if needed
  };
});

// Mocking express dependencies
jest.mock("express", () => ({
  Request: jest.fn(),
  Response: jest.fn(),
  NextFunction: jest.fn(),
}));

// Test suite for the Http function
describe("Http() Http method", () => {
  // Happy path tests
  describe("Happy Path", () => {
    it("should define metadata with the correct status code", () => {
      // Arrange
      const target = {};
      const key = "testMethod";
      const descriptor = {} as TypedPropertyDescriptor<any>;
      const code = 200;

      // Act
      Http(code)(target, key, descriptor);

      // Assert
      const metadata = Reflect.getOwnMetadata(HTTP_CODE_METADATA.statusCode, Reflect);
      expect(metadata[key]).toBe(code);
    });
  });

  // Edge case tests
  describe("Edge Cases", () => {
    it("should handle when no metadata exists initially", () => {
      // Arrange
      const target = {};
      const key = "newMethod";
      const descriptor = {} as TypedPropertyDescriptor<any>;
      const code = 404;

      // Act
      Http(code)(target, key, descriptor);

      // Assert
      const metadata = Reflect.getOwnMetadata(HTTP_CODE_METADATA.statusCode, Reflect);
      expect(metadata[key]).toBe(code);
    });

    it("should overwrite existing metadata for the same method", () => {
      // Arrange
      const target = {};
      const key = "existingMethod";
      const descriptor = {} as TypedPropertyDescriptor<any>;
      const initialCode = 200;
      const newCode = 500;

      // Act
      Http(initialCode)(target, key, descriptor);
      Http(newCode)(target, key, descriptor);

      // Assert
      const metadata = Reflect.getOwnMetadata(HTTP_CODE_METADATA.statusCode, Reflect);
      expect(metadata[key]).toBe(newCode);
    });
  });
});

// End of unit tests for: Http
