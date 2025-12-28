// Unit tests for: PermissionHierarchy.inheritsFrom

import { PermissionHierarchy } from "../permission-hierarchy";

describe("PermissionHierarchy.inheritsFrom() inheritsFrom method", () => {
  let hierarchy: PermissionHierarchy;

  beforeEach(() => {
    hierarchy = new PermissionHierarchy();
  });

  describe("Happy Path", () => {
    it("should return true when role directly inherits from parent", () => {
      // Arrange
      const role = "admin";
      const parentRole = "moderator";

      // Act
      const result = hierarchy.inheritsFrom(role, parentRole);

      // Assert
      expect(result).toBe(true);
    });

    it("should return true when role indirectly inherits from parent", () => {
      // Arrange
      const role = "super-admin";
      const parentRole = "user";

      // Act
      const result = hierarchy.inheritsFrom(role, parentRole);

      // Assert
      expect(result).toBe(true);
    });

    it("should return false when role does not inherit from parent", () => {
      // Arrange
      const role = "admin";
      const parentRole = "super-admin";

      // Act
      const result = hierarchy.inheritsFrom(role, parentRole);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false when role has no hierarchy", () => {
      // Arrange
      const role = "custom-role";
      const parentRole = "user";

      // Act
      const result = hierarchy.inheritsFrom(role, parentRole);

      // Assert
      expect(result).toBe(false);
    });
  });
});

// End of unit tests for: PermissionHierarchy.inheritsFrom

