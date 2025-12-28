// Unit tests for: traverseAncerstors

import { traverseAncerstors } from "../constraint_helpers";
import { interfaces } from "../../interfaces/interfaces";

describe("traverseAncerstors() traverseAncerstors function", () => {
  describe("Happy Path", () => {
    it("should return false when parent is null", () => {
      // Arrange
      const request: interfaces.Request = {
        parentRequest: null,
      } as any;
      const constraint = jest.fn().mockReturnValue(false);

      // Act
      const result = traverseAncerstors(request, constraint);

      // Assert
      expect(result).toBe(false);
      expect(constraint).not.toHaveBeenCalled();
    });

    it("should return true when constraint matches parent", () => {
      // Arrange
      const parentRequest: interfaces.Request = {} as any;
      const request: interfaces.Request = {
        parentRequest,
      } as any;
      const constraint = jest.fn().mockReturnValue(true);

      // Act
      const result = traverseAncerstors(request, constraint);

      // Assert
      expect(result).toBe(true);
      expect(constraint).toHaveBeenCalledWith(parentRequest);
    });

    it("should traverse up the chain when constraint doesn't match", () => {
      // Arrange
      const grandParentRequest: interfaces.Request = {} as any;
      const parentRequest: interfaces.Request = {
        parentRequest: grandParentRequest,
      } as any;
      const request: interfaces.Request = {
        parentRequest,
      } as any;
      const constraint = jest
        .fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      // Act
      const result = traverseAncerstors(request, constraint);

      // Assert
      expect(result).toBe(true);
      expect(constraint).toHaveBeenCalledTimes(2);
    });
  });
});

// End of unit tests for: traverseAncerstors

