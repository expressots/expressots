// Unit tests for: set

import { GuardCache } from "../guard-cache";
import { GuardResult } from "../../guard.interface";

describe("GuardCache.set() set method", () => {
  let cache: GuardCache;

  beforeEach(() => {
    cache = new GuardCache();
  });

  describe("Happy Path", () => {
    it("should set cached result", () => {
      // Arrange
      const result = GuardResult.allow();

      // Act
      cache.set("scope1", "key1", result);

      // Assert
      const cached = cache.get("scope1", "key1");
      expect(cached).toBe(result);
    });

    it("should overwrite existing cached result", () => {
      // Arrange
      const result1 = GuardResult.allow();
      const result2 = GuardResult.deny();

      // Act
      cache.set("scope1", "key1", result1);
      cache.set("scope1", "key1", result2);

      // Assert
      const cached = cache.get("scope1", "key1");
      expect(cached).toBe(result2);
    });

    it("should handle multiple scopes", () => {
      // Arrange
      const result1 = GuardResult.allow();
      const result2 = GuardResult.deny();

      // Act
      cache.set("scope1", "key1", result1);
      cache.set("scope2", "key1", result2);

      // Assert
      expect(cache.get("scope1", "key1")).toBe(result1);
      expect(cache.get("scope2", "key1")).toBe(result2);
    });
  });
});

// End of unit tests for: set
