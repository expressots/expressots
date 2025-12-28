// Unit tests for: taggedConstraint

import { taggedConstraint } from "../constraint_helpers";
import { interfaces } from "../../interfaces/interfaces";
import { Metadata } from "../../planning/metadata";

describe("taggedConstraint() taggedConstraint function", () => {
  describe("Happy Path", () => {
    it("should create constraint function for tag", () => {
      // Arrange
      const key = "tag";
      const value = "value";
      const constraintFn = taggedConstraint(key);

      // Act
      const constraint = constraintFn(value);

      // Assert
      expect(typeof constraint).toBe("function");
      expect(constraint.metaData).toBeInstanceOf(Metadata);
    });

    it("should return true when request matches tag", () => {
      // Arrange
      const key = "tag";
      const value = "value";
      const constraint = taggedConstraint(key)(value);
      const matchesTagFn = jest.fn().mockReturnValue(true);
      const target = {
        matchesTag: jest.fn().mockReturnValue(matchesTagFn),
      };
      const request: interfaces.Request = {
        target,
      } as any;

      // Act
      const result = constraint(request);

      // Assert
      expect(result).toBe(true);
      expect(target.matchesTag).toHaveBeenCalledWith(key);
      expect(matchesTagFn).toHaveBeenCalledWith(value);
    });

    it("should return false when request doesn't match tag", () => {
      // Arrange
      const key = "tag";
      const value = "value";
      const constraint = taggedConstraint(key)(value);
      const matchesTagFn = jest.fn().mockReturnValue(false);
      const target = {
        matchesTag: jest.fn().mockReturnValue(matchesTagFn),
      };
      const request: interfaces.Request = {
        target,
      } as any;

      // Act
      const result = constraint(request);

      // Assert
      expect(result).toBe(false);
      expect(target.matchesTag).toHaveBeenCalledWith(key);
      expect(matchesTagFn).toHaveBeenCalledWith(value);
    });

    it("should return false when request is null", () => {
      // Arrange
      const constraint = taggedConstraint("tag")("value");

      // Act
      const result = constraint(null);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false when target is null", () => {
      // Arrange
      const constraint = taggedConstraint("tag")("value");
      const request: interfaces.Request = {
        target: null,
      } as any;

      // Act
      const result = constraint(request);

      // Assert
      expect(result).toBe(false);
    });
  });
});

// End of unit tests for: taggedConstraint

