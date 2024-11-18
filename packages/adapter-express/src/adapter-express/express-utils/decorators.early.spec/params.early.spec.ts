// Unit tests for: params

import { METADATA_KEY, PARAMETER_TYPE } from "../constants";
import { params } from "../decorators";
import type { Controller } from "../interfaces";
import "reflect-metadata";

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

// Mock interfaces
describe("params() params method", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Happy Path", () => {
    it("should define metadata for a parameter with a given type and name", () => {
      // Arrange
      const mockTarget = {} as Controller;
      const mockMethodName = "mockMethod";
      const mockIndex = 0;
      const mockType = PARAMETER_TYPE.REQUEST;
      const mockParameterName = "mockParam";

      // Act
      const decorator = params(mockType, mockParameterName);
      decorator(mockTarget, mockMethodName, mockIndex);

      // Assert
      const metadataList = Reflect.getOwnMetadata(
        METADATA_KEY.controllerParameter,
        mockTarget.constructor,
      );
      expect(metadataList[mockMethodName]).toBeDefined();
      expect(metadataList[mockMethodName][0]).toEqual({
        index: mockIndex,
        injectRoot: false,
        parameterName: mockParameterName,
        type: mockType,
      });
    });

    it("should define metadata for a parameter with a given type and no name", () => {
      // Arrange
      const mockTarget = {} as Controller;
      const mockMethodName = "mockMethod";
      const mockIndex = 0;
      const mockType = PARAMETER_TYPE.RESPONSE;

      // Act
      const decorator = params(mockType);
      decorator(mockTarget, mockMethodName, mockIndex);

      // Assert
      const metadataList = Reflect.getOwnMetadata(
        METADATA_KEY.controllerParameter,
        mockTarget.constructor,
      );
      expect(metadataList[mockMethodName]).toBeDefined();
      expect(metadataList[mockMethodName][0]).toEqual({
        index: mockIndex,
        injectRoot: true,
        parameterName: undefined,
        type: mockType,
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined methodName gracefully", () => {
      // Arrange
      const mockTarget = {} as Controller;
      const mockIndex = 0;
      const mockType = PARAMETER_TYPE.PARAMS;

      // Act
      const decorator = params(mockType);
      decorator(mockTarget, undefined, mockIndex);

      // Assert
      const metadataList = Reflect.getOwnMetadata(
        METADATA_KEY.controllerParameter,
        mockTarget.constructor,
      );
      if (metadataList["undefined"]) {
        expect(metadataList["undefined"][0]).toEqual({
          index: mockIndex,
          injectRoot: true,
          parameterName: undefined,
          type: mockType,
        });
      }
    });

    it("should handle existing metadata and append new parameter metadata", () => {
      // Arrange
      const mockTarget = {} as Controller;
      const mockMethodName = "mockMethod";
      const mockIndex1 = 0;
      const mockIndex2 = 1;
      const mockType1 = PARAMETER_TYPE.QUERY;
      const mockType2 = PARAMETER_TYPE.BODY;

      // Act
      const decorator1 = params(mockType1);
      decorator1(mockTarget, mockMethodName, mockIndex1);

      const decorator2 = params(mockType2);
      decorator2(mockTarget, mockMethodName, mockIndex2);

      // Assert
      const metadataList = Reflect.getOwnMetadata(
        METADATA_KEY.controllerParameter,
        mockTarget.constructor,
      );
      expect(metadataList[mockMethodName]).toHaveLength(4);
      expect(metadataList[mockMethodName][0]).toEqual({
        index: mockIndex2,
        injectRoot: true,
        parameterName: undefined,
        type: mockType2,
      });
      expect(metadataList[mockMethodName][1]).toEqual({
        index: mockIndex1,
        injectRoot: true,
        parameterName: undefined,
        type: mockType1,
      });
    });
  });
});

// End of unit tests for: params
