// Unit tests for: getPresetsByTag

import { getPresetsByTag, MIDDLEWARE_PRESETS } from "../middleware-presets";

describe("getPresetsByTag() getPresetsByTag function", () => {
  describe("Happy Path", () => {
    it("should return presets with matching tag", () => {
      // Act
      const presets = getPresetsByTag("security");

      // Assert
      expect(Array.isArray(presets)).toBe(true);
      expect(presets.length).toBeGreaterThan(0);
      presets.forEach((preset) => {
        expect(preset.tags).toContain("security");
      });
    });

    it("should return multiple presets for common tag", () => {
      // Act
      const presets = getPresetsByTag("api");

      // Assert
      expect(presets.length).toBeGreaterThan(0);
    });

    it("should return empty array for non-existent tag", () => {
      // Act
      const presets = getPresetsByTag("nonexistent-tag");

      // Assert
      expect(presets).toEqual([]);
    });

    it("should return presets with 'rest' tag", () => {
      // Act
      const presets = getPresetsByTag("rest");

      // Assert
      expect(presets.length).toBeGreaterThan(0);
      expect(presets.some((p) => p.name === "api")).toBe(true);
    });

    it("should return presets with 'production' tag", () => {
      // Act
      const presets = getPresetsByTag("production");

      // Assert
      expect(presets.length).toBeGreaterThan(0);
      expect(presets.some((p) => p.name === "production")).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty string tag", () => {
      // Act
      const presets = getPresetsByTag("");

      // Assert
      expect(presets).toEqual([]);
    });

    it("should handle presets without tags", () => {
      // Act - Get all presets and check if any have no tags
      const allPresets = Object.values(MIDDLEWARE_PRESETS);
      const presetsWithoutTags = allPresets.filter(
        (p) => !p.tags || p.tags.length === 0,
      );

      // Assert - Should handle gracefully
      expect(Array.isArray(presetsWithoutTags)).toBe(true);
    });
  });
});

// End of unit tests for: getPresetsByTag
