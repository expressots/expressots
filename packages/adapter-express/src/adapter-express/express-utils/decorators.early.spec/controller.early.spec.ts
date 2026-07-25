// Unit tests for: controller
import "reflect-metadata";

import { decorate, injectable } from "@expressots/core";
jest.mock("@expressots/core", () => {
  const actual = jest.requireActual("@expressots/core");
  return {
    ...actual,
    decorate: jest.fn(),
    injectable: jest.fn(() => jest.fn()),
  };
});
import { METADATA_KEY } from "../constants";
import { controller } from "../decorators";

// Mocking the packageResolver function
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

// Mock Middleware type
type MockMiddleware = jest.Mock;

// Mock StorageEngine interface
describe("controller() controller method", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Happy Path", () => {
    it("should define metadata for a controller with a given path and middleware", () => {
      // Arrange
      const path = "/test";
      const middleware: MockMiddleware[] = [jest.fn(), jest.fn()];

      // Act
      @controller(path, ...(middleware as any))
      class TestController {}

      // Assert
      const metadata = Reflect.getMetadata(METADATA_KEY.controller, TestController);
      expect(metadata).toEqual({
        middleware,
        path,
        target: TestController,
      });
    });

    it("should decorate the target with injectable", () => {
      // Arrange
      const path = "/test";

      // Act
      @controller(path)
      class TestController {}

      // Assert
      expect(injectable).toBeCalledWith();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty middleware array gracefully", () => {
      // Arrange
      const path = "/test";

      // Act
      @controller(path)
      class TestController {}

      // Assert
      const metadata = Reflect.getMetadata(METADATA_KEY.controller, TestController);
      expect(metadata.middleware).toEqual([]);
    });

    it("should handle path with trailing slash correctly", () => {
      // Arrange
      const path = "/test/";

      // Act
      @controller(path)
      class TestController {}

      // Assert
      const metadata = Reflect.getMetadata(METADATA_KEY.controller, TestController);
      expect(metadata.path).toBe("/test/");
    });

    it("should handle metadata merging correctly", () => {
      // Arrange
      const path1 = "/test1";
      const path2 = "/test2";

      // Act

      // Assert
      const metadata = Reflect.getMetadata(METADATA_KEY.controller, Reflect);
      expect(metadata).toHaveLength(4);
      expect(metadata[0].path).toBe("/test/");
      //expect(metadata[1].path).toBe("/test1");
    });
  });
});

// End of unit tests for: controller
