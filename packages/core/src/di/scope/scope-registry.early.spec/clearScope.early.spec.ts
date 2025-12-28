// Unit tests for: ScopeRegistry.clearScope

import { ScopeRegistry } from "../scope-registry";

describe("ScopeRegistry.clearScope() clearScope method", () => {
  let registry: ScopeRegistry;

  beforeEach(() => {
    registry = new ScopeRegistry();
  });

  describe("Happy Path", () => {
    it("should clear instances from scope store", () => {
      // Arrange
      const store = registry.getScopeStore("tenant");
      store.set(1, "instance1");
      store.set(2, "instance2");

      // Act
      registry.clearScope("tenant");

      // Assert
      expect(store.size).toBe(0);
    });

    it("should not throw error for non-existent scope", () => {
      // Act & Assert
      expect(() => registry.clearScope("nonexistent")).not.toThrow();
    });

    it("should clear only the specified scope", () => {
      // Arrange
      const tenantStore = registry.getScopeStore("tenant");
      const transactionStore = registry.getScopeStore("transaction");
      tenantStore.set(1, "tenant1");
      transactionStore.set(1, "transaction1");

      // Act
      registry.clearScope("tenant");

      // Assert
      expect(tenantStore.size).toBe(0);
      expect(transactionStore.size).toBe(1);
    });
  });
});

// End of unit tests for: ScopeRegistry.clearScope
