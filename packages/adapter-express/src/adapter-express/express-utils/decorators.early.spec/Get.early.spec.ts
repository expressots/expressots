// Unit tests for: Get

import { NextFunction, Request, Response } from "express";
import { METADATA_KEY } from "../constants";
import { Get } from "../decorators";
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
  Request: jest.fn(),
  Response: jest.fn(),
  NextFunction: jest.fn(),
}));

// Mock Middleware type
type MockMiddleware = jest.MockedFunction<
  (req: Request, res: Response, next: NextFunction) => void
>;

// Mock StorageEngine interface
describe("Get() Get method", () => {
  let mockMiddleware: MockMiddleware;
  let mockTarget: DecoratorTarget;
  let mockKey: string;

  beforeEach(() => {
    mockMiddleware = jest.fn() as any;
    mockTarget = {} as any;
    mockKey = "testKey";
  });

  describe("Happy Path", () => {
    it("should define metadata for a GET method", () => {
      // Arrange
      const path = "/test-path";
      const decorator: HandlerDecorator = Get(path, mockMiddleware);

      // Act
      decorator(mockTarget, mockKey, undefined);

      // Assert
      const metadataList: Array<ControllerMethodMetadata> = Reflect.getOwnMetadata(
        METADATA_KEY.controllerMethod,
        mockTarget.constructor,
      ) as any;

      expect(metadataList).toHaveLength(1);
      expect(metadataList[0]).toEqual({
        key: mockKey,
        method: "get",
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
      const decorator: HandlerDecorator = Get(path);

      // Act
      decorator(mockTarget, mockKey, undefined);

      // Assert
      const metadataList: Array<ControllerMethodMetadata> = Reflect.getOwnMetadata(
        METADATA_KEY.controllerMethod,
        mockTarget.constructor,
      ) as any;

      expect(metadataList).toHaveLength(2);
    });

    it("should handle when path is an empty string", () => {
      // Arrange
      const path = "";
      const decorator: HandlerDecorator = Get(path, mockMiddleware);

      // Act
      decorator(mockTarget, mockKey, undefined);

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

// End of unit tests for: Get
