// Unit tests for: PermissionHierarchy.resolveRoles

import { PermissionHierarchy } from "../permission-hierarchy";

describe("PermissionHierarchy.resolveRoles() resolveRoles method", () => {
  let hierarchy: PermissionHierarchy;

  beforeEach(() => {
    hierarchy = new PermissionHierarchy();
  });

  describe("Happy Path", () => {
    it("should return roles including inherited ones", async () => {
      // Arrange
      const roles = ["admin"];

      // Act
      const result = await hierarchy.resolveRoles(roles);

      // Assert
      expect(result).toContain("admin");
      expect(result).toContain("moderator");
      expect(result).toContain("user");
      expect(result.length).toBe(3);
    });

    it("should resolve super-admin with all inherited roles", async () => {
      // Arrange
      const roles = ["super-admin"];

      // Act
      const result = await hierarchy.resolveRoles(roles);

      // Assert
      expect(result).toContain("super-admin");
      expect(result).toContain("admin");
      expect(result).toContain("moderator");
      expect(result).toContain("user");
      expect(result.length).toBe(4);
    });

    it("should resolve multiple roles without duplicates", async () => {
      // Arrange
      const roles = ["admin", "moderator"];

      // Act
      const result = await hierarchy.resolveRoles(roles);

      // Assert
      expect(result).toContain("admin");
      expect(result).toContain("moderator");
      expect(result).toContain("user");
      expect(result.length).toBe(3); // No duplicates
    });

    it("should return role itself when no hierarchy exists", async () => {
      // Arrange
      const roles = ["custom-role"];

      // Act
      const result = await hierarchy.resolveRoles(roles);

      // Assert
      expect(result).toEqual(["custom-role"]);
    });
  });
});

// End of unit tests for: PermissionHierarchy.resolveRoles
