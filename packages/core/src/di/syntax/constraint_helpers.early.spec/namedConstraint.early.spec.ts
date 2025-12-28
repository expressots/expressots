// Unit tests for: namedConstraint

import { namedConstraint } from "../constraint_helpers";
import { interfaces } from "../../interfaces/interfaces";
import * as METADATA_KEY from "../../constants/metadata_keys";

describe("namedConstraint() namedConstraint function", () => {
  describe("Happy Path", () => {
    it("should create constraint using NAMED_TAG metadata key", () => {
      // Arrange
      const name = "MyService";
      const constraint = namedConstraint(name);
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
      expect(target.matchesTag).toHaveBeenCalledWith(METADATA_KEY.NAMED_TAG);
      expect(matchesTagFn).toHaveBeenCalledWith(name);
    });
  });
});

// End of unit tests for: namedConstraint

