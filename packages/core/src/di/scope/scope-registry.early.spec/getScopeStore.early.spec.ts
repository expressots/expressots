// Unit tests for: ScopeRegistry.getScopeStore

import { ScopeRegistry } from "../scope-registry";

describe("ScopeRegistry.getScopeStore() getScopeStore method", () => {
  let registry: ScopeRegistry;

  beforeEach(() => {
    registry = new ScopeRegistry();
  });

  describe("Happy Path", () => {
    it("should create and return a scope store for new scope name", () => {
      // Act
      const store = registry.getScopeStore("tenant");

      // Assert
      expect(store).toBeInstanceOf(Map);
    });

    it("should return the same store for the same scope name", () => {
      // Act
      const store1 = registry.getScopeStore("tenant");
      const store2 = registry.getScopeStore("tenant");

      // Assert
      expect(store1).toBe(store2);
    });

    it("should return different stores for different scope names", () => {
      // Act
      const tenantStore = registry.getScopeStore("tenant");
      const transactionStore = registry.getScopeStore("transaction");

      // Assert
      expect(tenantStore).not.toBe(transactionStore);
    });
  });
});

// End of unit tests for: ScopeRegistry.getScopeStore
