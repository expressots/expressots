// Unit tests for: get

import { GuardCache } from "../guard-cache";
import { GuardResult } from "../../guard.interface";

describe("GuardCache.get() get method", () => {
  let cache: GuardCache;

  beforeEach(() => {
    cache = new GuardCache();
  });

  describe("Happy Path", () => {
    it("should return cached result", () => {
      // Arrange
      const result = GuardResult.allow();
      cache.set("scope1", "key1", result);

      // Act
      const cached = cache.get("scope1", "key1");

      // Assert
      expect(cached).toBe(result);
    });

    it("should return null for non-existent scope", () => {
      // Act
      const cached = cache.get("non-existent", "key1");

      // Assert
      expect(cached).toBeNull();
    });

    it("should return null for non-existent key", () => {
      // Arrange
      cache.set("scope1", "key1", GuardResult.allow());

      // Act
      const cached = cache.get("scope1", "key2");

      // Assert
      expect(cached).toBeNull();
    });
  });
});

// End of unit tests for: get

