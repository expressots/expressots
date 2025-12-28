// Unit tests for: addPermission

import "reflect-metadata";
import { SecurityContext } from "../security-context";

describe("SecurityContext.addPermission() addPermission method", () => {
  let securityContext: SecurityContext;

  beforeEach(() => {
    securityContext = new SecurityContext(undefined, undefined);
  });

  describe("Happy Path", () => {
    it("should add permission to context", () => {
      // Act
      securityContext.addPermission("permission1");

      // Assert
      expect(securityContext.hasPermission("permission1")).resolves.toBe(true);
    });

    it("should add multiple permissions", () => {
      // Act
      securityContext.addPermission("permission1");
      securityContext.addPermission("permission2");

      // Assert
      expect(securityContext.hasPermission("permission1")).resolves.toBe(true);
      expect(securityContext.hasPermission("permission2")).resolves.toBe(true);
    });
  });
});

// End of unit tests for: addPermission

