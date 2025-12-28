// Unit tests for: AttributeBasedGuard constructor

import { AttributeBasedGuard } from "../attribute-based.guard";

describe("AttributeBasedGuard() AttributeBasedGuard constructor", () => {
  describe("Happy Path", () => {
    it("should create instance with policy function", () => {
      // Arrange
      const policy = jest.fn().mockReturnValue(true);

      // Act
      const guard = new AttributeBasedGuard(policy);

      // Assert
      expect(guard).toBeInstanceOf(AttributeBasedGuard);
    });
  });

  describe("Edge Cases", () => {
    it("should throw error when policy is null", () => {
      // Act & Assert
      expect(() => new AttributeBasedGuard(null as any)).toThrow(
        "AttributeBasedGuard requires a policy function",
      );
    });

    it("should throw error when policy is undefined", () => {
      // Act & Assert
      expect(() => new AttributeBasedGuard(undefined as any)).toThrow(
        "AttributeBasedGuard requires a policy function",
      );
    });

    it("should throw error when policy is not a function", () => {
      // Act & Assert
      expect(() => new AttributeBasedGuard("not a function" as any)).toThrow(
        "AttributeBasedGuard requires a policy function",
      );
    });
  });
});

// End of unit tests for: AttributeBasedGuard constructor
