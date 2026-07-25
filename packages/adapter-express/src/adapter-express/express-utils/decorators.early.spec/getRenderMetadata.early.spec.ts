// Unit tests for: getRenderMetadata
import "reflect-metadata"; // Ensure reflect-metadata is imported
import { RENDER_METADATA_KEY } from "../constants";
import { getRenderMetadata } from "../decorators";

// Mocking Reflect.getMetadata function
jest.spyOn(Reflect, "getMetadata");

describe("getRenderMetadata() getRenderMetadata method", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Happy Path", () => {
    it("should return metadata when it exists", () => {
      // Arrange
      const target = {};
      const propertyKey = "someProperty";
      const expectedMetadata = { template: "templateName", defaultData: { key: "value" } };

      (Reflect.getMetadata as jest.Mock).mockReturnValue(expectedMetadata);

      // Act
      const result = getRenderMetadata(target, propertyKey);

      // Assert
      expect(result).toEqual(expectedMetadata);
      expect(Reflect.getMetadata).toHaveBeenCalledWith(RENDER_METADATA_KEY, target, propertyKey);
    });

    it("should return an empty object when no metadata exists", () => {
      // Arrange
      const target = {};
      const propertyKey = "someProperty";

      (Reflect.getMetadata as jest.Mock).mockReturnValue(undefined);

      // Act
      const result = getRenderMetadata(target, propertyKey);

      // Assert
      expect(result).toEqual({});
      expect(Reflect.getMetadata).toHaveBeenCalledWith(RENDER_METADATA_KEY, target, propertyKey);
    });
  });

  describe("Edge Cases", () => {
    it("should handle symbol property keys", () => {
      // Arrange
      const target = {};
      const propertyKey = Symbol("someSymbol");
      const expectedMetadata = { template: "templateName", defaultData: { key: "value" } };

      (Reflect.getMetadata as jest.Mock).mockReturnValue(expectedMetadata);

      // Act
      const result = getRenderMetadata(target, propertyKey);

      // Assert
      expect(result).toEqual(expectedMetadata);
      expect(Reflect.getMetadata).toHaveBeenCalledWith(RENDER_METADATA_KEY, target, propertyKey);
    });

    it("should handle null target gracefully", () => {
      // Arrange
      const target = null;
      const propertyKey = "someProperty";

      (Reflect.getMetadata as jest.Mock).mockReturnValue(undefined);

      // Act
      const result = getRenderMetadata(target as any, propertyKey);

      // Assert
      expect(result).toEqual({});
      expect(Reflect.getMetadata).toHaveBeenCalledWith(RENDER_METADATA_KEY, target, propertyKey);
    });

    it("should handle null propertyKey gracefully", () => {
      // Arrange
      const target = {};
      const propertyKey = null;

      (Reflect.getMetadata as jest.Mock).mockReturnValue(undefined);

      // Act
      const result = getRenderMetadata(target, propertyKey as any);

      // Assert
      expect(result).toEqual({});
      expect(Reflect.getMetadata).toHaveBeenCalledWith(RENDER_METADATA_KEY, target, propertyKey);
    });
  });
});

// End of unit tests for: getRenderMetadata
