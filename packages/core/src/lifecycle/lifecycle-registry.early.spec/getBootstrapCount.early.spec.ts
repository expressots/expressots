// Unit tests for: LifecycleRegistry.getBootstrapCount

import "reflect-metadata";
import { Container } from "../../di/container/container";
import { injectable } from "../../di/inversify";
import { LifecycleRegistry } from "../lifecycle-registry";
import { IBootstrap } from "../lifecycle.interface";
import { METADATA_KEY } from "../../di/binding-decorator/constants";

@injectable()
class TestBootstrapService implements IBootstrap {
  bootstrap(): void {
    // Test implementation
  }
}

@injectable()
class AnotherBootstrapService implements IBootstrap {
  bootstrap(): void {
    // Test implementation
  }
}

// Helper to register provider metadata
function registerProviderMetadata(target: Function): void {
  const currentMetadata =
    Reflect.getMetadata(METADATA_KEY.provide, Reflect) || [];
  const newMetadata = [
    {
      implementationType: target,
      constraint: (bind: Function, bindTarget: Function) =>
        bind(target).to(bindTarget),
    },
    ...currentMetadata,
  ];
  Reflect.defineMetadata(METADATA_KEY.provide, newMetadata, Reflect);
}

function clearProviderMetadata(): void {
  Reflect.defineMetadata(METADATA_KEY.provide, [], Reflect);
}

describe("LifecycleRegistry.getBootstrapCount() getBootstrapCount method", () => {
  let container: Container;
  let registry: LifecycleRegistry;

  beforeEach(() => {
    clearProviderMetadata();
    container = new Container();
    registry = new LifecycleRegistry(container);
  });

  afterEach(() => {
    clearProviderMetadata();
    registry.clear();
  });

  describe("Happy Path", () => {
    it("should return 0 when no bootstrap providers discovered", () => {
      // Act
      registry.discover();

      // Assert
      expect(registry.getBootstrapCount()).toBe(0);
    });

    it("should return 1 when one bootstrap provider discovered", () => {
      // Arrange
      registerProviderMetadata(TestBootstrapService);
      container.bind(TestBootstrapService).toSelf();

      // Act
      registry.discover();

      // Assert
      expect(registry.getBootstrapCount()).toBe(1);
    });

    it("should return correct count for multiple bootstrap providers", () => {
      // Arrange
      registerProviderMetadata(TestBootstrapService);
      registerProviderMetadata(AnotherBootstrapService);
      container.bind(TestBootstrapService).toSelf();
      container.bind(AnotherBootstrapService).toSelf();

      // Act
      registry.discover();

      // Assert
      expect(registry.getBootstrapCount()).toBe(2);
    });

    it("should return 0 after clear", () => {
      // Arrange
      registerProviderMetadata(TestBootstrapService);
      container.bind(TestBootstrapService).toSelf();
      registry.discover();

      // Act
      registry.clear();

      // Assert
      expect(registry.getBootstrapCount()).toBe(0);
    });
  });

  describe("Edge Cases", () => {
    it("should return 0 before discover is called", () => {
      // Assert
      expect(registry.getBootstrapCount()).toBe(0);
    });

    it("should not change count when discover is called multiple times", () => {
      // Arrange
      registerProviderMetadata(TestBootstrapService);
      container.bind(TestBootstrapService).toSelf();

      // Act
      registry.discover();
      const firstCount = registry.getBootstrapCount();
      registry.discover();
      const secondCount = registry.getBootstrapCount();

      // Assert
      expect(firstCount).toBe(1);
      expect(secondCount).toBe(1);
    });
  });
});

// End of unit tests for: LifecycleRegistry.getBootstrapCount

