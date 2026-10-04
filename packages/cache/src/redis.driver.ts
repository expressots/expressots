import type { Redis } from "ioredis";
import type { CacheDriver } from "./driver.js";

/** Prefix is length-framed, so overlapping namespaces remain independent. */
export function namespacePrefix(namespace: string): string {
  return `expressots-cache:${Buffer.byteLength(namespace, "utf8")}:${namespace}:`;
}

export class RedisDriver implements CacheDriver {
  private constructor(
    private readonly client: Redis,
    private readonly prefix: string,
  ) {}

  static async connect(
    url: string,
    timeoutMs: number,
    namespace: string,
  ): Promise<RedisDriver> {
    let RedisConstructor: typeof Redis;
    try {
      // Kept inside connect; importing the package or selecting memory never loads ioredis.
      const module = await import("ioredis");
      RedisConstructor = module.Redis;
    } catch {
      throw new Error(
        "Redis cache requires optional peer ioredis. Install it with: npm install ioredis@^5.6.1",
      );
    }
    let client: Redis;
    try {
      client = new RedisConstructor(url, {
        lazyConnect: true,
        connectTimeout: timeoutMs,
        commandTimeout: timeoutMs,
        maxRetriesPerRequest: 0,
        retryStrategy: () => null,
        enableOfflineQueue: false,
        reconnectOnError: () => false,
      });
    } catch {
      throw new Error(
        "Redis cache initialization failed. Check connectivity and Redis configuration.",
      );
    }
    // ioredis error events may contain connection credentials; never forward them.
    client.on("error", () => {});
    const driver = new RedisDriver(client, namespacePrefix(namespace));
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        client.connect(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("Connection timed out")),
            timeoutMs,
          );
        }),
      ]);
      if (!(await driver.connected())) throw new Error("Not connected");
      return driver;
    } catch {
      client.disconnect();
      throw new Error(
        "Redis cache initialization failed. Check connectivity and Redis configuration.",
      );
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async command<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch {
      throw new Error(
        "Redis cache operation failed. Check connectivity and Redis configuration.",
      );
    }
  }

  async get(key: string): Promise<string | undefined> {
    return this.command(
      async () => (await this.client.get(this.prefix + key)) ?? undefined,
    );
  }
  async set(key: string, value: string, ttl: number): Promise<void> {
    await this.command(async () => {
      if (ttl > 0) await this.client.set(this.prefix + key, value, "PX", ttl);
      else await this.client.set(this.prefix + key, value);
    });
  }
  async del(key: string): Promise<boolean> {
    return this.command(
      async () => (await this.client.del(this.prefix + key)) > 0,
    );
  }
  async has(key: string): Promise<boolean> {
    return this.command(
      async () => (await this.client.exists(this.prefix + key)) > 0,
    );
  }
  async clear(): Promise<void> {
    const pattern = this.prefix.replace(/[\\*?[\]]/g, "\\$&") + "*";
    await this.command(async () => {
      let cursor = "0";
      do {
        const page = await this.client.scan(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          100,
        );
        cursor = page[0];
        // COUNT is a hint; independently bound each deletion command.
        const keys = page[1].filter((key) => key.startsWith(this.prefix));
        for (let offset = 0; offset < keys.length; offset += 100) {
          await this.client.del(...keys.slice(offset, offset + 100));
        }
      } while (cursor !== "0");
    });
  }
  async connected(): Promise<boolean> {
    if (this.client.status !== "ready") return false;
    try {
      return (await this.client.ping()) === "PONG";
    } catch {
      return false;
    }
  }
  async shutdown(): Promise<void> {
    // disconnect is immediate and cannot hang on a stalled QUIT response.
    this.client.disconnect();
  }
}
