// Unit tests for: PermissionHierarchy.configure

import { PermissionHierarchy } from "../permission-hierarchy";

describe("PermissionHierarchy.configure() configure method", () => {
  let hierarchy: PermissionHierarchy;

  beforeEach(() => {
    hierarchy = new PermissionHierarchy();
  });

  describe("Happy Path", () => {
    it("should merge new hierarchy with existing", async () => {
      // Arrange
      const newHierarchy = {
        "custom-role": ["user"],
      };

      // Act
      hierarchy.configure(newHierarchy);

      // Assert
      const result = await hierarchy.resolveRoles(["custom-role"]);
      expect(result).toContain("custom-role");
      expect(result).toContain("user");
    });

    it("should preserve existing hierarchy when merging", async () => {
      // Arrange
      const newHierarchy = {
        "custom-role": ["user"],
      };

      // Act
      hierarchy.configure(newHierarchy);

      // Assert
      // Existing hierarchy should still work
      const adminResult = await hierarchy.resolveRoles(["admin"]);
      expect(adminResult).toContain("admin");
      expect(adminResult).toContain("moderator");
      expect(adminResult).toContain("user");
    });

    it("should override existing role hierarchy", async () => {
      // Arrange
      const newHierarchy = {
        admin: ["custom-role"],
      };

      // Act
      hierarchy.configure(newHierarchy);

      // Assert
      const result = await hierarchy.resolveRoles(["admin"]);
      expect(result).toContain("admin");
      expect(result).toContain("custom-role");
      // Old hierarchy should be overridden
      expect(result).not.toContain("moderator");
    });
  });
});

// End of unit tests for: PermissionHierarchy.configure
