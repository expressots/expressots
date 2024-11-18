// Unit tests for: Patch

import { Request } from "express";
import { METADATA_KEY } from "../constants";
import { Patch } from "../decorators";
import type { ControllerMethodMetadata, DecoratorTarget } from "../interfaces";
import "reflect-metadata";

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
type MockMiddleware = jest.MockedFunction<(...args: any[]) => void>;

// Mock StorageEngine interface
// Mock MulterFile interface
describe("Patch() Patch method", () => {
  describe("Happy path", () => {
    it("should define metadata for a PATCH method", () => {
      // Arrange
      const path = "/test";
      const middleware: MockMiddleware[] = [jest.fn(), jest.fn().mockName("mockConstructor")];
      const target: DecoratorTarget = class {};
      const key = "testMethod";

      // Act
      const decorator = Patch(path, ...(middleware as any));
      decorator(target, key, Reflect.getMetadata("design:value", target, key));

      // Assert
      const metadataList: ControllerMethodMetadata[] = Reflect.getOwnMetadata(
        METADATA_KEY.controllerMethod,
        target.constructor,
      );
      expect(metadataList).toHaveLength(1);
      expect(metadataList[0].method).toBe("patch");
    });
  });

  describe("Edge cases", () => {
    it("should handle when no middleware is provided", () => {
      // Arrange
      const path = "/test";
      const target: DecoratorTarget = class {};
      const key = "testMethod";

      // Act
      const decorator = Patch(path);
      decorator(target, key, Reflect.getMetadata("design:value", target, key));

      // Assert
      const metadataList: ControllerMethodMetadata[] = Reflect.getOwnMetadata(
        METADATA_KEY.controllerMethod,
        target.constructor,
      );
      expect(metadataList).toHaveLength(2);
      expect(metadataList[0].path).toBe("/test");
    });

    it("should handle when path is an empty string", () => {
      // Arrange
      const path = "";
      const middleware: MockMiddleware[] = [jest.fn()];
      const target: DecoratorTarget = class {};
      const key = "testMethod";

      // Act
      const decorator = Patch(path, ...(middleware as any));
      decorator(target, key, Reflect.getMetadata("design:value", target, key));

      // Assert
      const metadataList: ControllerMethodMetadata[] = Reflect.getOwnMetadata(
        METADATA_KEY.controllerMethod,
        target.constructor,
      );
      expect(metadataList).toHaveLength(3);
      expect(metadataList[0].path).toBe("/test");
    });

    it("should handle when target is undefined", () => {
      // Arrange
      const path = "/test";
      const middleware: MockMiddleware[] = [jest.fn()];
      const key = "testMethod";

      // Act & Assert
      expect(() => {
        const decorator = Patch(path, ...(middleware as any));
        decorator(undefined as any, key, Reflect.getMetadata("design:value", undefined, key));
      }).toThrow();
    });
  });
});

// End of unit tests for: Patch
