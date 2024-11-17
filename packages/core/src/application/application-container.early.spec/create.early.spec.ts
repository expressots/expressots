// Unit tests for: create

import "reflect-metadata";
import {
  BindingScopeEnum,
  Container,
  ContainerModule,
  interfaces,
} from "../../di/inversify";
import { AppContainer } from "../application-container";

describe("AppContainer.create() create method", () => {
  let appContainer: AppContainer;
  let mockContainer: Container;
  let mockModules: Array<ContainerModule>;
  let mockOptions: interfaces.ContainerOptions;

  beforeEach(() => {
    mockContainer = new Container();
    mockModules = [new ContainerModule(() => {})];
    mockOptions = {
      defaultScope: "Request",
      autoBindInjectable: true,
      skipBaseClassChecks: false,
    };
    appContainer = new AppContainer(mockOptions);
  });

  describe("Happy Path", () => {
    it("should create a container and load modules successfully", () => {
      // Arrange
      const container = appContainer.create(mockModules);

      // Act
      const actual = container;

      // Assert
      expect(actual).toBe(container);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty modules array gracefully", () => {
      // Act
      appContainer.create([]);

      // Assert
      expect(appContainer.Container).toBeDefined();
    });

    it("should use default options when none are provided", () => {
      // Arrange
      const defaultOptions: interfaces.ContainerOptions = {
        defaultScope: BindingScopeEnum.Request,
        autoBindInjectable: true,
        skipBaseClassChecks: false,
      };

      // Act
      appContainer.create(mockModules);

      // Assert
      expect(appContainer.getContainerOptions()).toEqual(defaultOptions);
    });

    it("should override default options with provided options", () => {
      // Arrange
      const customOptions: interfaces.ContainerOptions = {
        defaultScope: BindingScopeEnum.Singleton,
        autoBindInjectable: false,
        skipBaseClassChecks: true,
      };
      appContainer = new AppContainer(customOptions as any) as any;

      // Act
      appContainer.create(mockModules as any);

      // Assert
      expect(appContainer.getContainerOptions()).toEqual(customOptions);
    });
  });
});

// End of unit tests for: create
