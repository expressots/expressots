// Unit tests for: GuardRegistry.initialize error handling

import { GuardRegistry } from "../guard-registry";
import { Container } from "../../di/inversify";
import { Logger } from "../../provider/logger/logger.provider";
import { Guard } from "../guard-decorators";
import { injectable } from "../../di/inversify";
import type { IGuard, GuardContext } from "../guard.interface";
import { GuardResult } from "../guard.interface";
import "reflect-metadata";

describe("GuardRegistry.initialize() initialize error handling", () => {
  let registry: GuardRegistry;
  let container: Container;
  let mockLogger: Logger;

  beforeEach(() => {
    container = new Container();
    mockLogger = {
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;
    container.bind(Logger).toConstantValue(mockLogger);
    registry = new GuardRegistry(container, mockLogger);
  });

  describe("Edge Cases", () => {
    it("should handle guard registration error gracefully", () => {
      // Arrange
      @Guard({ priority: 1 })
      class FailingGuard implements IGuard {
        constructor() {
          throw new Error("Guard construction failed");
        }
        async canActivate(context: GuardContext): Promise<GuardResult> {
          return GuardResult.allow();
        }
      }

      // Act & Assert
      // The guard will fail during construction, but initialize should handle it gracefully
      expect(() => {
        registry.initialize();
      }).not.toThrow();
      // Guard with constructor args should be skipped silently
      expect(registry.isInitialized()).toBe(true);
    });

    it("should handle container.get error gracefully", () => {
      // Arrange
      @Guard({ priority: 1 })
      @injectable()
      class TestGuard implements IGuard {
        async canActivate(context: GuardContext): Promise<GuardResult> {
          return GuardResult.allow();
        }
      }
      container.bind(TestGuard).toSelf();

      // Mock container.get to throw error when getting TestGuard
      const originalGet = container.get.bind(container);
      jest.spyOn(container, "get").mockImplementation((serviceIdentifier) => {
        if (serviceIdentifier === TestGuard) {
          throw new Error("Container error");
        }
        return originalGet(serviceIdentifier);
      });

      // Act & Assert
      expect(() => {
        registry.initialize();
      }).not.toThrow();
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });
});

// End of unit tests for: GuardRegistry.initialize error handling

