// Unit tests for: ColorStyle enum

import { ColorStyle } from "../color-codes";

describe("ColorStyle ColorStyle enum", () => {
  describe("Happy Path", () => {
    it("should have correct enum values", () => {
      // Assert
      expect(ColorStyle.None).toBe("none");
      expect(ColorStyle.Yellow).toBe("yellow");
      expect(ColorStyle.Blue).toBe("blue");
      expect(ColorStyle.Green).toBe("green");
      expect(ColorStyle.Red).toBe("red");
    });

    it("should have all expected enum values", () => {
      // Assert
      const expectedValues = ["none", "yellow", "blue", "green", "red"];
      const actualValues = Object.values(ColorStyle);

      expect(actualValues.sort()).toEqual(expectedValues.sort());
    });
  });
});

// End of unit tests for: ColorStyle enum

