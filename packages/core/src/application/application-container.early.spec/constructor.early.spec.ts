// Unit tests for: constructor

import "reflect-metadata";
import { BindingScopeEnum, interfaces } from "../../di/inversify";
import { AppContainer } from "../application-container";

describe("AppContainer.constructor() constructor", () => {
  describe("Happy Path", () => {
    it("should create an instance with default options", () => {
      // Act
      const container = new AppContainer();

      // Assert
      expect(container).toBeInstanceOf(AppContainer);
    });

    it("should create an instance with custom options", () => {
      // Arrange
      const customOptions: interfaces.ContainerOptions = {
        defaultScope: BindingScopeEnum.Singleton,
        autoBindInjectable: false,
        skipBaseClassChecks: true,
      };

      // Act
      const container = new AppContainer(customOptions);

      // Assert
      expect(container).toBeInstanceOf(AppContainer);
    });

    it("should merge custom options with defaults", () => {
      // Arrange
      const customOptions: interfaces.ContainerOptions = {
        defaultScope: BindingScopeEnum.Singleton,
      };

      // Act
      const container = new AppContainer(customOptions);
      container.create([]);

      // Assert
      const options = container.getContainerOptions();
      expect(options.defaultScope).toBe(BindingScopeEnum.Singleton);
      expect(options.autoBindInjectable).toBe(true); // Default value
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined options", () => {
      // Act
      const container = new AppContainer(undefined);

      // Assert
      expect(container).toBeInstanceOf(AppContainer);
      container.create([]);
      const options = container.getContainerOptions();
      expect(options.defaultScope).toBe(BindingScopeEnum.Request);
    });

    it("should handle empty options object", () => {
      // Arrange
      const emptyOptions = {};

      // Act
      const container = new AppContainer(emptyOptions);

      // Assert
      expect(container).toBeInstanceOf(AppContainer);
      container.create([]);
      const options = container.getContainerOptions();
      expect(options.defaultScope).toBe(BindingScopeEnum.Request);
    });
  });
});

// End of unit tests for: constructor
