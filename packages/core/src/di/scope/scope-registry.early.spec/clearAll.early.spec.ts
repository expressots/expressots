// Unit tests for: ScopeRegistry.clearAll

import { ScopeRegistry } from "../scope-registry";

describe("ScopeRegistry.clearAll() clearAll method", () => {
  let registry: ScopeRegistry;

  beforeEach(() => {
    registry = new ScopeRegistry();
  });

  describe("Happy Path", () => {
    it("should clear all scope stores", () => {
      // Arrange
      registry.getScopeStore("tenant");
      registry.getScopeStore("transaction");

      // Act
      registry.clearAll();

      // Assert
      expect(registry.getScopeNames().length).toBe(0);
    });

    it("should handle empty registry", () => {
      // Act & Assert
      expect(() => registry.clearAll()).not.toThrow();
      expect(registry.getScopeNames().length).toBe(0);
    });
  });
});

// End of unit tests for: ScopeRegistry.clearAll
