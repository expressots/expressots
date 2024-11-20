// Unit tests for: getControllerMetadata

import type { ControllerMetadata } from "../interfaces";
import { getControllerMetadata } from "../utils";
import "reflect-metadata";

class MockController {
  constructor() {
  }
}

describe("getControllerMetadata() getControllerMetadata method", () => {
  describe("Happy Path", () => {
    it("should return controller metadata when metadata is present", () => {
      // Arrange
      const expectedMetadata: ControllerMetadata = {
        middleware: [],
        path: "/mock-path",
        target: MockController,
      };
      Reflect.getOwnMetadata = jest.fn().mockReturnValue(expectedMetadata);

      // Act
      const result = getControllerMetadata(MockController);

      // Assert
      expect(result).toEqual(expectedMetadata);
    });
  });

  describe("Edge Cases", () => {
    it("should return undefined when no metadata is present", () => {
      // Arrange
      Reflect.getOwnMetadata = jest.fn().mockReturnValue(undefined);

      // Act
      const result = getControllerMetadata(MockController);

      // Assert
      expect(result).toBeUndefined();
    });

    it("should handle null constructor gracefully", () => {
      // Arrange
      Reflect.getOwnMetadata = jest.fn().mockReturnValue(null);

      // Act
      const result = getControllerMetadata(null as any);

      // Assert
      expect(result).toBeNull();
    });

    it("should handle non-existent metadata key gracefully", () => {
      // Arrange
      Reflect.getOwnMetadata = jest.fn().mockReturnValue(undefined);

      // Act
      const result = getControllerMetadata(MockController);

      // Assert
      expect(result).toBeUndefined();
    });
  });
});

// End of unit tests for: getControllerMetadata
