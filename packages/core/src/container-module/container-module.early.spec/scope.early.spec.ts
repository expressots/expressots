// Unit tests for: scope

import { provideSingleton, provideTransient } from "../../decorator";
import { provide } from "../../di/binding-decorator";
import { BindingScopeEnum, interfaces } from "../../di/inversify";
import { BINDING_TYPE_METADATA_KEY, scope } from "../container-module";
import "reflect-metadata";

jest.mock("../../decorator", () => ({
  provideSingleton: jest.fn(),
  provideTransient: jest.fn(),
}));

jest.mock("../../di/binding-decorator", () => ({
  provide: jest.fn(),
}));

beforeEach(() => {
    jest.clearAllMocks();
});

describe("scope() scope method", () => {
  // Happy path tests
  describe("Happy Path", () => {
    it("should apply Singleton binding and call provideSingleton", () => {
      // Arrange
      class TestClass {}
      const binding = BindingScopeEnum.Singleton;

      // Act
      scope(binding)(TestClass);

      // Assert
      expect(Reflect.getMetadata(BINDING_TYPE_METADATA_KEY, TestClass)).toBe(
        binding,
      );
      expect(provideSingleton).toHaveBeenCalledWith(TestClass);
      expect(provideTransient).not.toHaveBeenCalled();
      expect(provide).not.toHaveBeenCalled();
    });

    it("should apply Transient binding and call provideTransient", () => {
      // Arrange
      class TestClass {}
      const binding = BindingScopeEnum.Transient;

      // Act
      scope(binding)(TestClass);

      // Assert
      expect(Reflect.getMetadata(BINDING_TYPE_METADATA_KEY, TestClass)).toBe(
        binding,
      );
      expect(provideTransient).toHaveBeenCalledWith(TestClass);
      expect(provideSingleton).not.toHaveBeenCalled();
      expect(provide).not.toHaveBeenCalled();
    });

    it("should apply default binding and call provide", () => {
      // Arrange
      class TestClass {}
      const binding = BindingScopeEnum.Request; // Assuming Request is the default case

      // Act
      scope(binding)(TestClass);

      // Assert
      expect(Reflect.getMetadata(BINDING_TYPE_METADATA_KEY, TestClass)).toBe(
        binding,
      );
      expect(provide).toHaveBeenCalledWith(TestClass);
      expect(provideSingleton).not.toHaveBeenCalled();
      expect(provideTransient).not.toHaveBeenCalled();
    });
  });

  // Edge case tests
  describe("Edge Cases", () => {
    it("should not redefine metadata if it already exists", () => {
      // Arrange
      class TestClass {}
      const binding = BindingScopeEnum.Singleton;
      Reflect.defineMetadata(BINDING_TYPE_METADATA_KEY, binding, TestClass);

      // Act
      scope(BindingScopeEnum.Transient)(TestClass);

      // Assert
      expect(Reflect.getMetadata(BINDING_TYPE_METADATA_KEY, TestClass)).toBe(
        binding,
      );
      expect(provideSingleton).not.toHaveBeenCalled();
      expect(provideTransient).not.toHaveBeenCalled();
      expect(provide).not.toHaveBeenCalled();
    });

    it("should handle undefined binding gracefully", () => {
      // Arrange
      class TestClass {}
      const binding = undefined as unknown as interfaces.BindingScope;

      // Act
      scope(binding)(TestClass);

      // Assert
      expect(Reflect.getMetadata(BINDING_TYPE_METADATA_KEY, TestClass)).toBe(
        binding,
      );
      expect(provide).toHaveBeenCalledWith(TestClass);
      expect(provideSingleton).not.toHaveBeenCalled();
      expect(provideTransient).not.toHaveBeenCalled();
    });
  });
});

// End of unit tests for: scope
