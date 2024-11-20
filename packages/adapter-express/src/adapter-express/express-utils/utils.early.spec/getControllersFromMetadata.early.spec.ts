// Unit tests for: getControllersFromMetadata

import "reflect-metadata";
import { getControllersFromMetadata } from "../utils";

describe("getControllersFromMetadata() getControllersFromMetadata method", () => {
  describe("Happy Path", () => {
    it("should return an array of controller targets when metadata is present", () => {
      // Arrange
      const mockMetadata = [{ target: class ControllerA {} }, { target: class ControllerB {} }];
      jest.spyOn(Reflect, "getMetadata").mockReturnValue(mockMetadata);

      // Act
      const result = getControllersFromMetadata();

      // Assert
      expect(result).toEqual([mockMetadata[0].target, mockMetadata[1].target]);

      // Cleanup
      jest.restoreAllMocks();
    });
  });

  // Edge Case Tests
  describe("Edge Cases", () => {
    it("should return an empty array when no metadata is found", () => {
      // Arrange
      jest.spyOn(Reflect, "getMetadata").mockReturnValue(undefined);

      // Act
      const result = getControllersFromMetadata();

      // Assert
      expect(result).toEqual([]);

      // Cleanup
      jest.restoreAllMocks();
    });

    it("should return an empty array when metadata is an empty array", () => {
      // Arrange
      jest.spyOn(Reflect, "getMetadata").mockReturnValue([]);

      // Act
      const result = getControllersFromMetadata();

      // Assert
      expect(result).toEqual([]);

      // Cleanup
      jest.restoreAllMocks();
    });

    it("should handle metadata with undefined targets gracefully", () => {
      // Arrange
      const mockMetadata = [{ target: undefined }, { target: class ControllerC {} }];
      jest.spyOn(Reflect, "getMetadata").mockReturnValue(mockMetadata);
    
      // Act
      const result = getControllersFromMetadata();
    
      // Assert
      expect(result).toContain(undefined); 
      expect(result).toContain(mockMetadata[1].target);
      expect(result.filter((target) => target !== undefined)).toEqual([mockMetadata[1].target]); 
    
      // Cleanup
      jest.restoreAllMocks();
    });
  });
});

// End of unit tests for: getControllersFromMetadata
