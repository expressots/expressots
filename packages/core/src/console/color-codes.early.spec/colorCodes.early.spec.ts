// Unit tests for: colorCodes

import { colorCodes } from "../color-codes";

describe("colorCodes colorCodes constant", () => {
  describe("Happy Path", () => {
    it("should have correct ANSI codes for all colors", () => {
      // Assert
      expect(colorCodes.red).toBe("\x1b[31m");
      expect(colorCodes.green).toBe("\x1b[32m");
      expect(colorCodes.yellow).toBe("\x1b[33m");
      expect(colorCodes.blue).toBe("\x1b[34m");
      expect(colorCodes.magenta).toBe("\x1b[35m");
      expect(colorCodes.cyan).toBe("\x1b[36m");
      expect(colorCodes.white).toBe("\x1b[37m");
      expect(colorCodes.black).toBe("\x1b[30m");
      expect(colorCodes.none).toBe("\x1b[0m");
    });

    it("should have all expected color keys", () => {
      // Assert
      const expectedKeys = [
        "red",
        "green",
        "yellow",
        "blue",
        "magenta",
        "cyan",
        "white",
        "black",
        "none",
      ];
      const actualKeys = Object.keys(colorCodes);

      expect(actualKeys.sort()).toEqual(expectedKeys.sort());
    });
  });
});

// End of unit tests for: colorCodes

