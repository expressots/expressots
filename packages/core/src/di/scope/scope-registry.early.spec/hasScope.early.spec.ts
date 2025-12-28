// Unit tests for: ScopeRegistry.hasScope

import { ScopeRegistry } from "../scope-registry";

describe("ScopeRegistry.hasScope() hasScope method", () => {
  let registry: ScopeRegistry;

  beforeEach(() => {
    registry = new ScopeRegistry();
  });

  describe("Happy Path", () => {
    it("should return false for non-existent scope", () => {
      // Act
      const hasScope = registry.hasScope("nonexistent");

      // Assert
      expect(hasScope).toBe(false);
    });

    it("should return true after creating scope store", () => {
      // Arrange
      registry.getScopeStore("tenant");

      // Act
      const hasScope = registry.hasScope("tenant");

      // Assert
      expect(hasScope).toBe(true);
    });
  });
});

// End of unit tests for: ScopeRegistry.hasScope
