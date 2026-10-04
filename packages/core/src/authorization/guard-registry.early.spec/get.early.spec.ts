// Unit tests for: get

import "reflect-metadata";
import { Container } from "../../di/inversify";
import { injectable } from "../../di/inversify";
import { Logger } from "../../provider/logger/logger.provider";
import { GuardRegistry } from "../guard-registry";
import type { IGuard, GuardClass } from "../guard.interface";
import { Guard } from "../guard-decorators";
import { RequireAuth } from "../guards/authenticated.guard";
import { RequirePermission } from "../guards/permission.guard";
import { GuardResult } from "../guard.interface";

@injectable()
class TestGuard implements IGuard {
  async canActivate(): Promise<GuardResult> {
    return GuardResult.allow();
  }
}

describe("GuardRegistry.get() get method", () => {
  let container: Container;
  let logger: Logger;
  let registry: GuardRegistry;

  beforeEach(() => {
    container = new Container();
    logger = new Logger();
    registry = new GuardRegistry(container, logger);
  });

  describe("Happy Path", () => {
    it("should return guard instance from registry", () => {
      // Arrange
      const guardInstance = new TestGuard();
      (registry as any).guards.set(TestGuard, guardInstance);

      // Act
      const result = registry.get(TestGuard);

      // Assert
      expect(result).toBe(guardInstance);
    });

    it("should return guard instance from container if bound", () => {
      // Arrange
      container.bind(TestGuard).toSelf().inSingletonScope();
      const containerGuard = container.get<IGuard>(TestGuard);

      // Act
      const result = registry.get(TestGuard);

      // Assert
      expect(result).toBe(containerGuard);
    });

    it("should create new instance if not in registry or container", () => {
      // Act
      const result = registry.get(TestGuard);

      // Assert
      expect(result).toBeInstanceOf(TestGuard);
    });

    it("should return guard instance directly if already an instance", () => {
      // Arrange
      const guardInstance = new TestGuard();

      // Act
      const result = registry.get(guardInstance);

      // Assert
      expect(result).toBe(guardInstance);
    });
  });

  it("applies decorator priorities to convenience guard instances", () => {
    expect(registry.get(RequireAuth()).priority).toBe(1);
    expect(registry.get(RequirePermission("profile:read")).priority).toBe(20);
  });
  it("applies metadata to manually created classes while respecting explicit overrides", () => {
    @Guard({ priority: 3, cacheable: true })
    class DecoratedGuard extends TestGuard {}
    const guard = registry.get(DecoratedGuard);
    expect(guard.priority).toBe(3);
    expect(guard.cacheable).toBeUndefined();
    guard.priority = 5;
    guard.cacheable = false;
    expect(registry.get(guard).priority).toBe(5);
    expect(registry.get(guard).cacheable).toBe(false);
  });

  describe("Edge Cases", () => {
    it("should prioritize registry over container", () => {
      // Arrange
      const registryGuard = new TestGuard();
      (registry as any).guards.set(TestGuard, registryGuard);
      container.bind(TestGuard).toSelf().inSingletonScope();

      // Act
      const result = registry.get(TestGuard);

      // Assert
      expect(result).toBe(registryGuard);
    });
  });
});

// End of unit tests for: get
