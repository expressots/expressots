// Unit tests for: bindToScope

import { Scope } from "../../di/inversify";
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
  let mockInScope: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockInSingletonScope = jest.fn();
    mockInTransientScope = jest.fn();
    mockInRequestScope = jest.fn();
    mockInScope = jest.fn().mockReturnValue({
      when: jest.fn(),
      whenTargetNamed: jest.fn(),
      whenTargetTagged: jest.fn(),
      whenInjectedInto: jest.fn(),
      whenParentNamed: jest.fn(),
      whenParentTagged: jest.fn(),
      whenAnyAncestorIs: jest.fn(),
      whenNoAncestorIs: jest.fn(),
      whenAnyAncestorNamed: jest.fn(),
      whenAnyAncestorTagged: jest.fn(),
      whenNoAncestorNamed: jest.fn(),
      whenNoAncestorTagged: jest.fn(),
      whenAnyAncestorMatches: jest.fn(),
      whenNoAncestorMatches: jest.fn(),
      onActivation: jest.fn(),
      onDeactivation: jest.fn(),
    });

    mockTo = jest.fn().mockReturnValue({
      inSingletonScope: mockInSingletonScope,
      inTransientScope: mockInTransientScope,
      inRequestScope: mockInRequestScope,
      inScope: mockInScope,
    });

    mockBind = jest.fn().mockImplementation((symbol: symbol) => {
      return {
        to: mockTo,
      };
    });
  });

  // Happy Path Tests
  describe("Happy Path", () => {
    it("should bind to singleton scope when bindingType is Singleton", () => {
      // Arrange
      const symbol = Symbol("TestSingleton");
      const target = class TestSingleton {};
      const bindingType = Scope.Singleton;

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
      const bindingType = Scope.Transient;

      // Act
      BaseModule.bindToScope(symbol, target, bindingType, mockBind);

      // Assert
      expect(mockBind).toHaveBeenCalledWith(symbol);
      expect(mockTo).toHaveBeenCalledWith(target);
      expect(mockInTransientScope).toHaveBeenCalled();
      expect(require("../../decorator").provideTransient).toHaveBeenCalledWith(
        target,
      );
    });

    it("should bind to request scope when bindingType is Request", () => {
      // Arrange
      const symbol = Symbol("TestRequest");
      const target = class TestRequest {};
      const bindingType = Scope.Request;

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
    it("should use custom scope when bindingType is a custom scope name", () => {
      // Arrange
      const symbol = Symbol("TestCustomScope");
      const target = class TestCustomScope {};
      const bindingType = "tenant" as any;

      // Act
      BaseModule.bindToScope(symbol, target, bindingType, mockBind);

      // Assert
      expect(mockBind).toHaveBeenCalledWith(symbol);
      expect(mockTo).toHaveBeenCalledWith(target);
      expect(mockInScope).toHaveBeenCalledWith("tenant");
      expect(mockInRequestScope).not.toHaveBeenCalled();
    });

    it("should default to request scope when bindingType is invalid", () => {
      // Arrange
      const symbol = Symbol("TestInvalid");
      const target = class TestInvalid {};
      const bindingType = undefined as any;

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
