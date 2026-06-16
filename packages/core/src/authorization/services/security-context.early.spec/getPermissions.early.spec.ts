// Unit tests for: getPermissions

import "reflect-metadata";
import { SecurityContext } from "../security-context";

describe("SecurityContext.getPermissions() getPermissions method", () => {
  let securityContext: SecurityContext;

  beforeEach(() => {
    securityContext = new SecurityContext(undefined, undefined);
  });

  describe("Happy Path", () => {
    it("should return all permissions", async () => {
      // Arrange
      securityContext.addPermission("permission1");
      securityContext.addPermission("permission2");

      // Act
      const permissions = await securityContext.getPermissions();

      // Assert
      expect(permissions).toContain("permission1");
      expect(permissions).toContain("permission2");
      expect(permissions.length).toBe(2);
    });

    it("should return empty array when no permissions", async () => {
      // Act
      const permissions = await securityContext.getPermissions();

      // Assert
      expect(permissions).toEqual([]);
    });
  });
});

// End of unit tests for: getPermissions
