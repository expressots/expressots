// Unit tests for: create

import "reflect-metadata";
import { Container, ContainerModule, interfaces } from "../../di/inversify";
import { AppContainer } from "../application-container";
import { skip } from "node:test";

describe("AppContainer.create() create method", () => {
  let appContainer: AppContainer;
  let mockModules: Array<ContainerModule>;
  let mockOptions: interfaces.ContainerOptions;

  beforeEach(() => {
    mockModules = [new ContainerModule(() => {})];
    mockOptions = {
      defaultScope: "Request",
      autoBindInjectable: true,
      skipBaseClassChecks: false,
    };
    appContainer = new AppContainer(mockOptions);
  });

  describe("Happy Path", () => {
    it("should create a new container with the provided modules", () => {
      // Arrange
      const container = appContainer.create(mockModules as any);

      // Act
      const actual = container.get(Container);

      // Assert
      expect(actual).toBe(container);
    });

    it("should create a new container with the provided modules and default options", () => {
      // Arrange
      const container = appContainer.create(mockModules as any);

      // Act
      const actual = container.get(Container);

      // Assert
      expect(actual).toBe(container);
    });
  });

  describe("Edge Cases", () => {
    it("should override default options with provided options", () => {
      // Arrange
      const customOptions: interfaces.ContainerOptions = {
        autoBindInjectable: false,
        skipBaseClassChecks: true,
      };
      appContainer = new AppContainer(customOptions as any);

      // Act
      const container = appContainer.create(mockModules as any);

      // Assert
      expect(container.options.defaultScope).toBe("Request");
      expect(container.options.autoBindInjectable).toBe(false);
    });
  });
});

// End of unit tests for: create
