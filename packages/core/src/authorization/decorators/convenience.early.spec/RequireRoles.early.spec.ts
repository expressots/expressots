// Unit tests for: RequireRoles

import "reflect-metadata";
import { RequireRoles } from "../convenience";
import { GUARD_METADATA_KEY } from "../../guard-constants";

describe("RequireRoles() RequireRoles decorator", () => {
  let TestController: any;

  beforeEach(() => {
    TestController = class {
      testMethod(): void {}
    };
    // Clear metadata
    Reflect.deleteMetadata(
      GUARD_METADATA_KEY.methodGuards,
      TestController.prototype,
      "testMethod",
    );
  });

  describe("Happy Path", () => {
    it("should apply guard with single role", () => {
      // Act
      class TestController {
        @RequireRoles("admin")
        testMethod(): void {}
      }

      // Assert
      const guards = Reflect.getMetadata(
        GUARD_METADATA_KEY.methodGuards,
        TestController,
        "testMethod",
      );

      expect(guards).toBeDefined();
      expect(guards.length).toBeGreaterThan(0);
    });

    it("should apply guard with multiple roles", () => {
      // Act
      class TestController {
        @RequireRoles("admin", "moderator")
        testMethod(): void {}
      }

      // Assert
      const guards = Reflect.getMetadata(
        GUARD_METADATA_KEY.methodGuards,
        TestController,
        "testMethod",
      );

      expect(guards).toBeDefined();
      expect(guards.length).toBeGreaterThan(0);
    });
  });
});

// End of unit tests for: RequireRoles

