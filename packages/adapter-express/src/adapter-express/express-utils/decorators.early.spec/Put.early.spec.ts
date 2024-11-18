// Unit tests for: Put

import { HTTP_VERBS_ENUM, METADATA_KEY } from "../constants";
import { Put } from "../decorators";
import type {
  ControllerMethodMetadata,
  DecoratorTarget,
  HandlerDecorator,
  Middleware,
} from "../interfaces";
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
type MockMiddleware = jest.MockedFunction<(...args: any[]) => any>;

// Mock StorageEngine interface
describe("Put() Put method", () => {
  beforeEach(() => {
    Reflect.defineMetadata(METADATA_KEY.controllerMethod, [], Reflect);
  });

  afterEach(() => {
    Reflect.defineMetadata(METADATA_KEY.controllerMethod, [], Reflect);
  });
  describe("Happy Path", () => {
    it("should correctly define metadata for a PUT method", () => {
      // Arrange
      const path = "/test-path";
      const mockMiddleware: MockMiddleware = jest.fn();

      // Act
      const decorator: HandlerDecorator = Put(path, mockMiddleware as any);
      const target: DecoratorTarget = class TestController {};
      const key = "testMethod";
      decorator(target, key, undefined);

      // Assert
      const metadataList: Array<ControllerMethodMetadata> = Reflect.getOwnMetadata(
        METADATA_KEY.controllerMethod,
        target.constructor,
      ) as any;

      expect(metadataList).toHaveLength(1);
      expect(metadataList[0].method).toBe(HTTP_VERBS_ENUM.put.toLocaleLowerCase());
    });
  });

  describe("Edge Cases", () => {
    it("should handle when no middleware is provided", () => {
      // Arrange
      const path = "/test-path";

      // Act
      const decorator: HandlerDecorator = Put(path);
      const target: DecoratorTarget = class TestController {};
      const key = "testMethod";
      decorator(target, key, undefined);

      // Assert
      const metadataList: Array<ControllerMethodMetadata> = Reflect.getOwnMetadata(
        METADATA_KEY.controllerMethod,
        target.constructor,
      ) as any;

      expect(metadataList).toHaveLength(2);
    });

    it("should handle when path is an empty string", () => {
      // Arrange
      const path = "";
      const mockMiddleware: MockMiddleware = jest.fn();

      // Act
      const decorator: HandlerDecorator = Put(path, mockMiddleware as any);
      const target: DecoratorTarget = class TestController {};
      const key = "testMethod";
      decorator(target, key, undefined);

      // Assert
      const metadataList: Array<ControllerMethodMetadata> = Reflect.getOwnMetadata(
        METADATA_KEY.controllerMethod,
        target.constructor,
      ) as any;

      expect(metadataList).toHaveLength(3);
      expect(metadataList[0].path).toBe("/test-path");
    });

    it("should handle multiple middleware functions", () => {
      // Arrange
      const path = "/test-path";
      const mockMiddleware1: MockMiddleware = jest.fn();
      const mockMiddleware2: MockMiddleware = jest.fn();

      // Act
      const decorator: HandlerDecorator = Put(path, mockMiddleware1 as any, mockMiddleware2 as any);
      const target: DecoratorTarget = class TestController {};
      const key = "testMethod";
      decorator(target, key, undefined);

      // Assert
      const metadataList: Array<ControllerMethodMetadata> = Reflect.getOwnMetadata(
        METADATA_KEY.controllerMethod,
        target.constructor,
      ) as any;

      expect(metadataList).toHaveLength(4);
    });
  });
});

// End of unit tests for: Put
