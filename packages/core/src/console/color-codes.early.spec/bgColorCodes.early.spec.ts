// Unit tests for: bgColorCodes

import { bgColorCodes } from "../color-codes";

describe("bgColorCodes bgColorCodes constant", () => {
  describe("Happy Path", () => {
    it("should have correct ANSI codes for all background colors", () => {
      // Assert
      expect(bgColorCodes.red).toBe("\x1b[41m");
      expect(bgColorCodes.green).toBe("\x1b[42m");
      expect(bgColorCodes.yellow).toBe("\x1b[43m");
      expect(bgColorCodes.blue).toBe("\x1b[44m");
      expect(bgColorCodes.magenta).toBe("\x1b[45m");
      expect(bgColorCodes.cyan).toBe("\x1b[46m");
      expect(bgColorCodes.white).toBe("\x1b[47m");
      expect(bgColorCodes.black).toBe("\x1b[40m");
      expect(bgColorCodes.none).toBe("\x1b[0m");
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
      const actualKeys = Object.keys(bgColorCodes);

      expect(actualKeys.sort()).toEqual(expectedKeys.sort());
    });

    it("should have matching keys with colorCodes", () => {
      // Assert
      const colorKeys = Object.keys(require("../color-codes").colorCodes);
      const bgKeys = Object.keys(bgColorCodes);

      expect(bgKeys.sort()).toEqual(colorKeys.sort());
    });
  });
});

// End of unit tests for: bgColorCodes
