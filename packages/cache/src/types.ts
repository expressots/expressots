/** Values are JSON data, copied on both write and read. */
export type CacheValue =
  | null
  | boolean
  | number
  | string
  | CacheValue[]
  | { [key: string]: CacheValue };

export interface CacheConfig {
  driver?: "memory" | "redis";
  namespace?: string;
  /** Milliseconds; zero disables expiry. Default: zero. */
  defaultTtl?: number;
  /** Maximum memory entries. Default: 1000. */
  capacity?: number;
  redis?: {
    url?: string;
    /** Bounds connection and command duration. Default: 2000 ms. */
    timeoutMs?: number;
  };
}

export interface ResolvedCacheConfig {
  driver: "memory" | "redis";
  namespace: string;
  defaultTtl: number;
  capacity: number;
  redis: { url: string; timeoutMs: number };
}
