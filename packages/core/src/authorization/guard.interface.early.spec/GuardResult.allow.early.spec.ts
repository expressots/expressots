// Unit tests for: GuardResult.allow

import { GuardResult } from "../guard.interface";

describe("GuardResult.allow() allow static method", () => {
  describe("Happy Path", () => {
    it("should create an allow result", () => {
      // Act
      const result = GuardResult.allow();

      // Assert
      expect(result).toBeInstanceOf(GuardResult);
      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should create multiple independent allow results", () => {
      // Act
      const result1 = GuardResult.allow();
      const result2 = GuardResult.allow();

      // Assert
      expect(result1).not.toBe(result2);
      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });
  });
});

// End of unit tests for: GuardResult.allow
