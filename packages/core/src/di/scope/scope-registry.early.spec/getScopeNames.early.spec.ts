// Unit tests for: ScopeRegistry.getScopeNames

import { ScopeRegistry } from "../scope-registry";

describe("ScopeRegistry.getScopeNames() getScopeNames method", () => {
  let registry: ScopeRegistry;

  beforeEach(() => {
    registry = new ScopeRegistry();
  });

  describe("Happy Path", () => {
    it("should return empty array when no scopes exist", () => {
      // Act
      const names = registry.getScopeNames();

      // Assert
      expect(names).toEqual([]);
    });

    it("should return all registered scope names", () => {
      // Arrange
      registry.getScopeStore("tenant");
      registry.getScopeStore("transaction");

      // Act
      const names = registry.getScopeNames();

      // Assert
      expect(names).toContain("tenant");
      expect(names).toContain("transaction");
      expect(names.length).toBe(2);
    });

    it("should not include removed scope names", () => {
      // Arrange
      registry.getScopeStore("tenant");
      registry.getScopeStore("transaction");
      registry.removeScope("tenant");

      // Act
      const names = registry.getScopeNames();

      // Assert
      expect(names).not.toContain("tenant");
      expect(names).toContain("transaction");
    });
  });
});

// End of unit tests for: ScopeRegistry.getScopeNames
