// Unit tests for: LifecycleRegistry.discover edge cases

import "reflect-metadata";
import { Container } from "../../di/container/container";
import { LifecycleRegistry } from "../lifecycle-registry";
import { METADATA_KEY } from "../../di/binding-decorator/constants";

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

describe("LifecycleRegistry.discover() discover method edge cases", () => {
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
    it("should handle metadata with null implementationType", () => {
      // Arrange
      const currentMetadata =
        Reflect.getMetadata(METADATA_KEY.provide, Reflect) || [];
      const newMetadata = [
        {
          implementationType: null,
          constraint: () => {},
        },
        ...currentMetadata,
      ];
      Reflect.defineMetadata(METADATA_KEY.provide, newMetadata, Reflect);

      // Act & Assert
      expect(() => registry.discover()).not.toThrow();
      expect(registry.getBootstrapCount()).toBe(0);
      expect(registry.getShutdownCount()).toBe(0);
    });

    it("should handle metadata with undefined implementationType", () => {
      // Arrange
      const currentMetadata =
        Reflect.getMetadata(METADATA_KEY.provide, Reflect) || [];
      const newMetadata = [
        {
          implementationType: undefined,
          constraint: () => {},
        },
        ...currentMetadata,
      ];
      Reflect.defineMetadata(METADATA_KEY.provide, newMetadata, Reflect);

      // Act & Assert
      expect(() => registry.discover()).not.toThrow();
      expect(registry.getBootstrapCount()).toBe(0);
      expect(registry.getShutdownCount()).toBe(0);
    });

    it("should handle metadata with implementationType without prototype", () => {
      // Arrange
      const targetWithoutPrototype = Object.create(null);
      const currentMetadata =
        Reflect.getMetadata(METADATA_KEY.provide, Reflect) || [];
      const newMetadata = [
        {
          implementationType: targetWithoutPrototype,
          constraint: () => {},
        },
        ...currentMetadata,
      ];
      Reflect.defineMetadata(METADATA_KEY.provide, newMetadata, Reflect);

      // Act & Assert
      expect(() => registry.discover()).not.toThrow();
      expect(registry.getBootstrapCount()).toBe(0);
      expect(registry.getShutdownCount()).toBe(0);
    });

    it("should handle empty metadata array", () => {
      // Arrange
      Reflect.defineMetadata(METADATA_KEY.provide, [], Reflect);

      // Act & Assert
      expect(() => registry.discover()).not.toThrow();
      expect(registry.getBootstrapCount()).toBe(0);
      expect(registry.getShutdownCount()).toBe(0);
    });

    it("should handle undefined metadata", () => {
      // Arrange
      Reflect.deleteMetadata(METADATA_KEY.provide, Reflect);

      // Act & Assert
      expect(() => registry.discover()).not.toThrow();
      expect(registry.getBootstrapCount()).toBe(0);
      expect(registry.getShutdownCount()).toBe(0);
    });
  });
});

// End of unit tests for: LifecycleRegistry.discover edge cases
