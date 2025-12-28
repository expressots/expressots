// Unit tests for: combineModules

import "reflect-metadata";
import { ContainerModule, interfaces } from "../../di/inversify";
import { combineModules } from "../container-module";

describe("combineModules() combineModules function", () => {
  let mockBind: jest.Mock;
  let mockUnbind: jest.Mock;
  let mockIsBound: jest.Mock;
  let mockRebind: jest.Mock;
  let mockUnbindAsync: jest.Mock;
  let mockOnActivation: jest.Mock;
  let mockOnDeactivation: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockBind = jest.fn();
    mockUnbind = jest.fn();
    mockIsBound = jest.fn();
    mockRebind = jest.fn();
    mockUnbindAsync = jest.fn();
    mockOnActivation = jest.fn();
    mockOnDeactivation = jest.fn();
  });

  describe("Happy Path", () => {
    it("should combine multiple modules into a single module", () => {
      // Arrange
      const bindCallCount = { count: 0 };
      const mockBindWithReturn = jest.fn().mockImplementation(() => {
        bindCallCount.count++;
        return {
          toConstantValue: jest.fn(),
        };
      });

      const module1 = new ContainerModule((bind) => {
        bind("Service1").toConstantValue("value1");
      });
      const module2 = new ContainerModule((bind) => {
        bind("Service2").toConstantValue("value2");
      });

      // Act
      const combined = combineModules(module1, module2);

      // Assert
      expect(combined).toBeInstanceOf(ContainerModule);
      combined.registry(
        mockBindWithReturn,
        mockUnbind,
        mockIsBound,
        mockRebind,
        mockUnbindAsync,
        mockOnActivation,
        mockOnDeactivation,
      );
      expect(bindCallCount.count).toBeGreaterThanOrEqual(2);
    });

    it("should execute modules in order", () => {
      // Arrange
      const executionOrder: Array<string> = [];
      const module1 = new ContainerModule(() => {
        executionOrder.push("module1");
      });
      const module2 = new ContainerModule(() => {
        executionOrder.push("module2");
      });
      const module3 = new ContainerModule(() => {
        executionOrder.push("module3");
      });

      // Act
      const combined = combineModules(module1, module2, module3);

      // Assert
      combined.registry(
        mockBind,
        mockUnbind,
        mockIsBound,
        mockRebind,
        mockUnbindAsync,
        mockOnActivation,
        mockOnDeactivation,
      );
      expect(executionOrder).toEqual(["module1", "module2", "module3"]);
    });

    it("should handle single module", () => {
      // Arrange
      const bindCallCount = { count: 0 };
      const mockBindWithReturn = jest.fn().mockImplementation(() => {
        bindCallCount.count++;
        return {
          toConstantValue: jest.fn(),
        };
      });

      const module1 = new ContainerModule((bind) => {
        bind("Service1").toConstantValue("value1");
      });

      // Act
      const combined = combineModules(module1);

      // Assert
      expect(combined).toBeInstanceOf(ContainerModule);
      combined.registry(
        mockBindWithReturn,
        mockUnbind,
        mockIsBound,
        mockRebind,
        mockUnbindAsync,
        mockOnActivation,
        mockOnDeactivation,
      );
      expect(bindCallCount.count).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty modules array", () => {
      // Act
      const combined = combineModules();

      // Assert
      expect(combined).toBeInstanceOf(ContainerModule);
      combined.registry(
        mockBind,
        mockUnbind,
        mockIsBound,
        mockRebind,
        mockUnbindAsync,
        mockOnActivation,
        mockOnDeactivation,
      );
      expect(mockBind).not.toHaveBeenCalled();
    });

    it("should pass all ContainerModule parameters to each module", () => {
      // Arrange
      const module1 = new ContainerModule(
        (
          bind,
          unbind,
          isBound,
          rebind,
          unbindAsync,
          onActivation,
          onDeactivation,
        ) => {
          expect(bind).toBe(mockBind);
          expect(unbind).toBe(mockUnbind);
          expect(isBound).toBe(mockIsBound);
          expect(rebind).toBe(mockRebind);
          expect(unbindAsync).toBe(mockUnbindAsync);
          expect(onActivation).toBe(mockOnActivation);
          expect(onDeactivation).toBe(mockOnDeactivation);
        },
      );

      // Act
      const combined = combineModules(module1);

      // Assert
      combined.registry(
        mockBind,
        mockUnbind,
        mockIsBound,
        mockRebind,
        mockUnbindAsync,
        mockOnActivation,
        mockOnDeactivation,
      );
    });
  });
});

// End of unit tests for: combineModules
