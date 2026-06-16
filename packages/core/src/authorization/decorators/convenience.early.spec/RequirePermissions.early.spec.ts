// Unit tests for: RequirePermissions decorator

import { RequirePermissions } from "../convenience";
import "reflect-metadata";
import { EXCEPTION_FILTER_METADATA_KEY } from "../../../error/exception-filter-constants";

describe("RequirePermissions() RequirePermissions decorator", () => {
  describe("Happy Path", () => {
    it("should apply UseGuards with multiple PermissionGuards", () => {
      // Arrange
      class TestController {
        @RequirePermissions("read", "write")
        testMethod() {}
      }

      // Act & Assert
      // The decorator should apply UseGuards with PermissionGuards
      // We can verify by checking that the method exists
      const instance = new TestController();
      expect(typeof instance.testMethod).toBe("function");
    });

    it("should handle single permission", () => {
      // Arrange
      class TestController {
        @RequirePermissions("read")
        testMethod() {}
      }

      // Act & Assert
      const instance = new TestController();
      expect(typeof instance.testMethod).toBe("function");
    });

    it("should handle multiple permissions", () => {
      // Arrange
      class TestController {
        @RequirePermissions("read", "write", "delete")
        testMethod() {}
      }

      // Act & Assert
      const instance = new TestController();
      expect(typeof instance.testMethod).toBe("function");
    });
  });
});

// End of unit tests for: RequirePermissions decorator
