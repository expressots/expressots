// Unit tests for: ScopeRegistry.removeScope

import { ScopeRegistry } from "../scope-registry";

describe("ScopeRegistry.removeScope() removeScope method", () => {
  let registry: ScopeRegistry;

  beforeEach(() => {
    registry = new ScopeRegistry();
  });

  describe("Happy Path", () => {
    it("should remove scope store entirely", () => {
      // Arrange
      registry.getScopeStore("tenant");

      // Act
      registry.removeScope("tenant");

      // Assert
      expect(registry.hasScope("tenant")).toBe(false);
    });

    it("should not throw error for non-existent scope", () => {
      // Act & Assert
      expect(() => registry.removeScope("nonexistent")).not.toThrow();
    });

    it("should remove only the specified scope", () => {
      // Arrange
      registry.getScopeStore("tenant");
      registry.getScopeStore("transaction");

      // Act
      registry.removeScope("tenant");

      // Assert
      expect(registry.hasScope("tenant")).toBe(false);
      expect(registry.hasScope("transaction")).toBe(true);
    });
  });
});

// End of unit tests for: ScopeRegistry.removeScope
