// Unit tests for: getPreset

import { getPreset, MIDDLEWARE_PRESETS, MiddlewarePresetName } from "../middleware-presets";

describe("getPreset() getPreset function", () => {
  describe("Happy Path", () => {
    it("should return preset for valid preset name", () => {
      // Act
      const preset = getPreset("api");

      // Assert
      expect(preset).toBeDefined();
      expect(preset?.name).toBe("api");
      expect(preset?.description).toBeDefined();
      expect(preset?.middleware).toBeDefined();
      expect(Array.isArray(preset?.middleware)).toBe(true);
    });

    it("should return all available presets", () => {
      const presetNames: Array<MiddlewarePresetName> = [
        "api",
        "web",
        "microservice",
        "graphql",
        "minimal",
        "secure",
        "development",
        "production",
      ];

      presetNames.forEach((name) => {
        const preset = getPreset(name);
        expect(preset).toBeDefined();
        expect(preset?.name).toBe(name);
      });
    });

    it("should return the same object as MIDDLEWARE_PRESETS", () => {
      // Act
      const preset = getPreset("api");

      // Assert
      expect(preset).toBe(MIDDLEWARE_PRESETS.api);
    });
  });

  describe("Edge Cases", () => {
    it("should return undefined for invalid preset name", () => {
      // Act
      const preset = getPreset("invalid" as MiddlewarePresetName);

      // Assert
      expect(preset).toBeUndefined();
    });
  });
});

// End of unit tests for: getPreset

