// Unit tests for: Post

import { HTTP_CODE_METADATA, METADATA_KEY } from "../constants";
import { Post } from "../decorators";
import type { ControllerMethodMetadata, DecoratorTarget, HandlerDecorator } from "../interfaces";
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
  RequestHandler: jest.fn(),
  Request: jest.fn(),
  Response: jest.fn(),
  NextFunction: jest.fn(),
}));

// Mock types for Middleware, StorageEngine, MulterFile, and MulterOptions
type MockMiddleware = jest.Mock;
describe("Post() Post method", () => {
  describe("Happy Path", () => {
    it("should create a POST method decorator with the correct metadata", () => {
      // Arrange
      const path = "/test";
      const mockMiddleware: MockMiddleware = jest.fn();

      // Act
      const decorator: HandlerDecorator = Post(path, mockMiddleware as any);
      const target: DecoratorTarget = {};
      const key = "testMethod";
      decorator(target, key, undefined);

      // Assert
      const metadataList: Array<ControllerMethodMetadata> = Reflect.getOwnMetadata(
        METADATA_KEY.controllerMethod,
        target.constructor,
      ) as Array<ControllerMethodMetadata>;

      expect(metadataList).toHaveLength(1);
      expect(metadataList[0]).toEqual({
        key,
        method: "post",
        middleware: [mockMiddleware],
        path,
        target,
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle when no middleware is provided", () => {
      // Arrange
      const path = "/test";

      // Act
      const decorator: HandlerDecorator = Post(path);
      const target: DecoratorTarget = {};
      const key = "testMethod";
      decorator(target, key, undefined);

      // Assert
      const metadataList: Array<ControllerMethodMetadata> = Reflect.getOwnMetadata(
        METADATA_KEY.controllerMethod,
        target.constructor,
      ) as Array<ControllerMethodMetadata>;

      expect(metadataList).toHaveLength(2);
      expect(metadataList[1]).toEqual({
        key,
        method: "post",
        middleware: [],
        path,
        target,
      });
    });

    it("should handle when path metadata already exists", () => {
      // Arrange
      const path = "/test";
      const mockMiddleware: MockMiddleware = jest.fn();
      const existingMetadata = {
        existingMethod: {
          path: "/existing",
          method: "get",
        },
      };
      Reflect.defineMetadata(HTTP_CODE_METADATA.path, existingMetadata, Reflect);

      // Act
      const decorator: HandlerDecorator = Post(path, mockMiddleware as any);
      const target: DecoratorTarget = {};
      const key = "testMethod";
      decorator(target, key, undefined);

      // Assert
      const pathMetadata = Reflect.getOwnMetadata(HTTP_CODE_METADATA.path, Reflect);
      expect(pathMetadata).toEqual({
        ...existingMetadata,
        [key]: {
          path,
          method: "post",
        },
      });
    });
  });
});

// End of unit tests for: Post
