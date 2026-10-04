import { createServer, type Socket } from "node:net";
import { randomUUID } from "node:crypto";
import { CacheProvider } from "../src/index";
import { RedisDriver, namespacePrefix } from "../src/redis.driver";

beforeAll(async () => {
  await import("ioredis");
}, 60000);

it("bounds initialization against a TCP server that never responds", async () => {
  const sockets = new Set<Socket>();
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("No test server port");
  const cache = new CacheProvider();
  cache.configure({
    driver: "redis",
    redis: { url: `redis://127.0.0.1:${address.port}`, timeoutMs: 100 },
  });
  try {
    const initialization = cache.bootstrap();
    const shutdown = cache.shutdown();
    expect(cache.configure({ driver: "memory" }).valid).toBe(false);
    await expect(cache.bootstrap()).rejects.toThrow("shut down");
    await expect(initialization).rejects.toThrow("initialization failed");
    await shutdown;
    expect((await cache.healthCheck()).status).toBe("unhealthy");
    await expect(cache.set("after-shutdown", 1)).rejects.toThrow("not ready");
  } finally {
    await cache.shutdown();
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

const url = process.env.CACHE_TEST_REDIS_URL;
(url ? describe : describe.skip)("real Redis failure behavior", () => {
  it("reports disconnected health and separates backend failure from misses", async () => {
    const cache = new CacheProvider();
    cache.configure({
      driver: "redis",
      namespace: randomUUID(),
      redis: { url, timeoutMs: 200 },
    });
    await cache.bootstrap();
    // Break the owned connection without changing provider readiness.
    const internal = cache as unknown as { driver: RedisDriver };
    await internal.driver.shutdown();
    expect((await cache.healthCheck()).details).toMatchObject({
      connected: false,
      driver: "redis",
    });
    expect((await cache.healthCheck()).status).toBe("unhealthy");
    await expect(cache.get("key")).rejects.toThrow("Cache read failed");
    expect(cache.getMetrics()).toMatchObject({
      hits: 0,
      misses: 0,
      errors: 1,
      hitRatio: 0,
    });
    await cache.shutdown();
  });
  it("rejects corrupted backend data and shares data only for exactly equal namespaces", async () => {
    const { Redis } = await import("ioredis");
    const client = new Redis(url!);
    const namespace = `test:${randomUUID()}`;
    const cache = new CacheProvider();
    const second = new CacheProvider();
    for (const provider of [cache, second]) {
      provider.configure({ driver: "redis", namespace, redis: { url } });
      await provider.bootstrap();
    }
    try {
      await cache.set("shared", false, 0);
      expect(await second.get("shared")).toBe(false);
      await client.set(
        namespacePrefix(namespace) + JSON.stringify("corrupt"),
        "not-json",
      );
      await expect(cache.get("corrupt")).rejects.toThrow("invalid serialized");
      expect(cache.getMetrics()).toMatchObject({
        hits: 0,
        misses: 0,
        errors: 1,
      });
    } finally {
      await cache.clear();
      await cache.shutdown();
      await second.shutdown();
      client.disconnect();
    }
  });
});
