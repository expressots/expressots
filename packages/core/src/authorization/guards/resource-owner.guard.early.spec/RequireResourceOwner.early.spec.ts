// Unit tests for: RequireResourceOwner factory function

import {
  RequireResourceOwner,
  ResourceOwnerGuard,
} from "../resource-owner.guard";

describe("RequireResourceOwner() RequireResourceOwner factory function", () => {
  describe("Happy Path", () => {
    it("should create a ResourceOwnerGuard instance with default param name", () => {
      // Act
      const guard = RequireResourceOwner();

      // Assert
      expect(guard).toBeInstanceOf(ResourceOwnerGuard);
    });

    it("should create a ResourceOwnerGuard instance with custom param name", () => {
      // Arrange
      const paramName = "documentId";

      // Act
      const guard = RequireResourceOwner(paramName);

      // Assert
      expect(guard).toBeInstanceOf(ResourceOwnerGuard);
    });
  });
});

// End of unit tests for: RequireResourceOwner factory function
