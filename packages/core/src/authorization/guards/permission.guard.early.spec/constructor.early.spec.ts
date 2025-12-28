// Unit tests for: PermissionGuard constructor

import { PermissionGuard } from "../permission.guard";

describe("PermissionGuard() PermissionGuard constructor", () => {
  describe("Happy Path", () => {
    it("should create instance with permission", () => {
      // Arrange
      const permission = "documents:read";

      // Act
      const guard = new PermissionGuard(permission);

      // Assert
      expect(guard).toBeInstanceOf(PermissionGuard);
    });
  });

  describe("Edge Cases", () => {
    it("should throw error when permission is empty string", () => {
      // Act & Assert
      expect(() => new PermissionGuard("")).toThrow("PermissionGuard requires a permission string");
    });

    it("should throw error when permission is null", () => {
      // Act & Assert
      expect(() => new PermissionGuard(null as any)).toThrow("PermissionGuard requires a permission string");
    });

    it("should throw error when permission is undefined", () => {
      // Act & Assert
      expect(() => new PermissionGuard(undefined as any)).toThrow("PermissionGuard requires a permission string");
    });
  });
});

// End of unit tests for: PermissionGuard constructor

