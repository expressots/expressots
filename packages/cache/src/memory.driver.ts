import type { CacheDriver } from "./driver.js";

interface Entry {
  value: string;
  expiresAt: number;
}

/** Lazy expiry; has() does not change recency. No timers or runtime dependencies. */
export class MemoryDriver implements CacheDriver {
  private readonly entries = new Map<string, Entry>();
  private ready = true;

  constructor(
    private readonly capacity: number,
    private readonly now: () => number = Date.now,
  ) {}

  private entry(key: string): Entry | undefined {
    const entry = this.entries.get(key);
    if (entry && entry.expiresAt !== 0 && entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry;
  }

  async get(key: string): Promise<string | undefined> {
    const entry = this.entry(key);
    if (!entry) return undefined;
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  async set(key: string, value: string, ttl: number): Promise<void> {
    this.entries.delete(key);
    if (this.entries.size >= this.capacity) {
      // Only sweep at capacity so expired entries never displace live entries.
      for (const existing of this.entries.keys()) this.entry(existing);
      if (this.entries.size >= this.capacity) {
        this.entries.delete(this.entries.keys().next().value as string);
      }
    }
    this.entries.set(key, {
      value,
      expiresAt: ttl === 0 ? 0 : this.now() + ttl,
    });
  }

  async del(key: string): Promise<boolean> {
    return this.entry(key) !== undefined && this.entries.delete(key);
  }
  async has(key: string): Promise<boolean> {
    return this.entry(key) !== undefined;
  }
  async clear(): Promise<void> {
    this.entries.clear();
  }
  async connected(): Promise<boolean> {
    return this.ready;
  }
  async shutdown(): Promise<void> {
    this.ready = false;
    this.entries.clear();
  }
}
