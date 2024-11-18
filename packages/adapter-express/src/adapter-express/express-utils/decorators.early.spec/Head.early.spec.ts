// Unit tests for: Head

import { METADATA_KEY } from "../constants";
import { Head } from "../decorators";
import type { ControllerMethodMetadata, DecoratorTarget, HandlerDecorator } from "../interfaces";
import "reflect-metadata";

// Mocking the necessary dependencies
jest.mock("../resolver-multer", () => {
  const actual = jest.requireActual("../resolver-multer");
  return {
    ...actual,
    packageResolver: jest.fn(),
  };
});

// Mocking express dependencies
jest.mock("express", () => ({
  Request: jest.fn(),
  Response: jest.fn(),
  NextFunction: jest.fn(),
}));

// Mock types
type MockMiddleware = jest.Mock;
describe("Head() Head method", () => {
  describe("Happy Path", () => {
    it("should create a HEAD method decorator with the correct metadata", () => {
      // Arrange
      const path = "/test";
      const mockMiddleware: MockMiddleware = jest.fn();

      // Act
      const decorator: HandlerDecorator = Head(path, mockMiddleware as any);
      const target: DecoratorTarget = {};
      const key = "testMethod";
      decorator(target, key, {});

      // Assert
      const metadataList: Array<ControllerMethodMetadata> = Reflect.getOwnMetadata(
        METADATA_KEY.controllerMethod,
        target.constructor,
      ) as Array<ControllerMethodMetadata>;

      expect(metadataList).toHaveLength(1);
      expect(metadataList[0]).toEqual({
        key,
        method: "head",
        middleware: [mockMiddleware],
        path,
        target,
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle an empty path gracefully", () => {
      // Arrange
      const path = "";
      const mockMiddleware: MockMiddleware = jest.fn();

      // Act
      const decorator: HandlerDecorator = Head(path, mockMiddleware as any);
      const target: DecoratorTarget = {};
      const key = "testMethod";
      decorator(target, key, {});

      // Assert
      const metadataList: Array<ControllerMethodMetadata> = Reflect.getOwnMetadata(
        METADATA_KEY.controllerMethod,
        target.constructor,
      ) as Array<ControllerMethodMetadata>;

      expect(metadataList).toHaveLength(2);
      expect(metadataList[0].path).toBe("/test");
    });

    it("should handle multiple middlewares", () => {
      // Arrange
      const path = "/test";
      const mockMiddleware1: MockMiddleware = jest.fn();
      const mockMiddleware2: MockMiddleware = jest.fn();

      // Act
      const decorator: HandlerDecorator = Head(
        path,
        mockMiddleware1 as any,
        mockMiddleware2 as any,
      );
      const target: DecoratorTarget = {};
      const key = "testMethod";
      decorator(target, key, {});

      // Assert
      const metadataList: Array<ControllerMethodMetadata> = Reflect.getOwnMetadata(
        METADATA_KEY.controllerMethod,
        target.constructor,
      ) as Array<ControllerMethodMetadata>;

      expect(metadataList).toHaveLength(3);
      expect(metadataList[0].path).toBe(path);
    });
  });
});

// End of unit tests for: Head
