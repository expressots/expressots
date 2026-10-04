/** Internal storage contract: serialized JSON with a millisecond TTL. */
export interface CacheDriver {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string, ttl: number): Promise<void>;
  del(key: string): Promise<boolean>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
  connected(): Promise<boolean>;
  shutdown(): Promise<void>;
}
