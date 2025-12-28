// Unit tests for: hasPermission

import "reflect-metadata";
import { SecurityContext } from "../security-context";

describe("SecurityContext.hasPermission() hasPermission method", () => {
  let securityContext: SecurityContext;

  beforeEach(() => {
    securityContext = new SecurityContext(undefined, undefined);
  });

  describe("Happy Path", () => {
    it("should return true for existing permission", async () => {
      // Arrange
      securityContext.addPermission("permission1");

      // Act
      const result = await securityContext.hasPermission("permission1");

      // Assert
      expect(result).toBe(true);
    });

    it("should return false for non-existent permission", async () => {
      // Act
      const result = await securityContext.hasPermission("non-existent");

      // Assert
      expect(result).toBe(false);
    });
  });
});

// End of unit tests for: hasPermission

