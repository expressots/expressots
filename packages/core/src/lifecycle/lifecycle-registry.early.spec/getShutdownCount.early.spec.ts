// Unit tests for: LifecycleRegistry.getShutdownCount

import "reflect-metadata";
import { Container } from "../../di/container/container";
import { injectable } from "../../di/inversify";
import { LifecycleRegistry } from "../lifecycle-registry";
import { IShutdown } from "../lifecycle.interface";
import { METADATA_KEY } from "../../di/binding-decorator/constants";

@injectable()
class TestShutdownService implements IShutdown {
  shutdown(): void {
    // Test implementation
  }
}

@injectable()
class AnotherShutdownService implements IShutdown {
  shutdown(): void {
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

describe("LifecycleRegistry.getShutdownCount() getShutdownCount method", () => {
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
    it("should return 0 when no shutdown providers discovered", () => {
      // Act
      registry.discover();

      // Assert
      expect(registry.getShutdownCount()).toBe(0);
    });

    it("should return 1 when one shutdown provider discovered", () => {
      // Arrange
      registerProviderMetadata(TestShutdownService);
      container.bind(TestShutdownService).toSelf();

      // Act
      registry.discover();

      // Assert
      expect(registry.getShutdownCount()).toBe(1);
    });

    it("should return correct count for multiple shutdown providers", () => {
      // Arrange
      registerProviderMetadata(TestShutdownService);
      registerProviderMetadata(AnotherShutdownService);
      container.bind(TestShutdownService).toSelf();
      container.bind(AnotherShutdownService).toSelf();

      // Act
      registry.discover();

      // Assert
      expect(registry.getShutdownCount()).toBe(2);
    });

    it("should return 0 after clear", () => {
      // Arrange
      registerProviderMetadata(TestShutdownService);
      container.bind(TestShutdownService).toSelf();
      registry.discover();

      // Act
      registry.clear();

      // Assert
      expect(registry.getShutdownCount()).toBe(0);
    });
  });

  describe("Edge Cases", () => {
    it("should return 0 before discover is called", () => {
      // Assert
      expect(registry.getShutdownCount()).toBe(0);
    });

    it("should not change count when discover is called multiple times", () => {
      // Arrange
      registerProviderMetadata(TestShutdownService);
      container.bind(TestShutdownService).toSelf();

      // Act
      registry.discover();
      const firstCount = registry.getShutdownCount();
      registry.discover();
      const secondCount = registry.getShutdownCount();

      // Assert
      expect(firstCount).toBe(1);
      expect(secondCount).toBe(1);
    });
  });
});

// End of unit tests for: LifecycleRegistry.getShutdownCount
