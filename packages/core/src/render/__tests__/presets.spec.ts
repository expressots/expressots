import {
  developmentPreset,
  productionPreset,
  ssrPreset,
  edgePreset,
  getPreset,
  getPresetNames,
  hasPreset,
  registerPreset,
  mergePreset,
  autoSelectPreset,
} from "../presets";

describe("Presets", () => {
  describe("developmentPreset", () => {
    it("should have caching disabled", () => {
      expect(developmentPreset.cache).toBe(false);
    });

    it("should have hot reload enabled", () => {
      expect(developmentPreset.watch).toBe(true);
    });

    it("should have debug enabled", () => {
      expect(developmentPreset.debug).toBe(true);
    });

    it("should have streaming disabled for debugging", () => {
      expect(developmentPreset.streaming).toBe(false);
    });
  });

  describe("productionPreset", () => {
    it("should have caching enabled", () => {
      expect(productionPreset.cache).toBe(true);
    });

    it("should have hot reload disabled", () => {
      expect(productionPreset.watch).toBe(false);
    });

    it("should have debug disabled", () => {
      expect(productionPreset.debug).toBe(false);
    });

    it("should have streaming enabled", () => {
      expect(productionPreset.streaming).toBe(true);
    });

    it("should have SSR with streaming enabled", () => {
      expect(productionPreset.ssr?.streaming).toBe(true);
    });
  });

  describe("ssrPreset", () => {
    it("should have caching enabled", () => {
      expect(ssrPreset.cache).toBe(true);
    });

    it("should have streaming enabled", () => {
      expect(ssrPreset.streaming).toBe(true);
    });

    it("should have hydration enabled", () => {
      expect(ssrPreset.ssr?.hydrate).toBe(true);
    });

    it("should have progressive rendering enabled", () => {
      expect(ssrPreset.ssr?.progressive).toBe(true);
    });
  });

  describe("edgePreset", () => {
    it("should have caching enabled", () => {
      expect(edgePreset.cache).toBe(true);
    });

    it("should have streaming enabled", () => {
      expect(edgePreset.streaming).toBe(true);
    });

    it("should have preload disabled for minimal overhead", () => {
      expect(edgePreset.ssr?.preload).toBe(false);
    });
  });

  describe("getPreset", () => {
    it("should return development preset", () => {
      const preset = getPreset("development");
      expect(preset).toEqual(developmentPreset);
    });

    it("should return production preset", () => {
      const preset = getPreset("production");
      expect(preset).toEqual(productionPreset);
    });

    it("should return ssr preset", () => {
      const preset = getPreset("ssr");
      expect(preset).toEqual(ssrPreset);
    });

    it("should throw for unknown preset", () => {
      expect(() => getPreset("unknown")).toThrow(/Unknown render preset/);
    });

    it("should return a copy to prevent mutations", () => {
      const preset1 = getPreset("development");
      const preset2 = getPreset("development");
      preset1.cache = true;
      expect(preset2.cache).toBe(false);
    });
  });

  describe("getPresetNames", () => {
    it("should return all preset names", () => {
      const names = getPresetNames();
      expect(names).toContain("development");
      expect(names).toContain("production");
      expect(names).toContain("ssr");
      expect(names).toContain("edge");
    });
  });

  describe("hasPreset", () => {
    it("should return true for existing presets", () => {
      expect(hasPreset("development")).toBe(true);
      expect(hasPreset("production")).toBe(true);
    });

    it("should return false for non-existing presets", () => {
      expect(hasPreset("nonexistent")).toBe(false);
    });
  });

  describe("registerPreset", () => {
    it("should register a custom preset", () => {
      registerPreset("custom", {
        cache: true,
        watch: true,
        debug: true,
      });

      expect(hasPreset("custom")).toBe(true);
      const preset = getPreset("custom");
      expect(preset.cache).toBe(true);
    });
  });

  describe("mergePreset", () => {
    it("should merge overrides with base preset", () => {
      const merged = mergePreset("development", {
        cache: true,
        debug: false,
      });

      expect(merged.cache).toBe(true);
      expect(merged.debug).toBe(false);
      expect(merged.watch).toBe(true); // From base
    });

    it("should merge SSR options", () => {
      const merged = mergePreset("production", {
        ssr: { progressive: true },
      });

      expect(merged.ssr?.hydrate).toBe(true); // From base
      expect(merged.ssr?.progressive).toBe(true); // From override
    });
  });

  describe("autoSelectPreset", () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it("should return production preset in production", () => {
      process.env.NODE_ENV = "production";
      const preset = autoSelectPreset();
      expect(preset).toEqual(productionPreset);
    });

    it("should return development preset in development", () => {
      process.env.NODE_ENV = "development";
      const preset = autoSelectPreset();
      expect(preset).toEqual(developmentPreset);
    });

    it("should return development preset in test", () => {
      process.env.NODE_ENV = "test";
      const preset = autoSelectPreset();
      expect(preset).toEqual(developmentPreset);
    });

    it("should return development preset when NODE_ENV is not set", () => {
      delete process.env.NODE_ENV;
      const preset = autoSelectPreset();
      expect(preset).toEqual(developmentPreset);
    });
  });
});
