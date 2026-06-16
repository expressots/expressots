// Unit tests for: typeConstraint

import { typeConstraint } from "../constraint_helpers";
import { interfaces } from "../../interfaces/interfaces";

describe("typeConstraint() typeConstraint function", () => {
  describe("Happy Path", () => {
    it("should return true when binding matches string type", () => {
      // Arrange
      const type = "IService";
      const constraint = typeConstraint(type);
      const binding: interfaces.Binding<unknown> = {
        serviceIdentifier: "IService",
      } as any;
      const request: interfaces.Request = {
        bindings: [binding],
      } as any;

      // Act
      const result = constraint(request);

      // Assert
      expect(result).toBe(true);
    });

    it("should return false when binding doesn't match string type", () => {
      // Arrange
      const type = "IService";
      const constraint = typeConstraint(type);
      const binding: interfaces.Binding<unknown> = {
        serviceIdentifier: "IOtherService",
      } as any;
      const request: interfaces.Request = {
        bindings: [binding],
      } as any;

      // Act
      const result = constraint(request);

      // Assert
      expect(result).toBe(false);
    });

    it("should return true when binding matches constructor type", () => {
      // Arrange
      class TestService {}
      const constraint = typeConstraint(TestService);
      const binding: interfaces.Binding<unknown> = {
        implementationType: TestService,
      } as any;
      const request: interfaces.Request = {
        bindings: [binding],
      } as any;

      // Act
      const result = constraint(request);

      // Assert
      expect(result).toBe(true);
    });

    it("should return false when binding doesn't match constructor type", () => {
      // Arrange
      class TestService {}
      class OtherService {}
      const constraint = typeConstraint(TestService);
      const binding: interfaces.Binding<unknown> = {
        implementationType: OtherService,
      } as any;
      const request: interfaces.Request = {
        bindings: [binding],
      } as any;

      // Act
      const result = constraint(request);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should return false when request is null", () => {
      // Arrange
      const constraint = typeConstraint("IService");

      // Act
      const result = constraint(null);

      // Assert
      expect(result).toBe(false);
    });
  });
});

// End of unit tests for: typeConstraint
