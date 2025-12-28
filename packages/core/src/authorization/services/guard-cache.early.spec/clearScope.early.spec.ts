// Unit tests for: clearScope

import { GuardCache } from "../guard-cache";
import { GuardResult } from "../../guard.interface";

describe("GuardCache.clearScope() clearScope method", () => {
  let cache: GuardCache;

  beforeEach(() => {
    cache = new GuardCache();
  });

  describe("Happy Path", () => {
    it("should clear all entries for a scope", () => {
      // Arrange
      cache.set("scope1", "key1", GuardResult.allow());
      cache.set("scope1", "key2", GuardResult.deny());
      cache.set("scope2", "key1", GuardResult.allow());

      // Act
      cache.clearScope("scope1");

      // Assert
      expect(cache.get("scope1", "key1")).toBeNull();
      expect(cache.get("scope1", "key2")).toBeNull();
      expect(cache.get("scope2", "key1")).toBeDefined();
    });

    it("should handle clearing non-existent scope", () => {
      // Act & Assert
      expect(() => cache.clearScope("non-existent")).not.toThrow();
    });
  });
});

// End of unit tests for: clearScope

