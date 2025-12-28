// Unit tests for: tryGetFromScope

import { BindingScopeEnum } from "../../constants/literal_types";
import { tryGetFromScope } from "../scope";
import { interfaces } from "../../interfaces/interfaces";
import { globalScopeRegistry } from "../scope-registry";

describe("tryGetFromScope() tryGetFromScope function", () => {
  let mockRequestScope: interfaces.RequestScope;
  let mockBinding: interfaces.Binding<unknown>;

  beforeEach(() => {
    mockRequestScope = new Map() as interfaces.RequestScope;
    mockBinding = {
      id: 1,
      scope: BindingScopeEnum.Transient,
      activated: false,
      cache: null,
    } as interfaces.Binding<unknown>;
    globalScopeRegistry.clearAll();
  });

  describe("Happy Path", () => {
    it("should return cached instance for Singleton scope", () => {
      // Arrange
      const instance = { value: "test" };
      mockBinding.scope = BindingScopeEnum.Singleton;
      mockBinding.activated = true;
      mockBinding.cache = instance;

      // Act
      const result = tryGetFromScope(mockRequestScope, mockBinding);

      // Assert
      expect(result).toBe(instance);
    });

    it("should return instance from request scope for Request scope", () => {
      // Arrange
      const instance = { value: "test" };
      mockBinding.scope = BindingScopeEnum.Request;
      mockRequestScope.set(mockBinding.id, instance);

      // Act
      const result = tryGetFromScope(mockRequestScope, mockBinding);

      // Assert
      expect(result).toBe(instance);
    });

    it("should return instance from custom scope store", () => {
      // Arrange
      const instance = { value: "test" };
      mockBinding.scope = "custom";
      const customStore = globalScopeRegistry.getScopeStore("custom");
      customStore.set(mockBinding.id, instance);

      // Act
      const result = tryGetFromScope(mockRequestScope, mockBinding);

      // Assert
      expect(result).toBe(instance);
    });

    it("should return null for Transient scope", () => {
      // Arrange
      mockBinding.scope = BindingScopeEnum.Transient;

      // Act
      const result = tryGetFromScope(mockRequestScope, mockBinding);

      // Assert
      expect(result).toBeNull();
    });

    it("should return null when instance not found in scope", () => {
      // Arrange
      mockBinding.scope = BindingScopeEnum.Request;

      // Act
      const result = tryGetFromScope(mockRequestScope, mockBinding);

      // Assert
      expect(result).toBeNull();
    });
  });
});

// End of unit tests for: tryGetFromScope

