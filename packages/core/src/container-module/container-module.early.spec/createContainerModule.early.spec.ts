// Unit tests for: createContainerModule

import "reflect-metadata";
import { BindingScopeEnum, ContainerModule } from "../../di/inversify";
import { BINDING_TYPE_METADATA_KEY, BaseModule } from "../container-module";

describe("BaseModule.createContainerModule() createContainerModule method", () => {
  let mockBind: jest.Mock;
  let mockUnbind: jest.Mock;
  let mockIsBound: jest.Mock;
  let mockRebind: jest.Mock;
  let mockUnbindAsync: jest.Mock;
  let mockOnActivation: jest.Mock;
  let mockOnDeactivation: jest.Mock;
  let mockTo: jest.Mock;
  let mockInSingletonScope: jest.Mock;
  let mockInTransientScope: jest.Mock;
  let mockInRequestScope: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockInSingletonScope = jest.fn();
    mockInTransientScope = jest.fn();
    mockInRequestScope = jest.fn();

    mockTo = jest.fn().mockReturnValue({
      inSingletonScope: mockInSingletonScope,
      inTransientScope: mockInTransientScope,
      inRequestScope: mockInRequestScope,
    });

    mockBind = jest.fn().mockImplementation((serviceIdentifier: symbol) => {
      return {
        to: mockTo,
      };
    });

    mockUnbind = jest.fn();
    mockIsBound = jest.fn();
    mockRebind = jest.fn();
    mockUnbindAsync = jest.fn();
    mockOnActivation = jest.fn();
    mockOnDeactivation = jest.fn();
  });

  describe("Happy Path", () => {
    it("should create a ContainerModule with singleton scope for controllers", () => {
      // Arrange
      class MockController {}
      Reflect.defineMetadata(
        BINDING_TYPE_METADATA_KEY,
        BindingScopeEnum.Singleton,
        MockController,
      );

      // Act
      const module = BaseModule.createContainerModule(
        [MockController],
        BindingScopeEnum.Singleton,
      );

      // Assert
      expect(module).toBeInstanceOf(ContainerModule);
      module.registry(
        mockBind as any,
        mockUnbind,
        mockIsBound,
        mockRebind,
        mockUnbindAsync,
        mockOnActivation,
        mockOnDeactivation,
      );
      expect(mockBind).toHaveBeenCalledWith(Symbol.for("MockController"));
      expect(mockTo).toHaveBeenCalledWith(MockController);
      expect(mockInSingletonScope).toHaveBeenCalled();
    });

    it("should create a ContainerModule with transient scope for controllers", () => {
      // Arrange
      class MockController {}
      Reflect.defineMetadata(
        BINDING_TYPE_METADATA_KEY,
        BindingScopeEnum.Transient,
        MockController,
      );

      // Act
      const module = BaseModule.createContainerModule(
        [MockController],
        BindingScopeEnum.Transient as any,
      );

      // Assert
      expect(module).toBeInstanceOf(ContainerModule);
      module.registry(
        mockBind as any,
        mockUnbind,
        mockIsBound,
        mockRebind,
        mockUnbindAsync,
        mockOnActivation,
        mockOnDeactivation,
      );
      expect(mockBind).toHaveBeenCalledWith(Symbol.for("MockController"));
      expect(mockTo).toHaveBeenCalledWith(MockController);
      expect(mockInTransientScope).toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle controllers with no metadata gracefully", () => {
      // Arrange
      class MockController {}

      // Act
      const module = BaseModule.createContainerModule([MockController]);

      // Assert
      expect(module).toBeInstanceOf(ContainerModule);
      module.registry(
        mockBind as any,
        mockUnbind,
        mockIsBound,
        mockRebind,
        mockUnbindAsync,
        mockOnActivation,
        mockOnDeactivation,
      );
      expect(mockBind).toHaveBeenCalledWith(Symbol.for("MockController"));
      expect(mockTo).toHaveBeenCalledWith(MockController);
      expect(mockInRequestScope).toHaveBeenCalled();
    });

    it("should handle an empty array of controllers", () => {
      // Act
      const module = BaseModule.createContainerModule([]);

      // Assert
      expect(module).toBeInstanceOf(ContainerModule);
      module.registry(
        mockBind as any,
        mockUnbind,
        mockIsBound,
        mockRebind,
        mockUnbindAsync,
        mockOnActivation,
        mockOnDeactivation,
      );
      expect(mockBind).not.toHaveBeenCalled();
    });

    it("should default to request scope if no scope is provided", () => {
      // Arrange
      class MockController {}
      Reflect.defineMetadata(
        BINDING_TYPE_METADATA_KEY,
        undefined,
        MockController,
      );

      // Act
      const module = BaseModule.createContainerModule([MockController]);

      // Assert
      expect(module).toBeInstanceOf(ContainerModule);
      module.registry(
        mockBind as any,
        mockUnbind,
        mockIsBound,
        mockRebind,
        mockUnbindAsync,
        mockOnActivation,
        mockOnDeactivation,
      );
      expect(mockBind).toHaveBeenCalledWith(Symbol.for("MockController"));
      expect(mockTo).toHaveBeenCalledWith(MockController);
    });
  });
});

// End of unit tests for: createContainerModule
