// Unit tests for: LifecycleRegistry.executeShutdown edge cases

import "reflect-metadata";
import { Container } from "../../di/container/container";
import { injectable } from "../../di/inversify";
import { LifecycleRegistry } from "../lifecycle-registry";
import { IShutdown } from "../lifecycle.interface";
import { METADATA_KEY } from "../../di/binding-decorator/constants";

@injectable()
class TestSyncShutdown implements IShutdown {
  shutdown(): void {
    // Sync implementation
  }
}

@injectable()
class TestShutdownNotInContainer implements IShutdown {
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

describe("LifecycleRegistry.executeShutdown() executeShutdown method edge cases", () => {
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
    it("should handle sync shutdown methods", async () => {
      // Arrange
      registerProviderMetadata(TestSyncShutdown);
      container.bind(TestSyncShutdown).toSelf().inSingletonScope();

      // Act
      registry.discover();
      await registry.executeShutdown();

      // Assert - should complete without error
      expect(registry.getShutdownCount()).toBe(1);
    });

    it("should handle provider not in container gracefully", async () => {
      // Arrange
      registerProviderMetadata(TestShutdownNotInContainer);
      // Note: Not binding to container

      // Act
      registry.discover();

      // Assert - should not throw, just log error
      await expect(registry.executeShutdown()).resolves.toBeUndefined();
    });

    it("should handle instance that does not pass isShutdown check", async () => {
      // Arrange
      registerProviderMetadata(TestSyncShutdown);
      // Create a mock instance that doesn't pass isShutdown
      const mockInstance = {} as any;
      container.bind(TestSyncShutdown).toConstantValue(mockInstance);

      // Act
      registry.discover();

      // Assert - should not throw, just skip
      await expect(registry.executeShutdown()).resolves.toBeUndefined();
    });

    it("should handle undefined signal", async () => {
      // Arrange
      registerProviderMetadata(TestSyncShutdown);
      container.bind(TestSyncShutdown).toSelf().inSingletonScope();

      // Act
      registry.discover();
      await registry.executeShutdown(undefined);

      // Assert - should complete without error
      expect(registry.getShutdownCount()).toBe(1);
    });
  });
});

// End of unit tests for: LifecycleRegistry.executeShutdown edge cases
