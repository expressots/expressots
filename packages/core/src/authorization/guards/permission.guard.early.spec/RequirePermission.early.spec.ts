// Unit tests for: RequirePermission factory function

import { RequirePermission, PermissionGuard } from "../permission.guard";

describe("RequirePermission() RequirePermission factory function", () => {
  describe("Happy Path", () => {
    it("should create a PermissionGuard instance", () => {
      // Arrange
      const permission = "documents:read";

      // Act
      const guard = RequirePermission(permission);

      // Assert
      expect(guard).toBeInstanceOf(PermissionGuard);
    });
  });
});

// End of unit tests for: RequirePermission factory function

