// Unit tests for: setupAuthorization

import "reflect-metadata";
import { Container } from "../../di/inversify";
import { Logger } from "../../provider/logger/logger.provider";
import { setupAuthorization } from "../setup";
import { GuardRegistry } from "../guard-registry";
import { GuardExecutor } from "../guard-executor";
import type { AuthorizationConfig } from "../authorization-config.interface";

describe("setupAuthorization() setupAuthorization function", () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    // Bind Container to itself (required by GuardRegistry)
    container.bind(Container).toConstantValue(container);
    container.bind(Logger).toSelf().inSingletonScope();
  });

  describe("Happy Path", () => {
    it("should register core services with default config", () => {
      // Act
      setupAuthorization(container);

      // Assert
      expect(container.isBound("IGuardCache")).toBe(true);
      expect(container.isBound("ISecurityContext")).toBe(true);
      expect(container.isBound(GuardRegistry)).toBe(true);
      expect(container.isBound(GuardExecutor)).toBe(true);
    });

    it("should register optional services", () => {
      // Act
      setupAuthorization(container);

      // Assert
      expect(container.isBound("IPermissionService")).toBe(true);
      expect(container.isBound("IPermissionHierarchy")).toBe(true);
    });

    it("should initialize guard registry", () => {
      // Act
      setupAuthorization(container);

      // Assert
      const registry = container.get<GuardRegistry>(GuardRegistry);
      expect(registry.isInitialized()).toBe(true);
    });

    it("should use custom config", () => {
      // Arrange
      const config: AuthorizationConfig = {
        enablePreloading: false,
        enableCaching: false,
        defaultGuardPriority: 50,
      };

      // Act
      setupAuthorization(container, config);

      // Assert
      expect(container.isBound("IGuardCache")).toBe(true);
    });

    it("should configure permission hierarchy if provided", () => {
      // Arrange
      const config: AuthorizationConfig = {
        permissionHierarchy: {
          "super-admin": ["admin", "user"],
          admin: ["user"],
        },
      };

      // Act
      setupAuthorization(container, config);

      // Assert
      const hierarchy = container.get("IPermissionHierarchy");
      expect(hierarchy).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    it("should not override existing bindings", () => {
      // Arrange
      const customCache = {};
      container.bind("IGuardCache").toConstantValue(customCache);

      // Act
      setupAuthorization(container);

      // Assert
      const cache = container.get("IGuardCache");
      expect(cache).toBe(customCache);
    });

    it("should handle empty config", () => {
      // Act
      setupAuthorization(container, {});

      // Assert
      expect(container.isBound("IGuardCache")).toBe(true);
    });

    it("should handle undefined config", () => {
      // Act
      setupAuthorization(container, undefined as any);

      // Assert
      expect(container.isBound("IGuardCache")).toBe(true);
    });
  });
});

// End of unit tests for: setupAuthorization

