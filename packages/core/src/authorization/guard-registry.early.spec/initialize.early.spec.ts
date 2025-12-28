// Unit tests for: initialize

import "reflect-metadata";
import { Container } from "../../di/inversify";
import { injectable } from "../../di/inversify";
import { Logger } from "../../provider/logger/logger.provider";
import { GuardRegistry } from "../guard-registry";
import { Guard } from "../guard-decorators";
import { GUARD_METADATA_KEY } from "../guard-constants";
import type { IGuard } from "../guard.interface";
import { GuardResult } from "../guard.interface";

@injectable()
class TestGuard implements IGuard {
  async canActivate(): Promise<GuardResult> {
    return GuardResult.allow();
  }
}

@Guard({ priority: 10 })
class DecoratedGuard implements IGuard {
  async canActivate(): Promise<GuardResult> {
    return GuardResult.allow();
  }
}

class GuardWithConstructorArgs implements IGuard {
  constructor(private arg: string) {}
  async canActivate(): Promise<GuardResult> {
    return GuardResult.allow();
  }
}

describe("GuardRegistry.initialize() initialize method", () => {
  let container: Container;
  let logger: Logger;
  let registry: GuardRegistry;

  beforeEach(() => {
    container = new Container();
    logger = new Logger();
    registry = new GuardRegistry(container, logger);

    // Clear metadata
    Reflect.deleteMetadata(GUARD_METADATA_KEY.guard, Reflect);
  });

  describe("Happy Path", () => {
    it("should initialize registry and discover guards", () => {
      // Arrange
      @injectable()
      @Guard({ priority: 5 })
      class TestGuard1 implements IGuard {
        async canActivate(): Promise<GuardResult> {
          return GuardResult.allow();
        }
      }

      // Act
      registry.initialize();

      // Assert
      expect(registry.isInitialized()).toBe(true);
    });

    it("should register guards from container if bound", () => {
      // Arrange
      @injectable()
      @Guard({ priority: 5 })
      class TestGuard1 implements IGuard {
        async canActivate(): Promise<GuardResult> {
          return GuardResult.allow();
        }
      }
      container.bind(TestGuard1).toSelf().inSingletonScope();

      // Act
      registry.initialize();

      // Assert
      const guard = registry.get(TestGuard1);
      expect(guard).toBeDefined();
      expect(guard).toBeInstanceOf(TestGuard1);
    });

    it("should set priority and cacheable from metadata", () => {
      // Arrange
      @injectable()
      @Guard({ priority: 20, cacheable: true })
      class TestGuard1 implements IGuard {
        async canActivate(): Promise<GuardResult> {
          return GuardResult.allow();
        }
      }

      // Act
      registry.initialize();

      // Assert
      const guard = registry.get(TestGuard1);
      expect(guard.priority).toBe(20);
      expect(guard.cacheable).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should skip guards that require constructor arguments", () => {
      // Arrange
      @Guard({ priority: 5 })
      class GuardWithArgs implements IGuard {
        constructor(private arg: string) {}
        async canActivate(): Promise<GuardResult> {
          return GuardResult.allow();
        }
      }

      // Act
      registry.initialize();

      // Assert
      // Should not throw, guard should be skipped
      expect(registry.isInitialized()).toBe(true);
    });

    it("should not initialize twice", () => {
      // Arrange
      @Guard({ priority: 5 })
      class TestGuard1 implements IGuard {
        async canActivate(): Promise<GuardResult> {
          return GuardResult.allow();
        }
      }

      // Act
      registry.initialize();
      const firstInit = registry.isInitialized();
      registry.initialize();
      const secondInit = registry.isInitialized();

      // Assert
      expect(firstInit).toBe(true);
      expect(secondInit).toBe(true);
    });

    it("should handle empty guard metadata", () => {
      // Act
      registry.initialize();

      // Assert
      expect(registry.isInitialized()).toBe(true);
    });
  });
});

// End of unit tests for: initialize
