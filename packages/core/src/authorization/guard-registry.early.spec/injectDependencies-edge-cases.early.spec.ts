// Unit tests for: GuardRegistry.injectDependencies edge cases

import { GuardRegistry } from "../guard-registry";
import { Container } from "../../di/inversify";
import { Logger } from "../../provider/logger/logger.provider";
import type { IGuard, GuardContext } from "../guard.interface";
import { GuardResult } from "../guard.interface";

describe("GuardRegistry.injectDependencies() injectDependencies edge cases", () => {
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
    it("should handle when Logger is not bound in container", () => {
      // Arrange
      const unboundContainer = new Container();
      const registryWithoutLogger = new GuardRegistry(
        unboundContainer,
        mockLogger,
      );
      const guardInstance: IGuard = {
        canActivate: jest.fn().mockResolvedValue(GuardResult.allow()),
      } as unknown as IGuard;

      // Act & Assert
      expect(() => {
        (registryWithoutLogger as any).injectDependencies(guardInstance);
      }).not.toThrow();
    });

    it("should handle when Report is not bound in container", () => {
      // Arrange
      const guardInstance: IGuard & { report?: unknown } = {
        canActivate: jest.fn().mockResolvedValue(GuardResult.allow()),
      } as unknown as IGuard & { report?: unknown };

      // Act & Assert
      expect(() => {
        (registry as any).injectDependencies(guardInstance);
      }).not.toThrow();
    });

    it("should inject Logger when available", () => {
      // Arrange
      const guardInstance: IGuard & { logger?: Logger } = {
        canActivate: jest.fn().mockResolvedValue(GuardResult.allow()),
      } as unknown as IGuard & { logger?: Logger };

      // Act
      (registry as any).injectDependencies(guardInstance);

      // Assert
      expect(guardInstance.logger).toBe(mockLogger);
    });

    it("should inject Report when available", () => {
      // Arrange
      const mockReport = {};
      container.bind("Report").toConstantValue(mockReport);
      const guardInstance: IGuard & { report?: unknown } = {
        canActivate: jest.fn().mockResolvedValue(GuardResult.allow()),
      } as unknown as IGuard & { report?: unknown };

      // Act
      (registry as any).injectDependencies(guardInstance);

      // Assert
      expect(guardInstance.report).toBe(mockReport);
    });
  });
});

// End of unit tests for: GuardRegistry.injectDependencies edge cases
