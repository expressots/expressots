// Unit tests for: RequirePolicy factory function

import { RequirePolicy, AttributeBasedGuard } from "../attribute-based.guard";

describe("RequirePolicy() RequirePolicy factory function", () => {
  describe("Happy Path", () => {
    it("should create an AttributeBasedGuard instance", () => {
      // Arrange
      const policy = jest.fn().mockReturnValue(true);

      // Act
      const guard = RequirePolicy(policy);

      // Assert
      expect(guard).toBeInstanceOf(AttributeBasedGuard);
    });
  });
});

// End of unit tests for: RequirePolicy factory function

