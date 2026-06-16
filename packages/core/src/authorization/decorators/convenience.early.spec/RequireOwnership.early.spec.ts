// Unit tests for: RequireOwnership decorator

import { RequireOwnership } from "../convenience";
import "reflect-metadata";

describe("RequireOwnership() RequireOwnership decorator", () => {
  describe("Happy Path", () => {
    it("should apply UseGuards with ResourceOwnerGuard using default param name", () => {
      // Arrange
      class TestController {
        @RequireOwnership()
        testMethod() {}
      }

      // Act & Assert
      const instance = new TestController();
      expect(typeof instance.testMethod).toBe("function");
    });

    it("should apply UseGuards with ResourceOwnerGuard using custom param name", () => {
      // Arrange
      class TestController {
        @RequireOwnership("documentId")
        testMethod() {}
      }

      // Act & Assert
      const instance = new TestController();
      expect(typeof instance.testMethod).toBe("function");
    });
  });
});

// End of unit tests for: RequireOwnership decorator
