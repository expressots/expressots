/**
 * Lazy Loading Module Tests
 *
 * Comprehensive test coverage for the lazy loading system.
 */

import "reflect-metadata";
import { Container, ContainerModule } from "../di/inversify";
import {
  LazyModule,
  CreateLazyModule,
  createLazyModule,
  isLazyModule,
} from "./lazy-module";
import { LazyModuleLoader, createLazyModuleLoader } from "./lazy-module-loader";
import {
  LazyModuleManager,
  createLazyModuleManager,
} from "./lazy-module-manager";
import { LazyLoadMetrics, createLazyLoadMetrics } from "./lazy-load-metrics";
import { LazyModuleWarmup, createLazyModuleWarmup } from "./lazy-module-warmup";
import { ILazyModule, PreloadHint } from "./lazy.interfaces";

// ============================================================================
// Test Helpers
// ============================================================================

class TestController {
  getData(): string {
    return "test data";
  }
}

class AdminController {
  getAdmin(): string {
    return "admin data";
  }
}

function createTestContainerModule(): ContainerModule {
  return new ContainerModule((bind) => {
    bind("TestService").toConstantValue({ test: true });
  });
}

function createDelayedModule(delayMs: number): ContainerModule {
  return new ContainerModule((bind) => {
    // Simulate some binding work
    bind("DelayedService").toConstantValue({ delayed: true });
  });
}

// ============================================================================
// LazyModule Tests
// ============================================================================

describe("LazyModule", () => {
  describe("constructor", () => {
    it("should create a lazy module with default config", () => {
      const factory = () => createTestContainerModule();
      const lazyModule = new LazyModule(factory);

      expect(lazyModule.status).toBe("pending");
      expect(lazyModule.isLoaded).toBe(false);
      expect(lazyModule.loadTime).toBeNull();
      expect(lazyModule.error).toBeNull();
      expect(lazyModule.module).toBeNull();
      expect(lazyModule.config.preloadHint).toBe("low");
    });

    it("should create a lazy module with custom config", () => {
      const factory = () => createTestContainerModule();
      const lazyModule = new LazyModule(factory, {
        name: "CustomModule",
        preloadHint: "high",
        timeout: 5000,
      });

      expect(lazyModule.name).toBe("CustomModule");
      expect(lazyModule.config.preloadHint).toBe("high");
      expect(lazyModule.config.timeout).toBe(5000);
    });
  });

  describe("load()", () => {
    it("should load the module", async () => {
      const factory = () => createTestContainerModule();
      const lazyModule = new LazyModule(factory, { name: "TestModule" });

      const containerModule = await lazyModule.load();

      expect(containerModule).toBeDefined();
      expect(lazyModule.status).toBe("loaded");
      expect(lazyModule.isLoaded).toBe(true);
      expect(lazyModule.loadTime).toBeGreaterThanOrEqual(0);
      expect(lazyModule.module).toBe(containerModule);
    });

    it("should return same module on repeated calls", async () => {
      const factory = jest.fn(() => createTestContainerModule());
      const lazyModule = new LazyModule(factory, { name: "TestModule" });

      const module1 = await lazyModule.load();
      const module2 = await lazyModule.load();

      expect(module1).toBe(module2);
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it("should handle async factory", async () => {
      const factory = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return createTestContainerModule();
      };
      const lazyModule = new LazyModule(factory, { name: "AsyncModule" });

      const containerModule = await lazyModule.load();

      expect(containerModule).toBeDefined();
      expect(lazyModule.isLoaded).toBe(true);
    });

    it("should handle factory errors", async () => {
      const factory = () => {
        throw new Error("Factory failed");
      };
      const lazyModule = new LazyModule(factory, {
        name: "FailingModule",
        timeout: 100,
      });

      await expect(lazyModule.load()).rejects.toThrow("Factory failed");
      expect(lazyModule.status).toBe("failed");
      expect(lazyModule.error).toBeDefined();
      expect(lazyModule.error?.message).toBe("Factory failed");
    });
  });

  describe("withPreloadHint()", () => {
    it("should set preload hint with fluent API", () => {
      const factory = () => createTestContainerModule();
      const lazyModule = new LazyModule(factory).withPreloadHint("high");

      expect(lazyModule.config.preloadHint).toBe("high");
    });

    it("should be chainable", () => {
      const factory = () => createTestContainerModule();
      const lazyModule = new LazyModule(factory)
        .withPreloadHint("medium")
        .withLazyConfig({ timeout: 10000 });

      expect(lazyModule.config.preloadHint).toBe("medium");
      expect(lazyModule.config.timeout).toBe(10000);
    });
  });

  describe("withLazyConfig()", () => {
    it("should merge configuration", () => {
      const factory = () => createTestContainerModule();
      const lazyModule = new LazyModule(factory, {
        name: "Test",
      }).withLazyConfig({
        prefetchAfterIdle: 5000,
        dependencies: ["OtherModule"],
      });

      expect(lazyModule.config.prefetchAfterIdle).toBe(5000);
      expect(lazyModule.config.dependencies).toEqual(["OtherModule"]);
    });
  });
});

// ============================================================================
// CreateLazyModule Tests
// ============================================================================

describe("CreateLazyModule", () => {
  it("should create a lazy module from controllers", () => {
    const lazyModule = CreateLazyModule([TestController]);

    expect(isLazyModule(lazyModule)).toBe(true);
    expect(lazyModule.status).toBe("pending");
  });

  it("should support custom configuration", () => {
    const lazyModule = CreateLazyModule([TestController], {
      name: "TestControllerModule",
      preloadHint: "medium",
    });

    expect(lazyModule.name).toBe("TestControllerModule");
    expect(lazyModule.config.preloadHint).toBe("medium");
  });

  it("should support fluent API", () => {
    const lazyModule = CreateLazyModule([TestController])
      .withPreloadHint("high")
      .withLazyConfig({ prefetchAfterIdle: 10000 });

    expect(lazyModule.config.preloadHint).toBe("high");
    expect(lazyModule.config.prefetchAfterIdle).toBe(10000);
  });
});

// ============================================================================
// createLazyModule Tests
// ============================================================================

describe("createLazyModule", () => {
  it("should create a lazy module from factory", () => {
    const lazyModule = createLazyModule(() => createTestContainerModule(), {
      name: "FactoryModule",
    });

    expect(isLazyModule(lazyModule)).toBe(true);
    expect(lazyModule.name).toBe("FactoryModule");
  });

  it("should support async factory", async () => {
    const lazyModule = createLazyModule(
      async () => {
        await new Promise((r) => setTimeout(r, 5));
        return createTestContainerModule();
      },
      { name: "AsyncFactoryModule" },
    );

    const module = await lazyModule.load();
    expect(module).toBeDefined();
  });
});

// ============================================================================
// isLazyModule Tests
// ============================================================================

describe("isLazyModule", () => {
  it("should return true for lazy modules", () => {
    const lazyModule = CreateLazyModule([TestController]);
    expect(isLazyModule(lazyModule)).toBe(true);
  });

  it("should return false for regular objects", () => {
    expect(isLazyModule({})).toBe(false);
    expect(isLazyModule(null)).toBe(false);
    expect(isLazyModule(undefined)).toBe(false);
    expect(isLazyModule(createTestContainerModule())).toBe(false);
  });
});

// ============================================================================
// LazyModuleLoader Tests
// ============================================================================

describe("LazyModuleLoader", () => {
  let loader: LazyModuleLoader;
  let container: Container;

  beforeEach(() => {
    container = new Container();
    loader = createLazyModuleLoader(container);
  });

  describe("register()", () => {
    it("should register a lazy module", () => {
      const lazyModule = CreateLazyModule([TestController], {
        name: "TestModule",
      });

      loader.register(lazyModule);

      expect(loader.getAll()).toHaveLength(1);
      expect(loader.get("TestModule")).toBe(lazyModule);
    });

    it("should warn on duplicate registration", () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation();
      const lazyModule = CreateLazyModule([TestController], {
        name: "TestModule",
      });

      loader.register(lazyModule);
      loader.register(lazyModule);

      expect(warnSpy).toHaveBeenCalled();
      expect(loader.getAll()).toHaveLength(1);

      warnSpy.mockRestore();
    });

    it("should throw on invalid module", () => {
      expect(() => loader.register({} as ILazyModule)).toThrow(
        "Invalid lazy module",
      );
    });
  });

  describe("load()", () => {
    it("should load a registered module", async () => {
      const lazyModule = CreateLazyModule([TestController], {
        name: "TestModule",
      });
      loader.register(lazyModule);

      const containerModule = await loader.load("TestModule");

      expect(containerModule).toBeDefined();
      expect(loader.isLoaded("TestModule")).toBe(true);
    });

    it("should throw on unknown module", async () => {
      await expect(loader.load("UnknownModule")).rejects.toThrow("not found");
    });

    it("should load dependencies first", async () => {
      const loadOrder: string[] = [];

      const depModule = createLazyModule(
        () => {
          loadOrder.push("Dependency");
          return createTestContainerModule();
        },
        { name: "Dependency" },
      );

      const mainModule = createLazyModule(
        () => {
          loadOrder.push("Main");
          return createTestContainerModule();
        },
        { name: "Main", dependencies: ["Dependency"] },
      );

      loader.register(depModule);
      loader.register(mainModule);

      await loader.load("Main");

      expect(loadOrder).toEqual(["Dependency", "Main"]);
    });
  });

  describe("loadAll()", () => {
    it("should load multiple modules", async () => {
      const module1 = CreateLazyModule([TestController], { name: "Module1" });
      const module2 = CreateLazyModule([AdminController], { name: "Module2" });

      loader.register(module1);
      loader.register(module2);

      const modules = await loader.loadAll(["Module1", "Module2"]);

      expect(modules).toHaveLength(2);
      expect(loader.isLoaded("Module1")).toBe(true);
      expect(loader.isLoaded("Module2")).toBe(true);
    });

    it("should respect dependency order", async () => {
      const loadOrder: string[] = [];

      const module1 = createLazyModule(
        () => {
          loadOrder.push("A");
          return createTestContainerModule();
        },
        { name: "A" },
      );
      const module2 = createLazyModule(
        () => {
          loadOrder.push("B");
          return createTestContainerModule();
        },
        { name: "B", dependencies: ["A"] },
      );
      const module3 = createLazyModule(
        () => {
          loadOrder.push("C");
          return createTestContainerModule();
        },
        { name: "C", dependencies: ["B"] },
      );

      loader.register(module1);
      loader.register(module2);
      loader.register(module3);

      await loader.loadAll(["C", "A", "B"]);

      expect(loadOrder).toEqual(["A", "B", "C"]);
    });
  });

  describe("status queries", () => {
    it("should query by status", () => {
      const module1 = CreateLazyModule([TestController], { name: "Module1" });
      const module2 = CreateLazyModule([AdminController], { name: "Module2" });

      loader.register(module1);
      loader.register(module2);

      expect(loader.getByStatus("pending")).toHaveLength(2);
      expect(loader.getByStatus("loaded")).toHaveLength(0);
    });

    it("should query by hint", () => {
      const highModule = CreateLazyModule([TestController], {
        name: "High",
      }).withPreloadHint("high");
      const lowModule = CreateLazyModule([AdminController], {
        name: "Low",
      }).withPreloadHint("low");

      loader.register(highModule);
      loader.register(lowModule);

      expect(loader.getByHint("high")).toHaveLength(1);
      expect(loader.getByHint("low")).toHaveLength(1);
      expect(loader.getByHint("medium")).toHaveLength(0);
    });
  });
});

// ============================================================================
// LazyModuleManager Tests
// ============================================================================

describe("LazyModuleManager", () => {
  let loader: LazyModuleLoader;
  let manager: LazyModuleManager;

  beforeEach(() => {
    loader = createLazyModuleLoader();
    manager = createLazyModuleManager(loader);
  });

  describe("module queries", () => {
    it("should list loaded modules", async () => {
      const module1 = CreateLazyModule([TestController], { name: "Module1" });
      const module2 = CreateLazyModule([AdminController], { name: "Module2" });

      loader.register(module1);
      loader.register(module2);

      await loader.load("Module1");

      expect(manager.getLoadedModules()).toEqual(["Module1"]);
      expect(manager.getPendingModules()).toEqual(["Module2"]);
    });

    it("should check if module is loaded", async () => {
      const module = CreateLazyModule([TestController], { name: "TestModule" });
      loader.register(module);

      expect(manager.isLoaded("TestModule")).toBe(false);

      await manager.load("TestModule");

      expect(manager.isLoaded("TestModule")).toBe(true);
    });
  });

  describe("getStatistics()", () => {
    it("should return correct statistics", async () => {
      const module1 = CreateLazyModule([TestController], { name: "Module1" });
      const module2 = CreateLazyModule([AdminController], { name: "Module2" });

      loader.register(module1);
      loader.register(module2);

      await loader.load("Module1");

      const stats = manager.getStatistics();

      expect(stats.totalModules).toBe(2);
      expect(stats.loadedModules).toBe(1);
      expect(stats.lazyModules).toBe(1);
      expect(stats.failedModules).toBe(0);
      expect(stats.avgLoadTime).toBeGreaterThanOrEqual(0);
    });
  });
});

// ============================================================================
// LazyLoadMetrics Tests
// ============================================================================

describe("LazyLoadMetrics", () => {
  let loader: LazyModuleLoader;
  let metrics: LazyLoadMetrics;

  beforeEach(() => {
    loader = createLazyModuleLoader();
    metrics = createLazyLoadMetrics(loader);
  });

  describe("recordAccess()", () => {
    it("should record module access", () => {
      const module = CreateLazyModule([TestController], { name: "TestModule" });
      loader.register(module);

      metrics.recordAccess("TestModule");
      metrics.recordAccess("TestModule");

      const recommendations = metrics.getRecommendations();
      expect(recommendations["TestModule"]).toBeDefined();
    });
  });

  describe("getRecommendations()", () => {
    it("should generate recommendations for all modules", () => {
      const module1 = CreateLazyModule([TestController], {
        name: "Module1",
      }).withPreloadHint("low");
      const module2 = CreateLazyModule([AdminController], {
        name: "Module2",
      }).withPreloadHint("high");

      loader.register(module1);
      loader.register(module2);

      const recommendations = metrics.getRecommendations();

      expect(recommendations["Module1"]).toBeDefined();
      expect(recommendations["Module2"]).toBeDefined();
      expect(recommendations["Module1"].currentStrategy).toBe("lazy");
      expect(recommendations["Module2"].currentStrategy).toBe("eager");
    });
  });

  describe("export()", () => {
    it("should export metrics as JSON", () => {
      const module = CreateLazyModule([TestController], { name: "TestModule" });
      loader.register(module);

      const json = metrics.export();
      const parsed = JSON.parse(json);

      expect(parsed.startupTime).toBeDefined();
      expect(parsed.modules).toBeDefined();
      expect(parsed.recommendations).toBeDefined();
    });
  });

  describe("reset()", () => {
    it("should clear all metrics", () => {
      metrics.recordAccess("TestModule");
      metrics.recordLoadTime("TestModule", 100);

      metrics.reset();

      expect(metrics.getStartupTimeSaved()).toBe(0);
    });
  });
});

// ============================================================================
// LazyModuleWarmup Tests
// ============================================================================

describe("LazyModuleWarmup", () => {
  let loader: LazyModuleLoader;
  let warmup: LazyModuleWarmup;

  beforeEach(() => {
    loader = createLazyModuleLoader();
    warmup = createLazyModuleWarmup(loader);
  });

  afterEach(() => {
    warmup.stop();
  });

  describe("start()", () => {
    it("should warm up modules", async () => {
      const module1 = CreateLazyModule([TestController], {
        name: "Module1",
      }).withPreloadHint("high");
      const module2 = CreateLazyModule([AdminController], {
        name: "Module2",
      }).withPreloadHint("high");

      loader.register(module1);
      loader.register(module2);

      await warmup.start({
        strategy: "immediate",
        hints: ["high"],
      });

      expect(warmup.getWarmedModules()).toContain("Module1");
      expect(warmup.getWarmedModules()).toContain("Module2");
    });

    it("should respect priority order", async () => {
      const loadOrder: string[] = [];

      const module1 = createLazyModule(
        () => {
          loadOrder.push("A");
          return createTestContainerModule();
        },
        { name: "A", preloadHint: "high" },
      );
      const module2 = createLazyModule(
        () => {
          loadOrder.push("B");
          return createTestContainerModule();
        },
        { name: "B", preloadHint: "high" },
      );

      loader.register(module1);
      loader.register(module2);

      await warmup.start({
        strategy: "immediate",
        priority: ["B", "A"],
        hints: ["high"],
      });

      expect(loadOrder[0]).toBe("B");
      expect(loadOrder[1]).toBe("A");
    });
  });

  describe("stop()", () => {
    it("should stop warmup process", async () => {
      let loadStarted = false;

      const module = createLazyModule(
        async () => {
          loadStarted = true;
          await new Promise((r) => setTimeout(r, 50));
          return createTestContainerModule();
        },
        { name: "WarmupStopTestModule", preloadHint: "high" },
      );

      loader.register(module);

      // Start warmup with short delay
      const warmupPromise = warmup.start({
        strategy: "immediate",
        delay: 0,
        hints: ["high"],
      });

      // Let warmup start
      await new Promise((r) => setTimeout(r, 10));
      warmup.stop();

      await warmupPromise;

      expect(warmup.isRunning()).toBe(false);
    });
  });

  describe("getProgress()", () => {
    it("should report progress", async () => {
      const module1 = CreateLazyModule([TestController], {
        name: "Module1",
      }).withPreloadHint("high");
      const module2 = CreateLazyModule([AdminController], {
        name: "Module2",
      }).withPreloadHint("high");

      loader.register(module1);
      loader.register(module2);

      expect(warmup.getProgress()).toBe(100); // Nothing to warm

      await warmup.start({
        strategy: "immediate",
        hints: ["high"],
      });

      expect(warmup.getProgress()).toBe(100);
    });
  });

  describe("duplicate start", () => {
    it("should warn and return if already running", async () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation();

      const module = createLazyModule(
        async () => {
          await new Promise((r) => setTimeout(r, 100));
          return createTestContainerModule();
        },
        { name: "SlowModule", preloadHint: "high" },
      );

      loader.register(module);

      // Start warmup
      const promise1 = warmup.start({
        strategy: "immediate",
        hints: ["high"],
      });

      // Try to start again immediately
      await warmup.start({ strategy: "immediate", hints: ["high"] });

      expect(warnSpy).toHaveBeenCalledWith(
        "[LazyModuleWarmup] Warmup already in progress",
      );

      await promise1;
      warnSpy.mockRestore();
    });
  });
});

// ============================================================================
// Additional LazyLoadMetrics Tests
// ============================================================================

describe("LazyLoadMetrics Extended", () => {
  let loader: LazyModuleLoader;
  let metrics: LazyLoadMetrics;

  beforeEach(() => {
    loader = createLazyModuleLoader();
    metrics = createLazyLoadMetrics(loader);
  });

  describe("getRecommendation()", () => {
    it("should return recommendation for specific module", () => {
      const module = CreateLazyModule([TestController], {
        name: "TestModule",
      }).withPreloadHint("low");
      loader.register(module);

      const rec = metrics.getRecommendation("TestModule");

      expect(rec).toBeDefined();
      expect(rec?.currentStrategy).toBe("lazy");
    });

    it("should return undefined for non-existent module", () => {
      const rec = metrics.getRecommendation("NonExistent");
      expect(rec).toBeUndefined();
    });
  });

  describe("applyRecommendations()", () => {
    it("should not apply if autoOptimize is false", async () => {
      const module = CreateLazyModule([TestController], {
        name: "TestModule",
      });
      loader.register(module);

      // Record access to trigger preloading suggestion
      metrics.recordAccess("TestModule");
      metrics.recordLoadTime("TestModule", 100);

      await metrics.applyRecommendations({ autoOptimize: false });

      // Module should still be pending
      expect(loader.isLoaded("TestModule")).toBe(false);
    });

    it("should apply recommendations with maxStartupTime limit", async () => {
      const module1 = createLazyModule(() => createTestContainerModule(), {
        name: "FastModule",
        preloadHint: "low",
      });
      const module2 = createLazyModule(() => createTestContainerModule(), {
        name: "SlowModule",
        preloadHint: "low",
      });

      loader.register(module1);
      loader.register(module2);

      // Record very early access for FastModule
      metrics.recordAccess("FastModule");
      metrics.recordLoadTime("FastModule", 50);

      await metrics.applyRecommendations({
        autoOptimize: true,
        maxStartupTime: 100,
      });

      // Implementation detail: only preloads if suggestion includes "preloading"
      // Since we recorded early access, it should suggest preloading
    });

    it("should handle load failure gracefully", async () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation();

      const failingModule = createLazyModule(
        () => {
          throw new Error("Load failed");
        },
        { name: "FailingModule", preloadHint: "low" },
      );

      loader.register(failingModule);

      // Record very early access to trigger preloading
      metrics.recordAccess("FailingModule");

      await metrics.applyRecommendations({
        autoOptimize: true,
        maxStartupTime: 1000,
      });

      // Should not throw, just warn
      warnSpy.mockRestore();
    });
  });

  describe("recordLoadTime()", () => {
    it("should record multiple load times", () => {
      metrics.recordLoadTime("Module1", 100);
      metrics.recordLoadTime("Module2", 200);

      // Verify through export
      const exported = JSON.parse(metrics.export());
      expect(exported.startupTimeSaved).toBeDefined();
    });
  });

  describe("recommendation generation", () => {
    it("should suggest eager for frequently accessed modules", () => {
      const module = CreateLazyModule([TestController], {
        name: "FrequentModule",
      }).withPreloadHint("high"); // eager
      loader.register(module);

      // Record multiple early accesses
      for (let i = 0; i < 10; i++) {
        metrics.recordAccess("FrequentModule");
      }

      const rec = metrics.getRecommendation("FrequentModule");
      expect(rec?.currentStrategy).toBe("eager");
    });
  });
});

// ============================================================================
// Additional LazyModuleLoader Tests
// ============================================================================

describe("LazyModuleLoader Extended", () => {
  let loader: LazyModuleLoader;
  let container: Container;

  beforeEach(() => {
    container = new Container();
    loader = createLazyModuleLoader(container);
  });

  describe("loadAll() with errors", () => {
    it("should throw if one module fails", async () => {
      const failingModule = createLazyModule(
        () => {
          throw new Error("Module failed");
        },
        { name: "FailingModule" },
      );
      const successModule = CreateLazyModule([TestController], {
        name: "SuccessModule",
      });

      loader.register(failingModule);
      loader.register(successModule);

      await expect(
        loader.loadAll(["FailingModule", "SuccessModule"]),
      ).rejects.toThrow();
    });
  });

  describe("get()", () => {
    it("should return module by name", () => {
      const module = CreateLazyModule([TestController], { name: "TestModule" });
      loader.register(module);

      expect(loader.get("TestModule")).toBe(module);
    });

    it("should return undefined for non-existent module", () => {
      expect(loader.get("NonExistent")).toBeUndefined();
    });
  });

  describe("getStatus()", () => {
    it("should return module status", () => {
      const module = CreateLazyModule([TestController], { name: "TestModule" });
      loader.register(module);

      expect(loader.getStatus("TestModule")).toBe("pending");
    });

    it("should return undefined for non-existent module", () => {
      expect(loader.getStatus("NonExistent")).toBeUndefined();
    });
  });

  describe("loadByHint()", () => {
    it("should load all modules with matching hint", async () => {
      const highModule = CreateLazyModule([TestController], {
        name: "HighModule",
      }).withPreloadHint("high");
      const lowModule = CreateLazyModule([AdminController], {
        name: "LowModule",
      }).withPreloadHint("low");

      loader.register(highModule);
      loader.register(lowModule);

      await loader.loadByHint("high");

      expect(loader.isLoaded("HighModule")).toBe(true);
      expect(loader.isLoaded("LowModule")).toBe(false);
    });
  });

  describe("registerAll()", () => {
    it("should register multiple modules", () => {
      const module1 = CreateLazyModule([TestController], { name: "Module1" });
      const module2 = CreateLazyModule([AdminController], { name: "Module2" });

      loader.registerAll([module1, module2]);

      expect(loader.getAll()).toHaveLength(2);
    });
  });
});

// ============================================================================
// Additional LazyModule Tests
// ============================================================================

describe("LazyModule Extended", () => {
  describe("timeout handling", () => {
    it("should handle module with timeout configuration", () => {
      const lazyModule = new LazyModule(() => createTestContainerModule(), {
        name: "TimeoutModule",
        timeout: 5000,
      });

      expect(lazyModule.config.timeout).toBe(5000);
    });
  });

  describe("concurrent load calls", () => {
    it("should return same promise for concurrent loads", async () => {
      const factory = jest.fn(() => {
        return new Promise<ContainerModule>((resolve) => {
          setTimeout(() => resolve(createTestContainerModule()), 50);
        });
      });

      const lazyModule = new LazyModule(factory, { name: "ConcurrentModule" });

      // Start multiple loads concurrently
      const [result1, result2, result3] = await Promise.all([
        lazyModule.load(),
        lazyModule.load(),
        lazyModule.load(),
      ]);

      // All should return the same module
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);

      // Factory should only be called once
      expect(factory).toHaveBeenCalledTimes(1);
    });
  });

  describe("dependencies configuration", () => {
    it("should store dependencies in config", () => {
      const lazyModule = new LazyModule(() => createTestContainerModule(), {
        name: "DependentModule",
        dependencies: ["ModuleA", "ModuleB"],
      });

      expect(lazyModule.config.dependencies).toEqual(["ModuleA", "ModuleB"]);
    });
  });
});

// ============================================================================
// Additional LazyModuleManager Tests
// ============================================================================

describe("LazyModuleManager Extended", () => {
  let loader: LazyModuleLoader;
  let manager: LazyModuleManager;

  beforeEach(() => {
    loader = createLazyModuleLoader();
    manager = createLazyModuleManager(loader);
  });

  describe("getFailedModules()", () => {
    it("should return failed modules", async () => {
      const failingModule = createLazyModule(
        () => {
          throw new Error("Failed");
        },
        { name: "FailingModule" },
      );

      loader.register(failingModule);

      try {
        await manager.load("FailingModule");
      } catch {
        // Expected
      }

      const failed = manager.getFailedModules();
      expect(failed).toContain("FailingModule");
    });
  });

  describe("unload()", () => {
    it("should attempt to unload a module", async () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation();

      const module = CreateLazyModule([TestController], {
        name: "UnloadableModule",
      });
      loader.register(module);

      await manager.load("UnloadableModule");

      const result = await manager.unload("UnloadableModule");

      // Currently unload returns false because it's not fully supported
      expect(result).toBe(false);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it("should return false for non-existent module", async () => {
      const result = await manager.unload("NonExistent");
      expect(result).toBe(false);
    });
  });

  describe("loadByHint()", () => {
    it("should load modules by hint", async () => {
      const module = CreateLazyModule([TestController], {
        name: "HighModule",
      }).withPreloadHint("high");

      loader.register(module);

      await manager.loadByHint("high");

      expect(manager.isLoaded("HighModule")).toBe(true);
    });
  });
});
