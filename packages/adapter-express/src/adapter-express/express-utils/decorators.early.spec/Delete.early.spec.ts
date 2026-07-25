// Unit tests for: Delete

import "reflect-metadata";

import { METADATA_KEY } from "../constants";
import { Delete } from "../decorators";
import type { ControllerMethodMetadata, DecoratorTarget } from "../interfaces";

// Mocking the packageResolver function
jest.mock("../resolver-multer", () => {
  const actual = jest.requireActual("../resolver-multer");
  return {
    ...actual,
    packageResolver: jest.fn(),
  };
});

// Mocking express Request, Response, and NextFunction
jest.mock("express", () => ({
  Request: jest.fn(),
  Response: jest.fn(),
  NextFunction: jest.fn(),
}));

// Mock Middleware type
type MockMiddleware = jest.Mock;

// Mock StorageEngine interface
describe("Delete() Delete method", () => {
  let mockTarget: DecoratorTarget;
  let mockKey: string;
  let mockMiddleware: MockMiddleware;

  beforeEach(() => {
    mockTarget = {} as any;
    mockKey = "testKey";
    mockMiddleware = jest.fn() as any;
  });

  describe("Happy Path", () => {
    it("should define metadata for DELETE method", () => {
      // Arrange
      const path = "/test-path";

      // Act
      const decorator = Delete(path, mockMiddleware);
      decorator(mockTarget, mockKey, {});

      // Assert
      const metadataList: Array<ControllerMethodMetadata> = Reflect.getOwnMetadata(
        METADATA_KEY.controllerMethod,
        mockTarget.constructor,
      ) as any;

      expect(metadataList).toHaveLength(1);
      expect(metadataList[0]).toEqual({
        key: mockKey,
        method: "delete",
        middleware: [expect.any(Function), mockMiddleware],
        path,
        target: mockTarget,
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle when no middleware is provided", () => {
      // Arrange
      const path = "/test-path";

      // Act
      const decorator = Delete(path);
      decorator(mockTarget, mockKey, {});

      // Assert
      const metadataList: Array<ControllerMethodMetadata> = Reflect.getOwnMetadata(
        METADATA_KEY.controllerMethod,
        mockTarget.constructor,
      ) as any;

      expect(metadataList).toHaveLength(2);
      expect(metadataList[0].path).toBe(path);
    });

    it("should handle when path is an empty string", () => {
      // Arrange
      const path = "";

      // Act
      const decorator = Delete(path, mockMiddleware);
      decorator(mockTarget, mockKey, {});

      // Assert
      const metadataList: Array<ControllerMethodMetadata> = Reflect.getOwnMetadata(
        METADATA_KEY.controllerMethod,
        mockTarget.constructor,
      ) as any;

      expect(metadataList).toHaveLength(3);
      expect(metadataList[0].path).toBe("/test-path");
    });
  });
});

// End of unit tests for: Delete
