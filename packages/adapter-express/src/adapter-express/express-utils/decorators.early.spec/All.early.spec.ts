// Unit tests for: All

import "reflect-metadata";

import { METADATA_KEY } from "../constants";
import { All } from "../decorators";
import type { ControllerMethodMetadata, DecoratorTarget, HandlerDecorator } from "../interfaces";

// Mocking the packageResolver function
jest.mock("../resolver-multer", () => {
  const actual = jest.requireActual("../resolver-multer");
  return {
    ...actual,
    packageResolver: jest.fn(),
  };
});

// Mocking the Reflect metadata functions
jest.spyOn(Reflect, "getOwnMetadata").mockImplementation(() => ({}));
jest.spyOn(Reflect, "defineMetadata").mockImplementation(() => {});

describe("All() All method", () => {
  describe("Happy Path", () => {
    it("should create a handler decorator for all HTTP methods", () => {
      // Arrange
      const path = "/test-path";
      const mockMiddleware: Array<MockMiddleware> = [jest.fn() as any];

      // Act
      const result: HandlerDecorator = All(path, ...mockMiddleware);

      // Assert
      expect(result).toBeInstanceOf(Function);
      const target: DecoratorTarget = {} as any;
      const key = "testKey";
      result(target, key, {});

      const expectedMetadata: ControllerMethodMetadata = {
        key,
        method: "all",
        middleware: mockMiddleware,
        path,
        target,
      };

      expect(Reflect.defineMetadata).toHaveBeenCalledWith(
        METADATA_KEY.controllerMethod,
        expect.arrayContaining([expectedMetadata]),
        target.constructor,
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty middleware array gracefully", () => {
      // Arrange
      const path = "/test-path";

      // Act
      const result: HandlerDecorator = All(path);

      // Assert
      expect(result).toBeInstanceOf(Function);
      const target: DecoratorTarget = {} as any;
      const key = "testKey";
      result(target, key, {});

      const expectedMetadata: ControllerMethodMetadata = {
        key,
        method: "all",
        middleware: [],
        path,
        target,
      };

      expect(Reflect.defineMetadata).toHaveBeenCalledWith(
        METADATA_KEY.controllerMethod,
        expect.arrayContaining([expectedMetadata]),
        target.constructor,
      );
    });

    it("should handle undefined path gracefully", () => {
      // Arrange
      const path = undefined as any;
      const mockMiddleware: Array<MockMiddleware> = [jest.fn() as any];

      // Act
      const result: HandlerDecorator = All(path, ...mockMiddleware);

      // Assert
      expect(result).toBeInstanceOf(Function);
      const target: DecoratorTarget = {} as any;
      const key = "testKey";
      result(target, key, {});

      const expectedMetadata: ControllerMethodMetadata = {
        key,
        method: "all",
        middleware: mockMiddleware,
        path,
        target,
      };

      expect(Reflect.defineMetadata).toHaveBeenCalledWith(
        METADATA_KEY.controllerMethod,
        expect.arrayContaining([expectedMetadata]),
        target.constructor,
      );
    });
  });
});

// Mock types
type MockMiddleware = jest.Mock;

// End of unit tests for: All
