// Unit tests for: createModule

import "reflect-metadata";
import { ContainerModule, interfaces } from "../../di/inversify";
import { createModule, SimpleBindingsCallback, ExtendedBindingsCallback } from "../container-module";

describe("createModule() createModule function", () => {
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
    it("should create a module from a simple bindings callback", () => {
      // Arrange
      const mockToConstantValue = jest.fn();
      const mockBindWithReturn = jest.fn().mockReturnValue({
        toConstantValue: mockToConstantValue,
      });

      const callback: SimpleBindingsCallback = (bind) => {
        bind("Service1").toConstantValue("value1");
      };

      // Act
      const module = createModule(callback);

      // Assert
      expect(module).toBeInstanceOf(ContainerModule);
      module.registry(
        mockBindWithReturn,
        mockUnbind,
        mockIsBound,
        mockRebind,
        mockUnbindAsync,
        mockOnActivation,
        mockOnDeactivation,
      );
      expect(mockBindWithReturn).toHaveBeenCalled();
    });

    it("should create a module from an extended bindings callback", () => {
      // Arrange
      const mockToConstantValue = jest.fn();
      const mockBindWithReturn = jest.fn().mockReturnValue({
        toConstantValue: mockToConstantValue,
      });

      const callback: ExtendedBindingsCallback = (bind, unbind, isBound, rebind) => {
        bind("Service1").toConstantValue("value1");
        expect(unbind).toBe(mockUnbind);
        expect(isBound).toBe(mockIsBound);
        expect(rebind).toBe(mockRebind);
      };

      // Act
      const module = createModule(callback);

      // Assert
      expect(module).toBeInstanceOf(ContainerModule);
      module.registry(
        mockBindWithReturn,
        mockUnbind,
        mockIsBound,
        mockRebind,
        mockUnbindAsync,
        mockOnActivation,
        mockOnDeactivation,
      );
      expect(mockBindWithReturn).toHaveBeenCalled();
    });

    it("should pass bind function to simple callback", () => {
      // Arrange
      const callback: SimpleBindingsCallback = jest.fn();

      // Act
      const module = createModule(callback);

      // Assert
      module.registry(
        mockBind,
        mockUnbind,
        mockIsBound,
        mockRebind,
        mockUnbindAsync,
        mockOnActivation,
        mockOnDeactivation,
      );
      // Simple callback receives all 4 parameters but only uses bind
      expect(callback).toHaveBeenCalledWith(mockBind, mockUnbind, mockIsBound, mockRebind);
    });

    it("should pass all parameters to extended callback", () => {
      // Arrange
      const callback: ExtendedBindingsCallback = jest.fn();

      // Act
      const module = createModule(callback);

      // Assert
      module.registry(
        mockBind,
        mockUnbind,
        mockIsBound,
        mockRebind,
        mockUnbindAsync,
        mockOnActivation,
        mockOnDeactivation,
      );
      expect(callback).toHaveBeenCalledWith(mockBind, mockUnbind, mockIsBound, mockRebind);
    });
  });

  describe("Edge Cases", () => {
    it("should handle callback that does nothing", () => {
      // Arrange
      const callback: SimpleBindingsCallback = () => {
        // Empty callback
      };

      // Act
      const module = createModule(callback);

      // Assert
      expect(module).toBeInstanceOf(ContainerModule);
      module.registry(
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

    it("should handle callback with multiple bindings", () => {
      // Arrange
      const mockToConstantValue = jest.fn();
      const mockBindWithReturn = jest.fn().mockReturnValue({
        toConstantValue: mockToConstantValue,
      });

      const callback: SimpleBindingsCallback = (bind) => {
        bind("Service1").toConstantValue("value1");
        bind("Service2").toConstantValue("value2");
        bind("Service3").toConstantValue("value3");
      };

      // Act
      const module = createModule(callback);

      // Assert
      module.registry(
        mockBindWithReturn,
        mockUnbind,
        mockIsBound,
        mockRebind,
        mockUnbindAsync,
        mockOnActivation,
        mockOnDeactivation,
      );
      expect(mockBindWithReturn).toHaveBeenCalledTimes(3);
      expect(mockToConstantValue).toHaveBeenCalledTimes(3);
    });
  });
});

// End of unit tests for: createModule

