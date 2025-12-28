// Unit tests for: LifecycleRegistry.executeBootstrap edge cases

import "reflect-metadata";
import { Container } from "../../di/container/container";
import { injectable } from "../../di/inversify";
import { LifecycleRegistry } from "../lifecycle-registry";
import { IBootstrap } from "../lifecycle.interface";
import { METADATA_KEY } from "../../di/binding-decorator/constants";

@injectable()
class TestSyncBootstrap implements IBootstrap {
  bootstrap(): void {
    // Sync implementation
  }
}

@injectable()
class TestBootstrapNotInContainer implements IBootstrap {
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

describe("LifecycleRegistry.executeBootstrap() executeBootstrap method edge cases", () => {
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

  describe("Edge Cases", () => {
    it("should handle sync bootstrap methods", async () => {
      // Arrange
      registerProviderMetadata(TestSyncBootstrap);
      container.bind(TestSyncBootstrap).toSelf().inSingletonScope();

      // Act
      registry.discover();
      await registry.executeBootstrap();

      // Assert - should complete without error
      expect(registry.getBootstrapCount()).toBe(1);
    });

    it("should throw error when provider not in container", async () => {
      // Arrange
      registerProviderMetadata(TestBootstrapNotInContainer);
      // Note: Not binding to container

      // Act
      registry.discover();

      // Assert
      await expect(registry.executeBootstrap()).rejects.toThrow();
    });

    it("should handle instance that does not pass isBootstrap check", async () => {
      // Arrange
      registerProviderMetadata(TestSyncBootstrap);
      // Create a mock instance that doesn't pass isBootstrap
      const mockInstance = {} as any;
      container.bind(TestSyncBootstrap).toConstantValue(mockInstance);

      // Act
      registry.discover();

      // Assert - should not throw, just skip
      await expect(registry.executeBootstrap()).resolves.toBeUndefined();
    });
  });
});

// End of unit tests for: LifecycleRegistry.executeBootstrap edge cases
