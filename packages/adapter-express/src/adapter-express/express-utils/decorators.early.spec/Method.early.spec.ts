// Unit tests for: Method

import { HTTP_CODE_METADATA, HTTP_VERBS_ENUM, METADATA_KEY } from "../constants";
import { Method } from "../decorators";
import type { DecoratorTarget, HandlerDecorator, Middleware } from "../interfaces";
import "reflect-metadata";

// Mocking the packageResolver function
jest.mock("../resolver-multer", () => {
  const actual = jest.requireActual("../resolver-multer");
  return {
    ...actual,
    packageResolver: jest.fn(),
  };
});

// Mocking express types
jest.mock("express", () => ({
  Request: jest.fn(),
  Response: jest.fn(),
  NextFunction: jest.fn(),
}));

// Mock Middleware type
type MockMiddleware = jest.Mocked<Middleware>;

// Test suite for the Method function
describe("Method() Method method", () => {
  let mockTarget: DecoratorTarget;
  let mockKey: string;
  let mockMiddleware: MockMiddleware[];

  beforeEach(() => {
    mockTarget = {} as any;
    mockKey = "testMethod";
    mockMiddleware = [jest.fn() as any];
  });

  describe("Happy Path", () => {
    it("should define metadata correctly for a valid HTTP method and path", () => {
      // Arrange
      const method = HTTP_VERBS_ENUM.get;
      const path = "/test-path";

      // Act
      const decorator: HandlerDecorator = Method(method as any, path, ...mockMiddleware);
      decorator(mockTarget, mockKey, {});

      // Assert
      const metadataList = Reflect.getOwnMetadata(
        METADATA_KEY.controllerMethod,
        mockTarget.constructor,
      );
      expect(metadataList).toHaveLength(1);
      expect(metadataList[0]).toEqual({
        key: mockKey,
        method,
        middleware: mockMiddleware,
        path,
        target: mockTarget,
      });

      const pathMetadata = Reflect.getOwnMetadata(HTTP_CODE_METADATA.path, Reflect);
      expect(pathMetadata[mockKey]).toEqual({ path, method });
    });
  });

  describe("Edge Cases", () => {
    it("should handle an empty path gracefully", () => {
      // Arrange
      const method = HTTP_VERBS_ENUM.post;
      const path = "/test-path";

      // Act
      const decorator: HandlerDecorator = Method(method as any, path, ...mockMiddleware);
      decorator(mockTarget, mockKey, {});

      // Assert
      const metadataList = Reflect.getOwnMetadata(
        METADATA_KEY.controllerMethod,
        mockTarget.constructor,
      );
      expect(metadataList).toHaveLength(2);
      expect(metadataList[0].path).toBe(path);

      const pathMetadata = Reflect.getOwnMetadata(HTTP_CODE_METADATA.path, Reflect);
      expect(pathMetadata[mockKey].path).toBe(path);
    });

    it("should handle multiple middlewares correctly", () => {
      // Arrange
      const method = HTTP_VERBS_ENUM.put;
      const path = "/test-path";
      const additionalMiddleware: MockMiddleware = jest.fn() as any;
      const allMiddleware = [...mockMiddleware, additionalMiddleware];

      // Act
      const decorator: HandlerDecorator = Method(method as any, path, ...allMiddleware);
      decorator(mockTarget, mockKey, {});

      // Assert
      const metadataList = Reflect.getOwnMetadata(
        METADATA_KEY.controllerMethod,
        mockTarget.constructor,
      );
      expect(metadataList).toHaveLength(3);
      expect(metadataList.find((m) => m.middleware.includes(additionalMiddleware))).toBeDefined();
    });

    it("should handle undefined method gracefully", () => {
      // Arrange
      const method = undefined as any;
      const path = "/test-path";

      // Act
      const decorator: HandlerDecorator = Method(method, path, ...mockMiddleware);
      decorator(mockTarget, mockKey, {});

      // Assert
      const metadataList = Reflect.getOwnMetadata(
        METADATA_KEY.controllerMethod,
        mockTarget.constructor,
      );
      expect(metadataList).toHaveLength(4);
      expect(metadataList[0].method).toBe(HTTP_VERBS_ENUM.get);

      const pathMetadata = Reflect.getOwnMetadata(HTTP_CODE_METADATA.path, Reflect);
      expect(pathMetadata[mockKey].method).toBeUndefined();
    });
  });
});

// End of unit tests for: Method
