/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CacheConfig } from "../render-config.js";

/**
 * Cache Entry
 *
 * @description Represents a cached item with metadata.
 */
interface CacheEntry<T> {
  /** Cached value */
  value: T;
  /** Timestamp when cached */
  cachedAt: number;
  /** Time-to-live in milliseconds */
  ttl: number;
  /** Number of times accessed */
  hits: number;
}

/**
 * Cache Manager
 *
 * @description Manages view caching with configurable strategies.
 * Supports memory caching with TTL and LRU eviction.
 *
 * @public API
 */
export class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;
  private maxSize: number;

  constructor(config?: CacheConfig) {
    this.config = config || { enabled: true };
    this.maxSize = config?.maxSize || 1000;
  }

  /**
   * Get a cached value.
   *
   * @param key - Cache key
   * @returns Cached value or undefined if not found/expired
   */
  get<T>(key: string): T | undefined {
    if (!this.config.enabled) {
      return undefined;
    }

    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return undefined;
    }

    // Update hits
    entry.hits++;

    return entry.value as T;
  }

  /**
   * Set a cached value.
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time-to-live in seconds (optional, uses config default)
   */
  set<T>(key: string, value: T, ttl?: number): void {
    if (!this.config.enabled) {
      return;
    }

    // Evict if at max size
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const ttlMs = (ttl || this.config.ttl || 3600) * 1000;

    this.cache.set(key, {
      value,
      cachedAt: Date.now(),
      ttl: ttlMs,
      hits: 0,
    });
  }

  /**
   * Check if a key exists in cache (and is not expired).
   *
   * @param key - Cache key
   * @returns Whether the key exists and is valid
   */
  has(key: string): boolean {
    if (!this.config.enabled) {
      return false;
    }

    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a cached value.
   *
   * @param key - Cache key
   * @returns Whether the key was deleted
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cached values.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the number of cached items.
   *
   * @returns Cache size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics.
   *
   * @returns Cache statistics
   */
  getStats(): CacheStats {
    let totalHits = 0;
    let expiredCount = 0;

    for (const [, entry] of this.cache.entries()) {
      totalHits += entry.hits;
      if (this.isExpired(entry)) {
        expiredCount++;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      totalHits,
      expiredCount,
      enabled: this.config.enabled,
    };
  }

  /**
   * Remove expired entries.
   *
   * @returns Number of entries removed
   */
  cleanup(): number {
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Update the cache configuration.
   *
   * @param config - New configuration
   */
  updateConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.maxSize !== undefined) {
      this.maxSize = config.maxSize;
    }
  }

  /**
   * Check if an entry is expired.
   *
   * @param entry - Cache entry
   * @returns Whether the entry is expired
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    if (entry.ttl <= 0) {
      return false; // No expiration
    }
    return Date.now() - entry.cachedAt > entry.ttl;
  }

  /**
   * Evict the least recently used entry.
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruHits = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < lruHits) {
        lruHits = entry.hits;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }
}

/**
 * Cache statistics.
 * @public API
 */
export interface CacheStats {
  /** Current cache size */
  size: number;
  /** Maximum cache size */
  maxSize: number;
  /** Total cache hits */
  totalHits: number;
  /** Number of expired entries */
  expiredCount: number;
  /** Whether caching is enabled */
  enabled: boolean;
}

/** Singleton instance */
let cacheInstance: CacheManager | null = null;

/**
 * Get the cache manager singleton.
 *
 * @param config - Optional configuration
 * @returns Cache manager instance
 */
export function getCacheManager(config?: CacheConfig): CacheManager {
  if (!cacheInstance) {
    cacheInstance = new CacheManager(config);
  }
  return cacheInstance;
}
