// Unit tests for: saveToScope

import { Scope } from "../../constants/literal_types";
import { saveToScope } from "../scope";
import { interfaces } from "../../interfaces/interfaces";
import { globalScopeRegistry } from "../scope-registry";

describe("saveToScope() saveToScope function", () => {
  let mockRequestScope: interfaces.RequestScope;
  let mockBinding: interfaces.Binding<unknown>;

  beforeEach(() => {
    mockRequestScope = new Map() as interfaces.RequestScope;
    mockBinding = {
      id: 1,
      scope: Scope.Transient,
      activated: false,
      cache: null,
    } as interfaces.Binding<unknown>;
    globalScopeRegistry.clearAll();
  });

  describe("Happy Path", () => {
    it("should save to Singleton scope cache", () => {
      // Arrange
      const instance = { value: "test" };
      mockBinding.scope = Scope.Singleton;

      // Act
      saveToScope(mockRequestScope, mockBinding, instance);

      // Assert
      expect(mockBinding.cache).toBe(instance);
      expect(mockBinding.activated).toBe(true);
    });

    it("should save to Request scope", () => {
      // Arrange
      const instance = { value: "test" };
      mockBinding.scope = Scope.Request;

      // Act
      saveToScope(mockRequestScope, mockBinding, instance);

      // Assert
      expect(mockRequestScope.get(mockBinding.id)).toBe(instance);
    });

    it("should save to custom scope store", () => {
      // Arrange
      const instance = { value: "test" };
      mockBinding.scope = "custom";

      // Act
      saveToScope(mockRequestScope, mockBinding, instance);

      // Assert
      const customStore = globalScopeRegistry.getScopeStore("custom");
      expect(customStore.get(mockBinding.id)).toBe(instance);
    });

    it("should not overwrite existing instance in Request scope", () => {
      // Arrange
      const existingInstance = { value: "existing" };
      const newInstance = { value: "new" };
      mockBinding.scope = Scope.Request;
      mockRequestScope.set(mockBinding.id, existingInstance);

      // Act
      saveToScope(mockRequestScope, mockBinding, newInstance);

      // Assert
      expect(mockRequestScope.get(mockBinding.id)).toBe(existingInstance);
    });

    it("should not overwrite existing instance in custom scope", () => {
      // Arrange
      const existingInstance = { value: "existing" };
      const newInstance = { value: "new" };
      mockBinding.scope = "custom";
      const customStore = globalScopeRegistry.getScopeStore("custom");
      customStore.set(mockBinding.id, existingInstance);

      // Act
      saveToScope(mockRequestScope, mockBinding, newInstance);

      // Assert
      expect(customStore.get(mockBinding.id)).toBe(existingInstance);
    });
  });
});

// End of unit tests for: saveToScope
