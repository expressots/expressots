import { BaseEngineAdapter } from "../adapters/base-adapter";
import type { Application } from "express";

// Create a concrete implementation for testing
class TestAdapter extends BaseEngineAdapter {
  readonly name = "test";
  readonly extensions = [".test"];
  readonly packageName = "test-engine";

  async setup(app: Application, options: any): Promise<void> {
    this.setViewsDir(options?.viewsDir || "views");
    this.isInitialized = true;
  }

  async render(view: string, data: any): Promise<string> {
    return `<div>Rendered: ${view} with ${JSON.stringify(data)}</div>`;
  }

  // Expose protected methods for testing
  public testResolvePackage(name: string): any {
    return this.resolvePackage(name);
  }

  public testIsPackageInstalled(name: string): boolean {
    return this.isPackageInstalled(name);
  }

  public testCacheView(key: string, compiled: any): void {
    this.cacheView(key, compiled);
  }

  public testGetCachedView(key: string): any {
    return this.getCachedView(key);
  }

  public testHasCachedView(key: string): boolean {
    return this.hasCachedView(key);
  }

  public testClearCache(): void {
    this.clearCache();
  }

  public testGetViewsDir(): string | Array<string> {
    return this.getViewsDir();
  }
}

describe("BaseEngineAdapter", () => {
  let adapter: TestAdapter;

  beforeEach(() => {
    adapter = new TestAdapter();
  });

  describe("properties", () => {
    it("should have correct name", () => {
      expect(adapter.name).toBe("test");
    });

    it("should have correct extensions", () => {
      expect(adapter.extensions).toEqual([".test"]);
    });

    it("should have correct package name", () => {
      expect(adapter.packageName).toBe("test-engine");
    });

    it("should not support streaming by default", () => {
      expect(adapter.supportsStreaming).toBe(false);
    });

    it("should not support SSR by default", () => {
      expect(adapter.supportsSSR).toBe(false);
    });
  });

  describe("setup", () => {
    it("should initialize the adapter", async () => {
      const mockApp = {} as Application;
      await adapter.setup(mockApp, { viewsDir: "/custom/views" });

      expect(adapter.testGetViewsDir()).toBe("/custom/views");
    });

    it("should use default views dir when not specified", async () => {
      const mockApp = {} as Application;
      await adapter.setup(mockApp, {});

      expect(adapter.testGetViewsDir()).toBe("views");
    });
  });

  describe("render", () => {
    it("should render a template", async () => {
      const result = await adapter.render("index", { name: "World" });
      expect(result).toContain("Rendered: index");
      expect(result).toContain("World");
    });
  });

  describe("caching", () => {
    it("should cache and retrieve views", () => {
      const compiled = () => "<div>Compiled</div>";
      adapter.testCacheView("test.html", compiled);

      expect(adapter.testHasCachedView("test.html")).toBe(true);
      expect(adapter.testGetCachedView("test.html")).toBe(compiled);
    });

    it("should return false for non-cached views", () => {
      expect(adapter.testHasCachedView("nonexistent")).toBe(false);
    });

    it("should clear cache", () => {
      adapter.testCacheView("test.html", "compiled");
      adapter.testClearCache();

      expect(adapter.testHasCachedView("test.html")).toBe(false);
    });
  });

  describe("isPackageInstalled", () => {
    it("should return true for installed packages", () => {
      // 'path' is a built-in Node.js module
      expect(adapter.testIsPackageInstalled("path")).toBe(true);
    });

    it("should return false for non-installed packages", () => {
      expect(
        adapter.testIsPackageInstalled("some-nonexistent-package-12345"),
      ).toBe(false);
    });
  });

  describe("resolvePackage", () => {
    it("should resolve installed packages", () => {
      const pathModule = adapter.testResolvePackage("path");
      expect(pathModule).toBeDefined();
      expect(typeof pathModule.join).toBe("function");
    });

    it("should throw for non-installed packages", () => {
      expect(() =>
        adapter.testResolvePackage("some-nonexistent-package-12345"),
      ).toThrow();
    });
  });

  describe("onHotReload", () => {
    it("should clear cache on hot reload", () => {
      adapter.testCacheView("test.html", "compiled");
      adapter.onHotReload();

      expect(adapter.testHasCachedView("test.html")).toBe(false);
    });
  });

  describe("onCacheInvalidate", () => {
    it("should clear cache on invalidation", () => {
      adapter.testCacheView("test.html", "compiled");
      adapter.onCacheInvalidate();

      expect(adapter.testHasCachedView("test.html")).toBe(false);
    });
  });
});
