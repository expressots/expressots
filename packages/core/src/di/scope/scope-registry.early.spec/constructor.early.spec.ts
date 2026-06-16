// Unit tests for: ScopeRegistry constructor

import { ScopeRegistry } from "../scope-registry";

describe("ScopeRegistry() ScopeRegistry constructor", () => {
  describe("Happy Path", () => {
    it("should create a ScopeRegistry instance", () => {
      // Act
      const registry = new ScopeRegistry();

      // Assert
      expect(registry).toBeInstanceOf(ScopeRegistry);
    });
  });
});

// End of unit tests for: ScopeRegistry constructor
