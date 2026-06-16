import { EngineRegistry } from "../render-registry";
import type { EngineAdapter } from "../render-interface";

describe("EngineRegistry", () => {
  let registry: EngineRegistry;

  // Mock adapter
  const createMockAdapter = (
    name: string,
    extensions: Array<string>,
  ): EngineAdapter => ({
    name,
    extensions,
    packageName: `mock-${name}`,
    supportsStreaming: false,
    supportsSSR: false,
    setup: jest.fn(),
    render: jest.fn(),
  });

  beforeEach(() => {
    registry = new EngineRegistry();
  });

  describe("register", () => {
    it("should register an adapter", () => {
      const adapter = createMockAdapter("ejs", [".ejs"]);
      registry.register(adapter);

      expect(registry.has("ejs")).toBe(true);
    });

    it("should map extensions to adapter", () => {
      const adapter = createMockAdapter("pug", [".pug", ".jade"]);
      registry.register(adapter);

      expect(registry.getByExtension(".pug")).toBe(adapter);
      expect(registry.getByExtension(".jade")).toBe(adapter);
    });

    it("should handle extensions with or without dots", () => {
      const adapter = createMockAdapter("ejs", [".ejs"]);
      registry.register(adapter);

      expect(registry.getByExtension(".ejs")).toBe(adapter);
      expect(registry.getByExtension("ejs")).toBe(adapter);
    });
  });

  describe("get", () => {
    it("should return adapter by name", () => {
      const adapter = createMockAdapter("hbs", [".hbs"]);
      registry.register(adapter);

      expect(registry.get("hbs")).toBe(adapter);
    });

    it("should return undefined for non-existent adapter", () => {
      expect(registry.get("unknown")).toBeUndefined();
    });

    it("should be case-insensitive", () => {
      const adapter = createMockAdapter("ejs", [".ejs"]);
      registry.register(adapter);

      expect(registry.get("EJS")).toBe(adapter);
      expect(registry.get("Ejs")).toBe(adapter);
    });
  });

  describe("getByExtension", () => {
    it("should return adapter by extension", () => {
      const adapter = createMockAdapter("pug", [".pug"]);
      registry.register(adapter);

      expect(registry.getByExtension(".pug")).toBe(adapter);
    });

    it("should return undefined for unknown extension", () => {
      expect(registry.getByExtension(".xyz")).toBeUndefined();
    });
  });

  describe("getAll", () => {
    it("should return all registered adapters", () => {
      const ejs = createMockAdapter("ejs", [".ejs"]);
      const pug = createMockAdapter("pug", [".pug"]);
      registry.register(ejs);
      registry.register(pug);

      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all).toContain(ejs);
      expect(all).toContain(pug);
    });

    it("should return empty array when no adapters registered", () => {
      expect(registry.getAll()).toEqual([]);
    });
  });

  describe("getNames", () => {
    it("should return all registered adapter names", () => {
      registry.register(createMockAdapter("ejs", [".ejs"]));
      registry.register(createMockAdapter("pug", [".pug"]));

      const names = registry.getNames();
      expect(names).toContain("ejs");
      expect(names).toContain("pug");
    });
  });

  describe("has", () => {
    it("should return true for registered adapter", () => {
      registry.register(createMockAdapter("ejs", [".ejs"]));
      expect(registry.has("ejs")).toBe(true);
    });

    it("should return false for non-registered adapter", () => {
      expect(registry.has("ejs")).toBe(false);
    });
  });

  describe("hasExtension", () => {
    it("should return true for registered extension", () => {
      registry.register(createMockAdapter("ejs", [".ejs"]));
      expect(registry.hasExtension(".ejs")).toBe(true);
    });

    it("should return false for non-registered extension", () => {
      expect(registry.hasExtension(".ejs")).toBe(false);
    });
  });

  describe("unregister", () => {
    it("should remove adapter from registry", () => {
      registry.register(createMockAdapter("ejs", [".ejs"]));
      expect(registry.unregister("ejs")).toBe(true);
      expect(registry.has("ejs")).toBe(false);
    });

    it("should remove extension mappings", () => {
      registry.register(createMockAdapter("pug", [".pug", ".jade"]));
      registry.unregister("pug");

      expect(registry.hasExtension(".pug")).toBe(false);
      expect(registry.hasExtension(".jade")).toBe(false);
    });

    it("should return false when adapter not found", () => {
      expect(registry.unregister("unknown")).toBe(false);
    });
  });

  describe("clear", () => {
    it("should remove all adapters", () => {
      registry.register(createMockAdapter("ejs", [".ejs"]));
      registry.register(createMockAdapter("pug", [".pug"]));

      registry.clear();

      expect(registry.size).toBe(0);
      expect(registry.getAll()).toEqual([]);
    });
  });

  describe("size", () => {
    it("should return number of registered adapters", () => {
      expect(registry.size).toBe(0);

      registry.register(createMockAdapter("ejs", [".ejs"]));
      expect(registry.size).toBe(1);

      registry.register(createMockAdapter("pug", [".pug"]));
      expect(registry.size).toBe(2);
    });
  });

  describe("mapExtensionToEngineType", () => {
    it("should return engine type for extension", () => {
      registry.register(createMockAdapter("ejs", [".ejs"]));
      expect(registry.mapExtensionToEngineType(".ejs")).toBe("ejs");
    });

    it("should return undefined for unknown extension", () => {
      expect(registry.mapExtensionToEngineType(".xyz")).toBeUndefined();
    });
  });
});
