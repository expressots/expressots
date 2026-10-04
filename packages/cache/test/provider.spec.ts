import { CacheProvider } from "../src/index";
import {
  AppContainer,
  CreateModule,
  ProviderRegistry,
  LifecycleRegistry,
} from "@expressots/core";

describe("provider configuration and discovery", () => {
  const env = { ...process.env };
  beforeAll(async () => {
    await import("ioredis");
  }, 60000);
  afterEach(() => {
    process.env = { ...env };
  });
  it("uses environment defaults with fieldwise code precedence", async () => {
    process.env.CACHE_DRIVER = "redis";
    process.env.CACHE_NAMESPACE = "env";
    process.env.CACHE_CAPACITY = "2";
    process.env.CACHE_DEFAULT_TTL_MS = "100";
    const provider = new CacheProvider();
    expect(provider.configure({ driver: "memory", defaultTtl: 0 }).valid).toBe(
      true,
    );
    await provider.bootstrap();
    await provider.set("a", 1);
    await provider.set("b", 2);
    await provider.set("c", 3);
    expect(await provider.get("a")).toBeUndefined();
    expect(provider.configure({ capacity: 3 })).toMatchObject({ valid: false });
    await provider.shutdown();
    expect(provider.configure({})).toMatchObject({ valid: false });
  });
  it.each([
    { capacity: 0 },
    { defaultTtl: null },
    { redis: null },
    { capacity: 1.5 },
    { namespace: "" },
    { namespace: "\ud800" },
    { defaultTtl: -1 },
    { driver: "bad" },
    { redis: { url: "invalid password" } },
    { redis: { timeoutMs: 0 } },
  ])("rejects invalid config %p", async (config) => {
    const provider = new CacheProvider();
    const result = provider.configure(config as never);
    expect(result.valid).toBe(false);
    expect(JSON.stringify(result)).not.toContain("password");
  });
  it("rejects invalid environment configuration at bootstrap", async () => {
    process.env.CACHE_DRIVER = "bad";
    await expect(new CacheProvider().bootstrap()).rejects.toThrow("driver");
  });
  it("registers as an external singleton with capabilities and lifecycle", async () => {
    const app = new AppContainer();
    app.create([CreateModule([CacheProvider])]);
    const container = app.Container;
    const registry = new ProviderRegistry(container);
    registry.discover();
    expect(registry.getExternalProviders()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          target: CacheProvider,
          scope: "Singleton",
          capabilities: {
            hasBootstrap: true,
            hasShutdown: true,
            hasHealthCheck: true,
            hasMetrics: true,
            hasConfigurable: true,
          },
        }),
      ]),
    );
    const instance = container.get(CacheProvider);
    expect(instance).toBe(container.get(CacheProvider));
    const lifecycle = new LifecycleRegistry(container);
    lifecycle.discover();
    await lifecycle.executeBootstrap();
    await instance.set("test", false);
    expect(await instance.get("test")).toBe(false);
    await lifecycle.executeShutdown();
    expect((await instance.healthCheck()).status).toBe("unhealthy");
  });
  it("shares simultaneous initialization and permits retry after failure without leaking", async () => {
    const provider = new CacheProvider();
    provider.configure({
      driver: "redis",
      redis: { url: "redis://user:secret@127.0.0.1:1", timeoutMs: 100 },
    });
    const results = await Promise.allSettled([
      provider.bootstrap(),
      provider.bootstrap(),
    ]);
    for (const result of results) {
      expect(result.status).toBe("rejected");
      if (result.status === "rejected") {
        expect(result.reason.message).toContain("initialization failed");
        expect(result.reason.message).not.toContain("secret");
      }
    }
    expect((await provider.healthCheck()).status).toBe("unhealthy");
    expect(provider.configure({ driver: "memory" }).valid).toBe(true);
    await provider.bootstrap();
    await provider.shutdown();
  });
});
