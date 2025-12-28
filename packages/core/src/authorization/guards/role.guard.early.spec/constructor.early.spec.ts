// Unit tests for: RoleGuard constructor

import { RoleGuard } from "../role.guard";

describe("RoleGuard() RoleGuard constructor", () => {
  describe("Happy Path", () => {
    it("should create instance with roles", () => {
      // Arrange
      const roles = ["admin", "user"];

      // Act
      const guard = new RoleGuard(roles);

      // Assert
      expect(guard).toBeInstanceOf(RoleGuard);
    });
  });

  describe("Edge Cases", () => {
    it("should throw error when roles array is empty", () => {
      // Arrange
      const roles: Array<string> = [];

      // Act & Assert
      expect(() => new RoleGuard(roles)).toThrow("RoleGuard requires at least one role");
    });

    it("should throw error when roles is null", () => {
      // Act & Assert
      expect(() => new RoleGuard(null as any)).toThrow("RoleGuard requires at least one role");
    });

    it("should throw error when roles is undefined", () => {
      // Act & Assert
      expect(() => new RoleGuard(undefined as any)).toThrow("RoleGuard requires at least one role");
    });
  });
});

// End of unit tests for: RoleGuard constructor

