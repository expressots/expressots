// Unit tests for: RequireAuthentication

import "reflect-metadata";
import { RequireAuthentication } from "../convenience";
import { GUARD_METADATA_KEY } from "../../guard-constants";

describe("RequireAuthentication() RequireAuthentication decorator", () => {
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
    it("should apply guard to method", () => {
      // Act
      class TestController {
        @RequireAuthentication()
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

    it("should apply guard to class", () => {
      // Act
      @RequireAuthentication()
      class TestController {
        testMethod(): void {}
      }

      // Assert
      const guards = Reflect.getMetadata(
        GUARD_METADATA_KEY.controllerGuards,
        TestController,
      );

      expect(guards).toBeDefined();
      expect(guards.length).toBeGreaterThan(0);
    });
  });
});

// End of unit tests for: RequireAuthentication
