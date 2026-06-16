/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Application } from "express";
import { RenderService } from "../render-service";

// Mock express app
const createMockApp = (): Application => {
  const app: any = {
    set: jest.fn(),
    get: jest.fn(),
    use: jest.fn(),
    locals: {},
  };
  return app as Application;
};

// Mock the presets module
jest.mock("../presets", () => ({
  getPreset: jest.fn((name: string) => {
    if (name === "development") {
      return { cache: false, watch: true, debug: true };
    }
    if (name === "production") {
      return { cache: true, watch: false, debug: false };
    }
    throw new Error(`Unknown preset: ${name}`);
  }),
}));

// Mock auto-detection
jest.mock("../features/auto-detection", () => ({
  AutoDetection: jest.fn().mockImplementation(() => ({
    detectEngine: jest.fn().mockResolvedValue("ejs"),
  })),
}));

// Mock hot-reload
jest.mock("../features/hot-reload", () => ({
  HotReload: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    setOnChange: jest.fn(),
  })),
}));

// Mock view-debugger
jest.mock("../features/view-debugger", () => ({
  ViewDebugger: jest.fn().mockImplementation(() => ({
    registerRoutes: jest.fn(),
  })),
}));

describe("RenderService", () => {
  let service: RenderService;
  let mockApp: Application;

  beforeEach(() => {
    mockApp = createMockApp();
    service = new RenderService(mockApp);
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create a new render service", () => {
      expect(service).toBeDefined();
    });

    it("should register built-in adapters", () => {
      const engines = service.getRegisteredEngines();
      expect(engines).toContain("ejs");
      expect(engines).toContain("pug");
      expect(engines).toContain("hbs");
      expect(engines).toContain("react");
    });
  });

  describe("configure", () => {
    it("should configure with a preset name", async () => {
      // Mock the EJS adapter setup
      const ejsAdapter = service.getEngine("ejs");
      if (ejsAdapter) {
        ejsAdapter.setup = jest.fn().mockResolvedValue(undefined);
      }

      await service.configure("development");

      expect(service.getConfig().cache).toBe(false);
      expect(service.getConfig().debug).toBe(true);
    });

    it("should configure with a config object", async () => {
      // Mock the EJS adapter setup
      const ejsAdapter = service.getEngine("ejs");
      if (ejsAdapter) {
        ejsAdapter.setup = jest.fn().mockResolvedValue(undefined);
      }

      await service.configure({
        engine: "ejs",
        viewsDir: "custom/views",
        cache: true,
      });

      expect(service.getConfig().viewsDir).toBe("custom/views");
      expect(service.getConfig().cache).toBe(true);
    });

    it("should auto-detect engine when set to auto", async () => {
      const ejsAdapter = service.getEngine("ejs");
      if (ejsAdapter) {
        ejsAdapter.setup = jest.fn().mockResolvedValue(undefined);
      }

      await service.configure({ engine: "auto" });

      expect(service.getActiveEngine().name).toBe("ejs");
    });

    it("should throw for unknown engine", async () => {
      await expect(
        service.configure({ engine: "unknown" as any }),
      ).rejects.toThrow(/not found/);
    });
  });

  describe("registerEngine", () => {
    it("should register a custom adapter", () => {
      const customAdapter = {
        name: "custom",
        extensions: [".custom"],
        packageName: "custom-engine",
        supportsStreaming: false,
        supportsSSR: false,
        setup: jest.fn(),
        render: jest.fn(),
      };

      service.registerEngine(customAdapter);

      expect(service.getRegisteredEngines()).toContain("custom");
    });
  });

  describe("getEngine", () => {
    it("should return registered adapter", () => {
      const adapter = service.getEngine("ejs");
      expect(adapter).toBeDefined();
      expect(adapter?.name).toBe("ejs");
    });

    it("should return undefined for unknown adapter", () => {
      expect(service.getEngine("unknown")).toBeUndefined();
    });
  });

  describe("getActiveEngine", () => {
    it("should throw when not configured", () => {
      expect(() => service.getActiveEngine()).toThrow(
        /No render engine configured/,
      );
    });

    it("should return active engine after configuration", async () => {
      const ejsAdapter = service.getEngine("ejs");
      if (ejsAdapter) {
        ejsAdapter.setup = jest.fn().mockResolvedValue(undefined);
      }

      await service.configure({ engine: "ejs" });

      const active = service.getActiveEngine();
      expect(active.name).toBe("ejs");
    });
  });

  describe("render", () => {
    it("should render a view", async () => {
      const ejsAdapter = service.getEngine("ejs");
      if (ejsAdapter) {
        ejsAdapter.setup = jest.fn().mockResolvedValue(undefined);
        ejsAdapter.render = jest.fn().mockResolvedValue("<div>Hello</div>");
      }

      await service.configure({ engine: "ejs" });

      const html = await service.render("index", { name: "World" });
      expect(html).toBe("<div>Hello</div>");
    });

    it("should update metrics after render", async () => {
      const ejsAdapter = service.getEngine("ejs");
      if (ejsAdapter) {
        ejsAdapter.setup = jest.fn().mockResolvedValue(undefined);
        ejsAdapter.render = jest.fn().mockResolvedValue("<div>Hello</div>");
      }

      await service.configure({ engine: "ejs" });
      await service.render("index", {});

      const metrics = service.getMetrics();
      expect(metrics.totalRenders).toBe(1);
      expect(metrics.rendersByEngine["ejs"]).toBe(1);
    });
  });

  describe("renderStream", () => {
    it("should throw for adapters that don't support streaming", async () => {
      const ejsAdapter = service.getEngine("ejs");
      if (ejsAdapter) {
        ejsAdapter.setup = jest.fn().mockResolvedValue(undefined);
      }

      await service.configure({ engine: "ejs" });

      expect(() => service.renderStream("index", {})).toThrow(
        /does not support streaming/,
      );
    });
  });

  describe("getRegisteredEngines", () => {
    it("should return all registered engine names", () => {
      const engines = service.getRegisteredEngines();
      expect(Array.isArray(engines)).toBe(true);
      expect(engines.length).toBeGreaterThan(0);
    });
  });

  describe("getConfig", () => {
    it("should return empty config before configuration", () => {
      expect(service.getConfig()).toEqual({});
    });

    it("should return config after configuration", async () => {
      const ejsAdapter = service.getEngine("ejs");
      if (ejsAdapter) {
        ejsAdapter.setup = jest.fn().mockResolvedValue(undefined);
      }

      await service.configure({ engine: "ejs", viewsDir: "views" });

      const config = service.getConfig();
      expect(config.engine).toBe("ejs");
    });
  });

  describe("getMetrics", () => {
    it("should return initial metrics", () => {
      const metrics = service.getMetrics();
      expect(metrics.totalRenders).toBe(0);
      expect(metrics.cacheHits).toBe(0);
      expect(metrics.cacheMisses).toBe(0);
    });
  });

  describe("isEngineAvailable", () => {
    it("should return false for unavailable engines", () => {
      // This tests a non-installed engine
      expect(service.isEngineAvailable("vue")).toBe(false);
    });
  });
});
