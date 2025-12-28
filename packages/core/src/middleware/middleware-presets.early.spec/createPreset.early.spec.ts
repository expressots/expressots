// Unit tests for: createPreset

import { createPreset, MiddlewarePreset } from "../middleware-presets";

describe("createPreset() createPreset function", () => {
  describe("Happy Path", () => {
    it("should create a preset with all required fields", () => {
      // Arrange
      const config = {
        name: "custom" as any, // Custom name not in MiddlewarePresetName union
        description: "Custom preset",
        middleware: [{ name: "BodyParser", options: {} }],
      };

      // Act
      const preset = createPreset(config);

      // Assert
      expect(preset).toBeDefined();
      expect(preset.name).toBe("custom");
      expect(preset.description).toBe("Custom preset");
      expect(preset.middleware).toEqual(config.middleware);
    });

    it("should create a preset with tags", () => {
      // Arrange
      const config = {
        name: "custom",
        description: "Custom preset",
        middleware: [],
        tags: ["custom", "test"],
      };

      // Act
      const preset = createPreset(config as any);

      // Assert
      expect(preset.tags).toEqual(["custom", "test"]);
    });

    it("should create a preset without tags", () => {
      // Arrange
      const config = {
        name: "custom",
        description: "Custom preset",
        middleware: [],
      };

      // Act
      const preset = createPreset(config as any);

      // Assert
      expect(preset.tags).toBeUndefined();
    });

    it("should create a preset with optional middleware", () => {
      // Arrange
      const config = {
        name: "custom",
        description: "Custom preset",
        middleware: [{ name: "Cors", options: {}, optional: true }],
      };

      // Act
      const preset = createPreset(config as any);

      // Assert
      expect(preset.middleware[0].optional).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty middleware array", () => {
      // Arrange
      const config = {
        name: "custom",
        description: "Custom preset",
        middleware: [],
      };

      // Act
      const preset = createPreset(config as any);

      // Assert
      expect(preset.middleware).toEqual([]);
    });
  });
});

// End of unit tests for: createPreset
