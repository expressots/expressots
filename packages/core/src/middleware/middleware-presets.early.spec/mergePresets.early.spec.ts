// Unit tests for: mergePresets

import { mergePresets, MiddlewarePreset } from "../middleware-presets";

describe("mergePresets() mergePresets function", () => {
  describe("Happy Path", () => {
    it("should merge two presets with different middleware", () => {
      // Arrange
      const base: MiddlewarePreset = {
        name: "api", // Use valid preset name
        description: "Base preset",
        middleware: [{ name: "BodyParser", options: {} }],
      };
      const override: Partial<MiddlewarePreset> = {
        name: "web" as any, // Override name
        middleware: [{ name: "Cors", options: {} }],
      };

      // Act
      const merged = mergePresets(base, override);

      // Assert
      expect(merged.name).toBe("web");
      expect(merged.middleware.length).toBe(2);
      expect(merged.middleware.map((m) => m.name)).toContain("BodyParser");
      expect(merged.middleware.map((m) => m.name)).toContain("Cors");
    });

    it("should override middleware with same name", () => {
      // Arrange
      const base: MiddlewarePreset = {
        name: "api",
        description: "Base preset",
        middleware: [{ name: "BodyParser", options: { limit: "5mb" } }],
      };
      const override: Partial<MiddlewarePreset> = {
        middleware: [{ name: "BodyParser", options: { limit: "10mb" } }],
      };

      // Act
      const merged = mergePresets(base, override);

      // Assert
      expect(merged.middleware.length).toBe(1);
      expect(merged.middleware[0].name).toBe("BodyParser");
      expect((merged.middleware[0].options as any).limit).toBe("10mb");
    });

    it("should merge tags", () => {
      // Arrange
      const base: MiddlewarePreset = {
        name: "api",
        description: "Base preset",
        middleware: [],
        tags: ["base", "test"],
      };
      const override: Partial<MiddlewarePreset> = {
        tags: ["override", "production"],
      };

      // Act
      const merged = mergePresets(base, override);

      // Assert
      expect(merged.tags).toEqual(["base", "test", "override", "production"]);
    });

    it("should override description", () => {
      // Arrange
      const base: MiddlewarePreset = {
        name: "api", // Use valid preset name
        description: "Base preset",
        middleware: [],
      };
      const override: Partial<MiddlewarePreset> = {
        description: "Merged preset",
      };

      // Act
      const merged = mergePresets(base, override);

      // Assert
      expect(merged.description).toBe("Merged preset");
    });

    it("should handle empty override", () => {
      // Arrange
      const base: MiddlewarePreset = {
        name: "api",
        description: "Base preset",
        middleware: [{ name: "BodyParser", options: {} }],
      };
      const override: Partial<MiddlewarePreset> = {};

      // Act
      const merged = mergePresets(base, override);

      // Assert
      expect(merged.name).toBe("api");
      expect(merged.description).toBe("Base preset");
      expect(merged.middleware.length).toBe(1);
    });
  });

  describe("Edge Cases", () => {
    it("should handle base without tags", () => {
      // Arrange
      const base: MiddlewarePreset = {
        name: "api", // Use valid preset name
        description: "Base preset",
        middleware: [],
      };
      const override: Partial<MiddlewarePreset> = {
        tags: ["override"],
      };

      // Act
      const merged = mergePresets(base, override);

      // Assert
      expect(merged.tags).toEqual(["override"]);
    });

    it("should handle override without tags", () => {
      // Arrange
      const base: MiddlewarePreset = {
        name: "api",
        description: "Base preset",
        middleware: [],
        tags: ["base"],
      };
      const override: Partial<MiddlewarePreset> = {};

      // Act
      const merged = mergePresets(base, override);

      // Assert
      expect(merged.tags).toEqual(["base"]);
    });

    it("should handle empty middleware arrays", () => {
      // Arrange
      const base: MiddlewarePreset = {
        name: "api", // Use valid preset name
        description: "Base preset",
        middleware: [],
      };
      const override: Partial<MiddlewarePreset> = {
        middleware: [],
      };

      // Act
      const merged = mergePresets(base, override);

      // Assert
      expect(merged.middleware).toEqual([]);
    });
  });
});

// End of unit tests for: mergePresets
