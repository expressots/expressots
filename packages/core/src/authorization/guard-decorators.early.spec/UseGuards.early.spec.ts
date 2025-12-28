// Unit tests for: UseGuards decorator

import "reflect-metadata";
import { UseGuards } from "../guard-decorators";
import { GUARD_METADATA_KEY } from "../guard-constants";
import type { IGuard, GuardClass } from "../guard.interface";
import { GuardResult } from "../guard.interface";

class MockGuard implements IGuard {
  async canActivate(): Promise<GuardResult> {
    return GuardResult.allow();
  }
}

class MockGuardClass implements IGuard {
  async canActivate(): Promise<GuardResult> {
    return GuardResult.allow();
  }
}

describe("UseGuards() UseGuards decorator", () => {
  beforeEach(() => {
    // Clear metadata before each test
    Reflect.deleteMetadata(
      GUARD_METADATA_KEY.controllerGuards,
      TestController,
    );
    Reflect.deleteMetadata(
      GUARD_METADATA_KEY.methodGuards,
      TestController.prototype,
      "testMethod",
    );
  });

  class TestController {
    testMethod(): void {}
  }

  describe("Happy Path", () => {
    it("should register controller-level guards", () => {
      // Arrange
      const guardInstance = new MockGuard();

      // Act
      @UseGuards(MockGuardClass, guardInstance)
      class GuardedController {}

      // Assert
      const guards = Reflect.getMetadata(
        GUARD_METADATA_KEY.controllerGuards,
        GuardedController,
      ) as Array<IGuard | GuardClass>;

      expect(guards).toBeDefined();
      expect(guards.length).toBe(2);
      expect(guards[0]).toBe(MockGuardClass);
      expect(guards[1]).toBe(guardInstance);
    });

    it("should register method-level guards", () => {
      // Arrange
      const guardInstance = new MockGuard();

      // Act
      class GuardedController {
        @UseGuards(MockGuardClass, guardInstance)
        testMethod(): void {}
      }

      // Assert
      const guards = Reflect.getMetadata(
        GUARD_METADATA_KEY.methodGuards,
        GuardedController,
        "testMethod",
      ) as Array<IGuard | GuardClass>;

      expect(guards).toBeDefined();
      expect(guards.length).toBe(2);
      expect(guards[0]).toBe(MockGuardClass);
      expect(guards[1]).toBe(guardInstance);
    });

    it("should append to existing controller-level guards", () => {
      // Arrange
      const guard1 = new MockGuard();
      const guard2 = new MockGuard();

      // Act
      const decorator1 = UseGuards(MockGuardClass);
      const decorator2 = UseGuards(guard1, guard2);
      
      @decorator1
      @decorator2
      class GuardedController {}

      // Assert
      const guards = Reflect.getMetadata(
        GUARD_METADATA_KEY.controllerGuards,
        GuardedController,
      ) as Array<IGuard | GuardClass>;

      expect(guards.length).toBe(3);
      expect(guards).toContain(MockGuardClass);
      expect(guards).toContain(guard1);
      expect(guards).toContain(guard2);
    });

    it("should append to existing method-level guards", () => {
      // Arrange
      const guard1 = new MockGuard();
      const guard2 = new MockGuard();

      // Act
      class GuardedController {
        @UseGuards(MockGuardClass)
        @UseGuards(guard1, guard2)
        testMethod(): void {}
      }

      // Assert
      const guards = Reflect.getMetadata(
        GUARD_METADATA_KEY.methodGuards,
        GuardedController,
        "testMethod",
      ) as Array<IGuard | GuardClass>;

      expect(guards.length).toBe(3);
      expect(guards).toContain(MockGuardClass);
      expect(guards).toContain(guard1);
      expect(guards).toContain(guard2);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty guards array", () => {
      // Act
      @UseGuards()
      class GuardedController {}

      // Assert
      const guards = Reflect.getMetadata(
        GUARD_METADATA_KEY.controllerGuards,
        GuardedController,
      ) as Array<IGuard | GuardClass>;

      expect(guards).toBeDefined();
      expect(guards.length).toBe(0);
    });

    it("should handle single guard", () => {
      // Arrange
      const guardInstance = new MockGuard();

      // Act
      @UseGuards(guardInstance)
      class GuardedController {}

      // Assert
      const guards = Reflect.getMetadata(
        GUARD_METADATA_KEY.controllerGuards,
        GuardedController,
      ) as Array<IGuard | GuardClass>;

      expect(guards.length).toBe(1);
      expect(guards[0]).toBe(guardInstance);
    });
  });
});

// End of unit tests for: UseGuards decorator

