// Unit tests for: Container getter

import "reflect-metadata";
import { Container, ContainerModule } from "../../di/inversify";
import { AppContainer } from "../application-container";

describe("AppContainer.Container Container getter", () => {
  let appContainer: AppContainer;
  let mockModules: Array<ContainerModule>;

  beforeEach(() => {
    appContainer = new AppContainer();
    mockModules = [new ContainerModule(() => {})];
  });

  describe("Happy Path", () => {
    it("should return the underlying InversifyJS container after create", () => {
      // Arrange
      appContainer.create(mockModules);

      // Act
      const container = appContainer.Container;

      // Assert
      expect(container).toBeInstanceOf(Container);
    });

    it("should return the same container instance on multiple calls", () => {
      // Arrange
      appContainer.create(mockModules);

      // Act
      const container1 = appContainer.Container;
      const container2 = appContainer.Container;

      // Assert
      expect(container1).toBe(container2);
    });
  });

  describe("Edge Cases", () => {
    it("should return undefined when accessing Container before create is called", () => {
      // Act
      const container = (appContainer as any).container;

      // Assert
      expect(container).toBeUndefined();
    });
  });
});

// End of unit tests for: Container getter
