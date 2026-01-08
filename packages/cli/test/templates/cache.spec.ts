/**
 * Template Cache Tests
 */

import fs from "fs";
import path from "path";
import os from "os";
import { TemplateCache } from "../../src/templates/cache";

describe("TemplateCache", () => {
	let cache: TemplateCache;
	const testCacheDir = path.join(os.tmpdir(), "expressots-test-cache");

	beforeEach(() => {
		// Use temp directory for testing
		cache = new TemplateCache({ directory: testCacheDir, ttl: 3600 });
	});

	afterEach(() => {
		// Clean up test cache
		try {
			if (fs.existsSync(testCacheDir)) {
				const files = fs.readdirSync(testCacheDir);
				for (const file of files) {
					fs.unlinkSync(path.join(testCacheDir, file));
				}
				fs.rmdirSync(testCacheDir);
			}
		} catch {
			// Ignore cleanup errors
		}
	});

	describe("Basic Operations", () => {
		it("should store and retrieve data", () => {
			const data = { content: "test template" };
			cache.set("cicd", "github", data, "basic");
			
			const retrieved = cache.get<typeof data>("cicd", "github", "basic");
			expect(retrieved).toEqual(data);
		});

		it("should return null for non-existent keys", () => {
			const result = cache.get("nonexistent", "key");
			expect(result).toBeNull();
		});

		it("should delete cached items", () => {
			cache.set("cicd", "github", { data: "test" }, "basic");
			cache.delete("cicd", "github", "basic");
			
			const result = cache.get("cicd", "github", "basic");
			expect(result).toBeNull();
		});

		it("should clear all cached items", () => {
			cache.set("cicd", "github", { data: "test1" }, "basic");
			cache.set("docker", "production", { data: "test2" });
			
			cache.clear();
			
			expect(cache.get("cicd", "github", "basic")).toBeNull();
			expect(cache.get("docker", "production")).toBeNull();
		});
	});

	describe("TTL Management", () => {
		it("should return cache stats", () => {
			cache.set("test", "data", { content: "test" });
			
			const stats = cache.getStats();
			expect(stats.files).toBeGreaterThanOrEqual(1);
			expect(stats.totalSize).toBeGreaterThan(0);
		});

		it("should return cache directory path", () => {
			const dir = cache.getCacheDirectory();
			expect(dir).toBe(testCacheDir);
		});
	});
});
