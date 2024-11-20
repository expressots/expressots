// Unit tests for: getControllerParameterMetadata

import type { ControllerParameterMetadata } from "../interfaces";
import { getControllerParameterMetadata } from "../utils";
import "reflect-metadata";

interface MockNewableFunction {
  prototype: any;
}

class MockConstructor implements MockNewableFunction {
  prototype: any = {};
}

describe("getControllerParameterMetadata() getControllerParameterMetadata method", () => {
  let mockConstructor: MockConstructor;

  beforeEach(() => {
    mockConstructor = new MockConstructor();
  });

  describe("Happy Path", () => {});

  describe("Edge Cases", () => {
    it("should return undefined when both parameterMetadata and genericMetadata are undefined", () => {
      // Arrange
      Reflect.getOwnMetadata = jest.fn().mockReturnValue(undefined);
      Reflect.getMetadata = jest.fn().mockReturnValue(undefined);

      // Act
      const result = getControllerParameterMetadata(mockConstructor as any);

      // Assert
      expect(result).toBeUndefined();
    });

    it("should handle empty metadata objects gracefully", () => {
      // Arrange
      const parameterMetadata: ControllerParameterMetadata = {};
      const genericMetadata: ControllerParameterMetadata = {};

      Reflect.getOwnMetadata = jest.fn().mockReturnValue(parameterMetadata as any);
      Reflect.getMetadata = jest.fn().mockReturnValue(genericMetadata as any);

      // Act
      const result = getControllerParameterMetadata(mockConstructor as any);

      // Assert
      expect(result).toEqual({});
    });
  });
});

// End of unit tests for: getControllerParameterMetadata
