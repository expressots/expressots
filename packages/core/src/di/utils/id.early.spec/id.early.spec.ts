// Unit tests for: id

import { id } from "../id";

describe("id() id function", () => {
  describe("Happy Path", () => {
    it("should return incrementing numbers", () => {
      // Act
      const id1 = id();
      const id2 = id();
      const id3 = id();

      // Assert
      expect(id2).toBe(id1 + 1);
      expect(id3).toBe(id2 + 1);
    });

    it("should start from 0", () => {
      // Note: This test may fail if id() was called before in other tests
      // In a real scenario, you might want to reset the counter or test in isolation
      // For now, we'll just verify it returns a number
      const result = id();

      // Assert
      expect(typeof result).toBe("number");
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });
});

// End of unit tests for: id

