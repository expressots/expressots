// Unit tests for: bindToScope

import { BindingScopeEnum } from "../../di/inversify";
import { BaseModule } from "../container-module";

// Mocking decorators
jest.mock("../../decorator", () => ({
  provideSingleton: jest.fn(),
  provideTransient: jest.fn(),
  provide: jest.fn(),
}));

describe("BaseModule.bindToScope() bindToScope method", () => {
  let mockBind: jest.Mock;
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

    mockBind = jest.fn().mockImplementation((symbol: symbol) => {
      return {
        to: mockTo,
      }
    });
  });

  // Happy Path Tests
  describe("Happy Path", () => {
    it("should bind to singleton scope when bindingType is Singleton", () => {
      // Arrange
      const symbol = Symbol("TestSingleton");
      const target = class TestSingleton {};
      const bindingType = BindingScopeEnum.Singleton;

      // Act
      BaseModule.bindToScope(symbol, target, bindingType, mockBind);

      // Assert
      expect(mockBind).toHaveBeenCalledWith(symbol);
      expect(mockTo).toHaveBeenCalledWith(target);
      expect(mockInSingletonScope).toHaveBeenCalled();
    });

    it("should bind to transient scope when bindingType is Transient", () => {
      // Arrange
      const symbol = Symbol("TestTransient");
      const target = class TestTransient {};
      const bindingType = BindingScopeEnum.Transient;

      // Act
      BaseModule.bindToScope(symbol, target, bindingType, mockBind);

      // Assert
      expect(mockBind).toHaveBeenCalledWith(symbol);
      expect(mockTo).toHaveBeenCalledWith(target);
      expect(mockInTransientScope).toHaveBeenCalled();
      expect(require("../../decorator").provideTransient).toHaveBeenCalledWith(target);
    });

    it("should bind to request scope when bindingType is Request", () => {
      // Arrange
      const symbol = Symbol("TestRequest");
      const target = class TestRequest {};
      const bindingType = BindingScopeEnum.Request;

      // Act
      BaseModule.bindToScope(symbol, target, bindingType, mockBind);

      // Assert
      expect(mockBind).toHaveBeenCalledWith(symbol);
      expect(mockTo).toHaveBeenCalledWith(target);
      expect(mockInRequestScope).toHaveBeenCalled();
    });
  });

  // Edge Case Tests
  describe("Edge Cases", () => {
   it("should default to request scope when bindingType is unknown", () => {
          // Arrange
          const symbol = Symbol("TestUnknown");
          const target = class TestUnknown {};
          const bindingType = "UnknownScope" as any;
          
          // Act
          BaseModule.bindToScope(symbol, target, bindingType, mockBind);
    
          // Assert
          expect(mockBind).toHaveBeenCalledWith(symbol);
          expect(mockTo).toHaveBeenCalledWith(target);
          expect(mockInRequestScope).toHaveBeenCalled();
    });

    it("should handle undefined bindingType gracefully", () => {
      // Arrange
      const symbol = Symbol("TestUndefined");
      const target = class TestUndefined {};
      const bindingType = undefined as any;

      // Act
      BaseModule.bindToScope(symbol, target, bindingType, mockBind as any);

      // Assert
      expect(mockBind).toHaveBeenCalledWith(symbol);
      expect(mockTo).toHaveBeenCalledWith(target);
      expect(mockInRequestScope).toHaveBeenCalled();
    });
  });
});

// End of unit tests for: bindToScope
