// Unit tests for: Render
import "reflect-metadata";

import { RENDER_METADATA_KEY } from "../constants";
import { Render } from "../decorators";

// Mocking Reflect.defineMetadata
Reflect.defineMetadata = jest.fn();

describe("Render() Render method", () => {
  // Happy Path Tests
  describe("Happy Path", () => {
    it("should define metadata with the correct template and default data", () => {
      // Arrange
      const template = "templateName";
      const defaultData = { key: "value" };
      const target = {};
      const propertyKey = "methodName";
      const descriptor = {} as PropertyDescriptor;

      // Act
      Render(template, defaultData)(target, propertyKey, descriptor);

      // Assert
      expect(Reflect.defineMetadata).toHaveBeenCalledWith(
        RENDER_METADATA_KEY,
        { template, defaultData },
        target,
        propertyKey,
      );
    });

    it("should define metadata with the correct template and no default data", () => {
      // Arrange
      const template = "templateName";
      const target = {};
      const propertyKey = "methodName";
      const descriptor = {} as PropertyDescriptor;

      // Act
      Render(template)(target, propertyKey, descriptor);

      // Assert
      expect(Reflect.defineMetadata).toHaveBeenCalledWith(
        RENDER_METADATA_KEY,
        { template, defaultData: undefined },
        target,
        propertyKey,
      );
    });
  });

  // Edge Case Tests
  describe("Edge Cases", () => {
    it("should handle an empty template string", () => {
      // Arrange
      const template = "";
      const defaultData = { key: "value" };
      const target = {};
      const propertyKey = "methodName";
      const descriptor = {} as PropertyDescriptor;

      // Act
      Render(template, defaultData)(target, propertyKey, descriptor);

      // Assert
      expect(Reflect.defineMetadata).toHaveBeenCalledWith(
        RENDER_METADATA_KEY,
        { template, defaultData },
        target,
        propertyKey,
      );
    });

    it("should handle null default data", () => {
      // Arrange
      const template = "templateName";
      const defaultData = null;
      const target = {};
      const propertyKey = "methodName";
      const descriptor = {} as PropertyDescriptor;

      // Act
      Render(template, defaultData)(target, propertyKey, descriptor);

      // Assert
      expect(Reflect.defineMetadata).toHaveBeenCalledWith(
        RENDER_METADATA_KEY,
        { template, defaultData },
        target,
        propertyKey,
      );
    });

    it("should handle undefined template and default data", () => {
      // Arrange
      const template = undefined;
      const defaultData = undefined;
      const target = {};
      const propertyKey = "methodName";
      const descriptor = {} as PropertyDescriptor;

      // Act
      Render(template as any, defaultData)(target, propertyKey, descriptor);

      // Assert
      expect(Reflect.defineMetadata).toHaveBeenCalledWith(
        RENDER_METADATA_KEY,
        { template: undefined, defaultData: undefined },
        target,
        propertyKey,
      );
    });
  });
});

// End of unit tests for: Render
