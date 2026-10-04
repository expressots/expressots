import {
  provideSingleton,
  type IProvider,
  type IHealthCheck,
  type IMetrics,
  type IConfigurable,
  type IBootstrap,
  type IShutdown,
  type ConfigurationResult,
  type HealthCheckResult,
  type ProviderMetrics,
} from "@expressots/core";
import type { CacheConfig, CacheValue, ResolvedCacheConfig } from "./types.js";
import type { CacheDriver } from "./driver.js";
import { MemoryDriver } from "./memory.driver.js";
import { RedisDriver } from "./redis.driver.js";

function ttlMilliseconds(ttl: number): number {
  if (!Number.isSafeInteger(ttl) || ttl < 0) {
    throw new TypeError(
      "Cache TTL must be a non-negative safe integer in milliseconds",
    );
  }
  return ttl;
}

/** Reject values JSON would silently transform or omit. */
function serialize(value: CacheValue): string {
  const ancestors = new Set<object>();
  function validate(item: unknown): void {
    if (item === null || typeof item === "string" || typeof item === "boolean")
      return;
    if (
      typeof item === "number" &&
      Number.isFinite(item) &&
      !Object.is(item, -0)
    )
      return;
    if (typeof item !== "object" || item === null || ancestors.has(item)) {
      throw new TypeError(
        "Cache values must be acyclic JSON data (no undefined, non-finite numbers or negative zero)",
      );
    }
    const array = Array.isArray(item);
    if (
      !array &&
      Object.getPrototypeOf(item) !== Object.prototype &&
      Object.getPrototypeOf(item) !== null
    ) {
      throw new TypeError("Cache objects must be plain JSON objects");
    }
    ancestors.add(item);
    const keys = Reflect.ownKeys(item).filter(
      (key) => !(array && key === "length"),
    );
    if (array && keys.length !== item.length)
      throw new TypeError(
        "Cache arrays must be dense without extra properties",
      );
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(item, key);
      if (!descriptor)
        throw new TypeError("Cache values must have stable own properties");
      if (
        typeof key !== "string" ||
        !descriptor.enumerable ||
        !("value" in descriptor) ||
        (array && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= item.length))
      ) {
        throw new TypeError(
          "Cache values cannot contain symbols, accessors or hidden properties",
        );
      }
      validate(descriptor.value);
    }
    ancestors.delete(item);
  }
  validate(value);
  return JSON.stringify(value);
}

function resolveConfig(config: CacheConfig): ResolvedCacheConfig {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new TypeError("Cache configuration must be an object");
  }
  if (
    [
      config.driver,
      config.namespace,
      config.defaultTtl,
      config.capacity,
      config.redis,
    ].some((value) => value === null)
  ) {
    throw new TypeError("Cache configuration fields cannot be null");
  }
  if (
    config.redis !== undefined &&
    (typeof config.redis !== "object" ||
      Array.isArray(config.redis) ||
      config.redis.url === null ||
      config.redis.timeoutMs === null)
  ) {
    throw new TypeError(
      "Redis configuration must be an object with non-null fields",
    );
  }
  const driver = config.driver ?? process.env.CACHE_DRIVER ?? "memory";
  const namespace =
    config.namespace ?? process.env.CACHE_NAMESPACE ?? "default";
  const defaultTtl =
    config.defaultTtl ?? Number(process.env.CACHE_DEFAULT_TTL_MS ?? 0);
  const capacity =
    config.capacity ?? Number(process.env.CACHE_CAPACITY ?? 1000);
  const timeoutMs =
    config.redis?.timeoutMs ??
    Number(process.env.CACHE_REDIS_TIMEOUT_MS ?? 2000);
  const url =
    config.redis?.url ?? process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
  if (driver !== "memory" && driver !== "redis")
    throw new TypeError("Cache driver must be memory or redis");
  if (
    typeof namespace !== "string" ||
    namespace.length === 0 ||
    Buffer.byteLength(namespace) > 1024 ||
    /[\ud800-\udfff]/u.test(
      namespace.replace(/[\ud800-\udbff][\udc00-\udfff]/g, ""),
    )
  ) {
    throw new TypeError(
      "Cache namespace must be a non-empty valid Unicode string of at most 1024 UTF-8 bytes",
    );
  }
  ttlMilliseconds(defaultTtl);
  if (!Number.isSafeInteger(capacity) || capacity <= 0)
    throw new TypeError("Cache capacity must be a positive safe integer");
  if (
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs <= 0 ||
    timeoutMs > 2147483647
  )
    throw new TypeError(
      "Redis timeout must be a positive integer of at most 2147483647 milliseconds",
    );
  try {
    const parsed = new URL(url);
    if (!["redis:", "rediss:"].includes(parsed.protocol)) throw new Error();
  } catch {
    throw new TypeError("Redis URL must use redis:// or rediss://");
  }
  return { driver, namespace, defaultTtl, capacity, redis: { url, timeoutMs } };
}

@provideSingleton(CacheProvider, "external")
export class CacheProvider
  implements
    IProvider,
    IHealthCheck,
    IMetrics,
    IConfigurable<CacheConfig>,
    IBootstrap,
    IShutdown
{
  readonly name = "CacheProvider";
  readonly version = "4.3.0";
  readonly description = "Bounded memory or Redis cache";
  readonly author = "ExpressoTS Team";
  readonly repo = "https://github.com/expressots/expressots";
  private config?: ResolvedCacheConfig;
  private driver?: CacheDriver;
  private state: "new" | "starting" | "ready" | "stopped" = "new";
  private initialization?: Promise<void>;
  private hits = 0;
  private misses = 0;
  private errors = 0;

  get mode(): "memory" | "redis" {
    return this.config?.driver ?? "memory";
  }

  configure(config: CacheConfig): ConfigurationResult {
    if (this.state !== "new")
      return {
        valid: false,
        errors: ["Cache configuration is locked after initialization starts"],
      };
    try {
      this.config = resolveConfig(config);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        errors: [
          error instanceof Error
            ? error.message
            : "Invalid cache configuration",
        ],
      };
    }
  }

  async bootstrap(): Promise<void> {
    if (this.state === "ready") return;
    if (this.state === "starting") return this.initialization;
    if (this.state === "stopped")
      throw new Error("Cache provider has been shut down");
    this.config ??= resolveConfig({});
    this.state = "starting";
    this.initialization = this.initialize(this.config);
    return this.initialization;
  }

  private async initialize(config: ResolvedCacheConfig): Promise<void> {
    try {
      this.driver =
        config.driver === "memory"
          ? new MemoryDriver(config.capacity)
          : await RedisDriver.connect(
              config.redis.url,
              config.redis.timeoutMs,
              config.namespace,
            );
      if (this.state !== "stopped") this.state = "ready";
    } catch (error) {
      if (this.state !== "stopped") this.state = "new";
      throw error;
    }
  }

  private storage(): CacheDriver {
    if (this.state !== "ready" || !this.driver)
      throw new Error(
        "Cache provider is not ready; call bootstrap() before use",
      );
    return this.driver;
  }
  private key(key: string): string {
    if (typeof key !== "string")
      throw new TypeError("Cache keys must be strings");
    // Encode keys too: Redis UTF-8 replacement must not merge malformed strings.
    return JSON.stringify(key);
  }

  async get<T extends CacheValue = CacheValue>(
    key: string,
  ): Promise<T | undefined> {
    const driver = this.storage();
    const encoded = this.key(key);
    try {
      const value = await driver.get(encoded);
      if (value === undefined) {
        this.misses++;
        return undefined;
      }
      const result = JSON.parse(value) as T;
      // Validate external Redis writes too; corrupted values are errors, not misses.
      serialize(result);
      this.hits++;
      return result;
    } catch {
      this.errors++;
      throw new Error(
        "Cache read failed: backend unavailable or invalid serialized JSON data",
      );
    }
  }
  async set(key: string, value: CacheValue, ttl?: number): Promise<void> {
    const driver = this.storage();
    await driver.set(
      this.key(key),
      serialize(value),
      ttlMilliseconds(ttl === undefined ? (this.config?.defaultTtl ?? 0) : ttl),
    );
  }
  async del(key: string): Promise<boolean> {
    return this.storage().del(this.key(key));
  }
  async has(key: string): Promise<boolean> {
    return this.storage().has(this.key(key));
  }
  async clear(): Promise<void> {
    await this.storage().clear();
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    const connected =
      this.state === "ready" &&
      !!this.driver &&
      (await this.driver.connected());
    return {
      status: connected ? "healthy" : "unhealthy",
      latency: Date.now() - start,
      checkedAt: Date.now(),
      details: { driver: this.mode, connected, state: this.state },
    };
  }
  getMetrics(): ProviderMetrics {
    const requests = this.hits + this.misses;
    return {
      driver: this.mode,
      hits: this.hits,
      misses: this.misses,
      errors: this.errors,
      hitRatio: requests === 0 ? 0 : this.hits / requests,
    };
  }
  async shutdown(): Promise<void> {
    const initialization =
      this.state === "starting" ? this.initialization : undefined;
    this.state = "stopped";
    if (initialization) {
      try {
        await initialization;
      } catch {
        /* Failed initialization already disconnected. */
      }
    }
    const driver = this.driver;
    this.driver = undefined;
    await driver?.shutdown();
  }
}
