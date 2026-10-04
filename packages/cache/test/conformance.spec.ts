import { randomUUID } from "node:crypto";
import { CacheProvider, type CacheValue } from "../src/index";

const redisUrl = process.env.CACHE_TEST_REDIS_URL;
const drivers = ["memory", ...(redisUrl ? ["redis"] : [])] as (
  "memory" | "redis"
)[];
if (!redisUrl)
  console.warn(
    "Redis conformance NOT run: set CACHE_TEST_REDIS_URL to require real Redis tests.",
  );

for (const driver of drivers) {
  describe(`${driver} shared conformance`, () => {
    let cache: CacheProvider;
    let other: CacheProvider;
    let clock: jest.SpyInstance | undefined;
    let now: number;
    const namespace = `test:${randomUUID()}:*[?]\\:é`;

    beforeEach(async () => {
      now = Date.now();
      if (driver === "memory")
        clock = jest.spyOn(Date, "now").mockImplementation(() => now);
      cache = new CacheProvider();
      other = new CacheProvider();
      for (const [provider, ns] of [
        [cache, namespace],
        [other, namespace + ":other"],
      ] as const) {
        expect(
          provider.configure({
            driver,
            namespace: ns,
            defaultTtl: 500,
            redis: { url: redisUrl },
          }).valid,
        ).toBe(true);
        await provider.bootstrap();
      }
    });
    afterEach(async () => {
      try {
        await cache.clear();
        await other.clear();
      } finally {
        await cache.shutdown();
        await other.shutdown();
        clock?.mockRestore();
      }
    });

    async function expire(key: string): Promise<void> {
      if (driver === "memory") {
        now += 501;
        return;
      }
      // Poll the real server's expiry condition with a deadline, not an arbitrary sleep.
      const deadline = Date.now() + 3000;
      while (await cache.has(key)) {
        if (Date.now() >= deadline)
          throw new Error("Redis entry did not expire before deadline");
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }

    it("misses, overwrites, existence and deletion", async () => {
      expect(await cache.get("missing")).toBeUndefined();
      expect(await cache.has("missing")).toBe(false);
      expect(await cache.del("missing")).toBe(false);
      expect(await cache.set("key", "one")).toBeUndefined();
      expect(await cache.get("key")).toBe("one");
      await cache.set("key", "two");
      expect(await cache.get("key")).toBe("two");
      expect(await cache.has("key")).toBe(true);
      expect(await cache.del("key")).toBe(true);
      expect(await cache.del("key")).toBe(false);
    });

    it.each(
      (
        [
          false,
          0,
          "",
          null,
          { nested: [false, 1, null, "é"] },
          [false, 0, "", null],
        ] as CacheValue[]
      ).map((value) => [value]),
    )("round trips JSON value %p", async (value) => {
      await cache.set("value", value, 0);
      expect(await cache.get("value")).toEqual(value);
      expect(await cache.has("value")).toBe(true);
    });

    it("default TTL, explicit override and non-expiring overwrite", async () => {
      await cache.set("default", 1);
      await cache.set("override", 2, 10000);
      await cache.set("persistent", 3, 0);
      await cache.set("remove-expiry", 4);
      await cache.set("remove-expiry", 5, 0);
      await expire("default");
      expect(await cache.get("default")).toBeUndefined();
      expect(await cache.del("default")).toBe(false);
      expect(await cache.get("override")).toBe(2);
      expect(await cache.get("persistent")).toBe(3);
      expect(await cache.get("remove-expiry")).toBe(5);
    });

    it("overwrite updates expiry", async () => {
      await cache.set("key", 1, 10000);
      await cache.set("key", 2, 500);
      await expire("key");
      expect(await cache.get("key")).toBeUndefined();
    });

    it.each([-1, NaN, Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1, "100", null])(
      "rejects invalid TTL %p without storing",
      async (ttl) => {
        await expect(cache.set("invalid", 1, ttl as number)).rejects.toThrow(
          "TTL",
        );
        expect(await cache.has("invalid")).toBe(false);
      },
    );

    it("isolates namespaces and clears only its namespace, including glob characters", async () => {
      for (let i = 0; i < 250; i++) await cache.set(`key:${i}`, i, 0);
      await other.set("key:0", "other", 0);
      expect(await cache.get("key:0")).toBe(0);
      expect(await other.get("key:0")).toBe("other");
      expect(await cache.clear()).toBeUndefined();
      for (let i = 0; i < 250; i++)
        expect(await cache.has(`key:${i}`)).toBe(false);
      expect(await other.get("key:0")).toBe("other");
    });

    it("copies JSON values and keeps malformed Unicode keys distinct", async () => {
      const original = { values: [1] };
      await cache.set("copy", original, 0);
      original.values.push(2);
      const first = await cache.get<typeof original>("copy");
      first!.values.push(3);
      expect(await cache.get("copy")).toEqual({ values: [1] });
      await cache.set("\ud800", "surrogate", 0);
      await cache.set("�", "replacement", 0);
      expect(await cache.get("\ud800")).toBe("surrogate");
    });

    it.each(
      [
        undefined,
        NaN,
        Infinity,
        -0,
        BigInt(1),
        new Date(),
        [undefined],
        { bad: undefined },
        [, 1],
      ].map((value) => [value]),
    )("rejects unsupported value %p", async (value) => {
      await expect(cache.set("bad", value as CacheValue)).rejects.toThrow();
    });
    it("rejects cycles and accessors", async () => {
      const cycle: Record<string, CacheValue> = {};
      cycle.self = cycle;
      await expect(cache.set("bad", cycle)).rejects.toThrow();
      await expect(
        cache.set("bad", {
          get value(): string {
            throw new Error("Getter should not execute");
          },
        }),
      ).rejects.toThrow("accessors");
    });

    it("counts get hits and misses only, including expired entries, without clear resetting", async () => {
      expect(cache.getMetrics().hitRatio).toBe(0);
      await cache.set("hit", false, 0);
      await cache.get("hit");
      await cache.get("missing");
      await cache.has("hit");
      await cache.del("missing");
      await cache.set("expire", 1);
      await expire("expire");
      await cache.get("expire");
      expect(cache.getMetrics()).toMatchObject({
        hits: 1,
        misses: 2,
        hitRatio: 1 / 3,
        errors: 0,
      });
      await cache.clear();
      expect(cache.getMetrics().hits).toBe(1);
      expect(other.getMetrics().hits).toBe(0);
    });

    it("reports connectivity and rejects operations outside lifecycle", async () => {
      const fresh = new CacheProvider();
      await expect(fresh.get("key")).rejects.toThrow("not ready");
      expect((await fresh.healthCheck()).status).toBe("unhealthy");
      expect(await cache.healthCheck()).toMatchObject({
        status: "healthy",
        details: { driver, connected: true },
      });
      await cache.shutdown();
      await cache.shutdown();
      expect((await cache.healthCheck()).status).toBe("unhealthy");
      for (const operation of [
        () => cache.get("x"),
        () => cache.set("x", 1),
        () => cache.del("x"),
        () => cache.has("x"),
        () => cache.clear(),
        () => cache.bootstrap(),
      ]) {
        await expect(operation()).rejects.toThrow();
      }
      // Restore a live instance for namespace cleanup.
      cache = new CacheProvider();
      cache.configure({ driver, namespace, redis: { url: redisUrl } });
      await cache.bootstrap();
    });
  });
}
