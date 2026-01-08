/**
 * Template cache management
 * Stores templates locally for offline access and performance
 */

import fs from "fs";
import path from "path";
import os from "os";
import type { CacheEntry, CacheConfig } from "./types";

const DEFAULT_CACHE_DIR = path.join(os.homedir(), ".expressots", "cache", "templates");
const DEFAULT_TTL = 86400; // 24 hours in seconds

export class TemplateCache {
	private config: CacheConfig;

	constructor(config?: Partial<CacheConfig>) {
		this.config = {
			directory: config?.directory || DEFAULT_CACHE_DIR,
			ttl: config?.ttl || DEFAULT_TTL,
		};
		this.ensureCacheDir();
	}

	/**
	 * Ensure cache directory exists
	 */
	private ensureCacheDir(): void {
		if (!fs.existsSync(this.config.directory)) {
			fs.mkdirSync(this.config.directory, { recursive: true });
		}
	}

	/**
	 * Generate cache key from template identifier
	 */
	private getCacheKey(category: string, platform: string, variant?: string): string {
		const parts = [category, platform];
		if (variant) parts.push(variant);
		return parts.join("-") + ".cache.json";
	}

	/**
	 * Get cache file path
	 */
	private getCachePath(key: string): string {
		return path.join(this.config.directory, key);
	}

	/**
	 * Check if cache entry is valid (not expired)
	 */
	private isValid<T>(entry: CacheEntry<T>): boolean {
		const now = Date.now();
		const expiresAt = entry.timestamp + (entry.ttl * 1000);
		return now < expiresAt;
	}

	/**
	 * Get cached template content
	 */
	get<T>(category: string, platform: string, variant?: string): T | null {
		const key = this.getCacheKey(category, platform, variant);
		const cachePath = this.getCachePath(key);

		try {
			if (!fs.existsSync(cachePath)) {
				return null;
			}

			const content = fs.readFileSync(cachePath, "utf-8");
			const entry: CacheEntry<T> = JSON.parse(content);

			if (!this.isValid(entry)) {
				// Cache expired, remove it
				this.delete(category, platform, variant);
				return null;
			}

			return entry.data;
		} catch {
			return null;
		}
	}

	/**
	 * Set cached template content
	 */
	set<T>(category: string, platform: string, data: T, variant?: string, ttl?: number): void {
		const key = this.getCacheKey(category, platform, variant);
		const cachePath = this.getCachePath(key);

		const entry: CacheEntry<T> = {
			data,
			timestamp: Date.now(),
			ttl: ttl || this.config.ttl,
		};

		try {
			fs.writeFileSync(cachePath, JSON.stringify(entry, null, 2), "utf-8");
		} catch (error) {
			// Silently fail - cache is optional
			console.error("Failed to write cache:", error);
		}
	}

	/**
	 * Delete cached template
	 */
	delete(category: string, platform: string, variant?: string): void {
		const key = this.getCacheKey(category, platform, variant);
		const cachePath = this.getCachePath(key);

		try {
			if (fs.existsSync(cachePath)) {
				fs.unlinkSync(cachePath);
			}
		} catch {
			// Ignore deletion errors
		}
	}

	/**
	 * Clear all cached templates
	 */
	clear(): void {
		try {
			const files = fs.readdirSync(this.config.directory);
			for (const file of files) {
				if (file.endsWith(".cache.json")) {
					fs.unlinkSync(path.join(this.config.directory, file));
				}
			}
		} catch {
			// Ignore errors
		}
	}

	/**
	 * Get cache statistics
	 */
	getStats(): { files: number; totalSize: number; oldestEntry: Date | null } {
		let files = 0;
		let totalSize = 0;
		let oldestTimestamp = Infinity;

		try {
			const entries = fs.readdirSync(this.config.directory);
			for (const file of entries) {
				if (!file.endsWith(".cache.json")) continue;

				const filePath = path.join(this.config.directory, file);
				const stat = fs.statSync(filePath);
				files++;
				totalSize += stat.size;

				try {
					const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
					if (content.timestamp < oldestTimestamp) {
						oldestTimestamp = content.timestamp;
					}
				} catch {
					// Skip invalid cache files
				}
			}
		} catch {
			// Directory doesn't exist or can't be read
		}

		return {
			files,
			totalSize,
			oldestEntry: oldestTimestamp === Infinity ? null : new Date(oldestTimestamp),
		};
	}

	/**
	 * Get cache directory path
	 */
	getCacheDirectory(): string {
		return this.config.directory;
	}
}

// Singleton instance
let cacheInstance: TemplateCache | null = null;

export function getTemplateCache(config?: Partial<CacheConfig>): TemplateCache {
	if (!cacheInstance) {
		cacheInstance = new TemplateCache(config);
	}
	return cacheInstance;
}
