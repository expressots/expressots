// Unit tests for: Guard decorator

import "reflect-metadata";
import { Guard } from "../guard-decorators";
import { GUARD_METADATA_KEY } from "../guard-constants";
import type { GuardMetadata } from "../guard.interface";

describe("Guard() Guard decorator", () => {
  beforeEach(() => {
    // Clear metadata before each test
    Reflect.deleteMetadata(GUARD_METADATA_KEY.guard, Reflect);
  });

  describe("Happy Path", () => {
    it("should register guard metadata with default options", () => {
      // Arrange
      @Guard()
      class TestGuard {}

      // Act
      const metadata = Reflect.getMetadata(
        GUARD_METADATA_KEY.guard,
        TestGuard,
      ) as GuardMetadata;

      // Assert
      expect(metadata).toBeDefined();
      expect(metadata.priority).toBe(100);
      expect(metadata.cacheable).toBe(false);
      expect(metadata.guard).toBe(TestGuard);
    });

    it("should register guard metadata with custom priority", () => {
      // Arrange
      @Guard({ priority: 10 })
      class TestGuard {}

      // Act
      const metadata = Reflect.getMetadata(
        GUARD_METADATA_KEY.guard,
        TestGuard,
      ) as GuardMetadata;

      // Assert
      expect(metadata.priority).toBe(10);
      expect(metadata.cacheable).toBe(false);
    });

    it("should register guard metadata with cacheable option", () => {
      // Arrange
      @Guard({ cacheable: true })
      class TestGuard {}

      // Act
      const metadata = Reflect.getMetadata(
        GUARD_METADATA_KEY.guard,
        TestGuard,
      ) as GuardMetadata;

      // Assert
      expect(metadata.cacheable).toBe(true);
      expect(metadata.priority).toBe(100);
    });

    it("should register guard metadata with both options", () => {
      // Arrange
      @Guard({ priority: 5, cacheable: true })
      class TestGuard {}

      // Act
      const metadata = Reflect.getMetadata(
        GUARD_METADATA_KEY.guard,
        TestGuard,
      ) as GuardMetadata;

      // Assert
      expect(metadata.priority).toBe(5);
      expect(metadata.cacheable).toBe(true);
    });

    it("should register guard in global registry", () => {
      // Arrange
      @Guard({ priority: 1 })
      class TestGuard1 {}
      @Guard({ priority: 2 })
      class TestGuard2 {}

      // Act
      const globalGuards = Reflect.getMetadata(
        GUARD_METADATA_KEY.guard,
        Reflect,
      ) as Array<GuardMetadata>;

      // Assert
      expect(globalGuards).toBeDefined();
      expect(globalGuards.length).toBeGreaterThanOrEqual(2);
      expect(
        globalGuards.some((g) => g.guard === TestGuard1),
      ).toBe(true);
      expect(
        globalGuards.some((g) => g.guard === TestGuard2),
      ).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined options", () => {
      // Arrange
      @Guard(undefined)
      class TestGuard {}

      // Act
      const metadata = Reflect.getMetadata(
        GUARD_METADATA_KEY.guard,
        TestGuard,
      ) as GuardMetadata;

      // Assert
      expect(metadata).toBeDefined();
      expect(metadata.priority).toBe(100);
      expect(metadata.cacheable).toBe(false);
    });
  });
});

// End of unit tests for: Guard decorator

