import { CacheManager } from "../utils/cache-manager";

describe("CacheManager", () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager({ enabled: true, ttl: 3600, maxSize: 100 });
  });

  describe("set and get", () => {
    it("should store and retrieve values", () => {
      cache.set("key1", "value1");
      expect(cache.get("key1")).toBe("value1");
    });

    it("should return undefined for non-existent keys", () => {
      expect(cache.get("nonexistent")).toBeUndefined();
    });

    it("should store objects", () => {
      const obj = { foo: "bar", nested: { value: 42 } };
      cache.set("obj", obj);
      expect(cache.get("obj")).toEqual(obj);
    });

    it("should store functions", () => {
      const fn = () => "compiled template";
      cache.set("fn", fn);
      expect(cache.get<() => string>("fn")!()).toBe("compiled template");
    });
  });

  describe("has", () => {
    it("should return true for existing keys", () => {
      cache.set("key", "value");
      expect(cache.has("key")).toBe(true);
    });

    it("should return false for non-existent keys", () => {
      expect(cache.has("nonexistent")).toBe(false);
    });
  });

  describe("delete", () => {
    it("should remove existing keys", () => {
      cache.set("key", "value");
      expect(cache.delete("key")).toBe(true);
      expect(cache.has("key")).toBe(false);
    });

    it("should return false for non-existent keys", () => {
      expect(cache.delete("nonexistent")).toBe(false);
    });
  });

  describe("clear", () => {
    it("should remove all entries", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.clear();

      expect(cache.size).toBe(0);
      expect(cache.has("key1")).toBe(false);
      expect(cache.has("key2")).toBe(false);
    });
  });

  describe("size", () => {
    it("should return number of entries", () => {
      expect(cache.size).toBe(0);

      cache.set("key1", "value1");
      expect(cache.size).toBe(1);

      cache.set("key2", "value2");
      expect(cache.size).toBe(2);
    });
  });

  describe("disabled cache", () => {
    it("should not store values when disabled", () => {
      const disabledCache = new CacheManager({ enabled: false });
      disabledCache.set("key", "value");

      expect(disabledCache.get("key")).toBeUndefined();
      expect(disabledCache.has("key")).toBe(false);
    });
  });

  describe("TTL expiration", () => {
    it("should expire entries after TTL", () => {
      const shortTTLCache = new CacheManager({ enabled: true, ttl: 0.001 }); // 1ms TTL
      shortTTLCache.set("key", "value");

      // Wait for expiration
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(shortTTLCache.get("key")).toBeUndefined();
          resolve();
        }, 10);
      });
    });
  });

  describe("getStats", () => {
    it("should return cache statistics", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");

      // Access key1 to increase hits
      cache.get("key1");
      cache.get("key1");

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(100);
      expect(stats.enabled).toBe(true);
    });
  });

  describe("cleanup", () => {
    it("should remove expired entries", async () => {
      const shortTTLCache = new CacheManager({ enabled: true, ttl: 0.001 });
      shortTTLCache.set("key1", "value1");
      shortTTLCache.set("key2", "value2");

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 10));

      const removed = shortTTLCache.cleanup();
      expect(removed).toBe(2);
      expect(shortTTLCache.size).toBe(0);
    });
  });

  describe("LRU eviction", () => {
    it("should evict least recently used when at capacity", () => {
      const smallCache = new CacheManager({ enabled: true, maxSize: 2 });

      smallCache.set("key1", "value1");
      smallCache.set("key2", "value2");

      // Access key1 to make it more recently used
      smallCache.get("key1");

      // Add key3, should evict key2 (least hits)
      smallCache.set("key3", "value3");

      expect(smallCache.size).toBe(2);
      expect(smallCache.has("key1")).toBe(true);
      expect(smallCache.has("key3")).toBe(true);
    });
  });

  describe("updateConfig", () => {
    it("should update configuration", () => {
      cache.updateConfig({ enabled: false });
      cache.set("key", "value");

      expect(cache.get("key")).toBeUndefined();
    });

    it("should update max size", () => {
      cache.updateConfig({ maxSize: 1 });
      cache.set("key1", "value1");
      cache.set("key2", "value2");

      expect(cache.size).toBe(1);
    });
  });
});
