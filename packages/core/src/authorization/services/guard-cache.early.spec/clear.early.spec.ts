// Unit tests for: clear

import { GuardCache } from "../guard-cache";
import { GuardResult } from "../../guard.interface";

describe("GuardCache.clear() clear method", () => {
  let cache: GuardCache;

  beforeEach(() => {
    cache = new GuardCache();
  });

  describe("Happy Path", () => {
    it("should clear all cached results", () => {
      // Arrange
      cache.set("scope1", "key1", GuardResult.allow());
      cache.set("scope2", "key2", GuardResult.deny());

      // Act
      cache.clear();

      // Assert
      expect(cache.get("scope1", "key1")).toBeNull();
      expect(cache.get("scope2", "key2")).toBeNull();
    });

    it("should handle clearing empty cache", () => {
      // Act & Assert
      expect(() => cache.clear()).not.toThrow();
    });
  });
});

// End of unit tests for: clear
