// Unit tests for: ResourceOwnerGuard constructor

import { ResourceOwnerGuard } from "../resource-owner.guard";

describe("ResourceOwnerGuard() ResourceOwnerGuard constructor", () => {
  describe("Happy Path", () => {
    it("should create instance with default param name", () => {
      // Act
      const guard = new ResourceOwnerGuard();

      // Assert
      expect(guard).toBeInstanceOf(ResourceOwnerGuard);
    });

    it("should create instance with custom param name", () => {
      // Arrange
      const paramName = "documentId";

      // Act
      const guard = new ResourceOwnerGuard(paramName);

      // Assert
      expect(guard).toBeInstanceOf(ResourceOwnerGuard);
    });
  });
});

// End of unit tests for: ResourceOwnerGuard constructor

