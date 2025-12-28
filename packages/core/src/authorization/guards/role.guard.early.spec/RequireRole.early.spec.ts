// Unit tests for: RequireRole factory function

import { RequireRole, RoleGuard } from "../role.guard";

describe("RequireRole() RequireRole factory function", () => {
  describe("Happy Path", () => {
    it("should create a RoleGuard instance with single role", () => {
      // Act
      const guard = RequireRole("admin");

      // Assert
      expect(guard).toBeInstanceOf(RoleGuard);
    });

    it("should create a RoleGuard instance with multiple roles", () => {
      // Act
      const guard = RequireRole("admin", "moderator", "user");

      // Assert
      expect(guard).toBeInstanceOf(RoleGuard);
    });
  });
});

// End of unit tests for: RequireRole factory function
