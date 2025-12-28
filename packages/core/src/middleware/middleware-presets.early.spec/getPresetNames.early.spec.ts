// Unit tests for: getPresetNames

import { getPresetNames, MIDDLEWARE_PRESETS } from "../middleware-presets";

describe("getPresetNames() getPresetNames function", () => {
  describe("Happy Path", () => {
    it("should return array of all preset names", () => {
      // Act
      const names = getPresetNames();

      // Assert
      expect(Array.isArray(names)).toBe(true);
      expect(names.length).toBeGreaterThan(0);
    });

    it("should return all keys from MIDDLEWARE_PRESETS", () => {
      // Act
      const names = getPresetNames();
      const expectedNames = Object.keys(MIDDLEWARE_PRESETS);

      // Assert
      expect(names.length).toBe(expectedNames.length);
      expectedNames.forEach((name) => {
        expect(names).toContain(name);
      });
    });

    it("should return expected preset names", () => {
      // Act
      const names = getPresetNames();

      // Assert
      expect(names).toContain("api");
      expect(names).toContain("web");
      expect(names).toContain("microservice");
      expect(names).toContain("graphql");
      expect(names).toContain("minimal");
      expect(names).toContain("secure");
      expect(names).toContain("development");
      expect(names).toContain("production");
    });
  });
});

// End of unit tests for: getPresetNames
