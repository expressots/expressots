/**
 * Pricing Manager - orchestrates pricing fetching with cascading fallback
 * Priority: API -> Remote JSON -> Local JSON -> Error
 */

import fs from "fs";
import path from "path";
import os from "os";
import chalk from "chalk";
import type {
	PricingData,
	PricingSource,
	CloudProvider,
	ProviderPricing,
	ResourceEstimate,
	CostEstimate,
	PricingCacheEntry,
} from "./types";
import { createAPIPricingSource } from "./sources/api-source";
import { createRemoteJSONPricingSource } from "./sources/remote-json-source";
import { createLocalJSONPricingSource } from "./sources/local-json-source";
import { getConfigManager } from "../config";

const CACHE_DIR = path.join(os.homedir(), ".expressots", "cache");
const CACHE_FILE = path.join(CACHE_DIR, "pricing.json");
const DEFAULT_TTL = 21600; // 6 hours in seconds

export interface PricingManagerConfig {
	sources?: ("api" | "remote" | "local")[];
	cacheTTL?: number;
	customLocalFile?: string;
}

export class PricingManager {
	private sources: PricingSource[] = [];
	private cacheTTL: number;
	private cachedData: PricingCacheEntry | null = null;
	private lastSource: string | null = null;

	constructor(config?: PricingManagerConfig) {
		const globalConfig = getConfigManager().getPricingConfig();
		const sourcesToUse = config?.sources || globalConfig.sources;
		this.cacheTTL =
			config?.cacheTTL || globalConfig.cacheTTL || DEFAULT_TTL;

		// Initialize sources based on configuration
		for (const source of sourcesToUse) {
			switch (source) {
				case "api":
					this.sources.push(createAPIPricingSource());
					break;
				case "remote":
					this.sources.push(createRemoteJSONPricingSource());
					break;
				case "local":
					this.sources.push(
						createLocalJSONPricingSource(
							config?.customLocalFile ||
								globalConfig.customFile ||
								undefined,
						),
					);
					break;
			}
		}
	}

	/**
	 * Ensure cache directory exists
	 */
	private ensureCacheDir(): void {
		if (!fs.existsSync(CACHE_DIR)) {
			fs.mkdirSync(CACHE_DIR, { recursive: true });
		}
	}

	/**
	 * Load cached pricing data
	 */
	private loadCache(): PricingCacheEntry | null {
		try {
			if (!fs.existsSync(CACHE_FILE)) {
				return null;
			}

			const content = fs.readFileSync(CACHE_FILE, "utf-8");
			const entry: PricingCacheEntry = JSON.parse(content);

			// Check if cache is still valid
			const now = Date.now();
			const expiresAt = entry.timestamp + this.cacheTTL * 1000;

			if (now < expiresAt) {
				return entry;
			}

			return null; // Cache expired
		} catch {
			return null;
		}
	}

	/**
	 * Save pricing data to cache
	 */
	private saveCache(data: PricingData, source: string): void {
		this.ensureCacheDir();

		const entry: PricingCacheEntry = {
			data,
			timestamp: Date.now(),
			source,
		};

		try {
			fs.writeFileSync(
				CACHE_FILE,
				JSON.stringify(entry, null, 2),
				"utf-8",
			);
		} catch {
			// Silently fail - cache is optional
		}
	}

	/**
	 * Fetch pricing data from sources with cascading fallback
	 */
	async fetchPricing(
		forceRefresh: boolean = false,
	): Promise<PricingData | null> {
		// Check memory cache first
		if (!forceRefresh && this.cachedData) {
			const now = Date.now();
			const expiresAt = this.cachedData.timestamp + this.cacheTTL * 1000;
			if (now < expiresAt) {
				this.lastSource = this.cachedData.source + " (memory)";
				return this.cachedData.data;
			}
		}

		// Check disk cache
		if (!forceRefresh) {
			const diskCache = this.loadCache();
			if (diskCache) {
				this.cachedData = diskCache;
				this.lastSource = diskCache.source + " (disk cache)";
				return diskCache.data;
			}
		}

		// Try each source in order
		for (const source of this.sources) {
			try {
				const data = await source.fetch();
				if (data && this.validatePricing(data)) {
					this.lastSource = source.name;
					this.cachedData = {
						data,
						timestamp: Date.now(),
						source: source.name,
					};
					this.saveCache(data, source.name);
					return data;
				}
			} catch {
				// Continue to next source
			}
		}

		this.lastSource = null;
		return null;
	}

	/**
	 * Validate pricing data structure
	 */
	validatePricing(data: PricingData): boolean {
		if (!data.version || !data.providers) {
			return false;
		}

		// Check that at least one provider exists
		if (Object.keys(data.providers).length === 0) {
			return false;
		}

		// Validate each provider has required fields
		for (const provider of Object.values(data.providers)) {
			if (
				typeof provider.serviceName !== "string" ||
				typeof provider.model !== "string" ||
				typeof provider.cpuPerHour !== "number" ||
				typeof provider.memoryPerGbHour !== "number"
			) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Get pricing for a specific provider
	 */
	async getProviderPricing(
		provider: CloudProvider,
	): Promise<ProviderPricing | null> {
		const pricing = await this.fetchPricing();
		if (!pricing) {
			return null;
		}

		return pricing.providers[provider] || null;
	}

	/**
	 * Get all provider pricing
	 */
	async getAllPricing(): Promise<Record<
		CloudProvider,
		ProviderPricing
	> | null> {
		const pricing = await this.fetchPricing();
		if (!pricing) {
			return null;
		}

		return pricing.providers;
	}

	/**
	 * Calculate monthly cost for a provider
	 */
	async calculateMonthlyCost(
		provider: CloudProvider,
		resources: ResourceEstimate,
	): Promise<CostEstimate | null> {
		const pricing = await this.getProviderPricing(provider);
		if (!pricing) {
			return null;
		}

		const hoursRatio = resources.hours / 720;
		let computeCost = 0;
		let baseCost = 0;

		switch (pricing.model) {
			case "per-hour":
				computeCost =
					resources.instances *
					(resources.cpu * pricing.cpuPerHour * resources.hours +
						resources.memory *
							pricing.memoryPerGbHour *
							resources.hours);
				break;
			case "per-month":
				baseCost = resources.instances * pricing.basePrice * hoursRatio;
				break;
			case "usage":
				baseCost = pricing.basePrice;
				computeCost =
					resources.instances *
					(resources.cpu * pricing.cpuPerHour * resources.hours +
						resources.memory *
							pricing.memoryPerGbHour *
							resources.hours);
				break;
		}

		// Storage cost
		const storageCost = resources.storage * pricing.storagePerGb;

		// Bandwidth cost (above free tier)
		const billableBandwidth = Math.max(
			0,
			resources.bandwidth - pricing.freeBandwidth,
		);
		const bandwidthCost = billableBandwidth * pricing.bandwidthPerGb;

		const totalCost = computeCost + storageCost + bandwidthCost + baseCost;

		return {
			provider,
			monthlyCost: Math.round(totalCost * 100) / 100,
			breakdown: {
				compute: Math.round(computeCost * 100) / 100,
				storage: Math.round(storageCost * 100) / 100,
				bandwidth: Math.round(bandwidthCost * 100) / 100,
				base: Math.round(baseCost * 100) / 100,
			},
			currency: "USD",
			notes: pricing.notes,
		};
	}

	/**
	 * Compare costs across all providers
	 */
	async compareCosts(resources: ResourceEstimate): Promise<CostEstimate[]> {
		const pricing = await this.fetchPricing();
		if (!pricing) {
			return [];
		}

		const estimates: CostEstimate[] = [];

		for (const provider of Object.keys(
			pricing.providers,
		) as CloudProvider[]) {
			const estimate = await this.calculateMonthlyCost(
				provider,
				resources,
			);
			if (estimate) {
				estimates.push(estimate);
			}
		}

		// Sort by cost (ascending)
		return estimates.sort((a, b) => a.monthlyCost - b.monthlyCost);
	}

	/**
	 * Update cached pricing
	 */
	async updateCache(): Promise<boolean> {
		const data = await this.fetchPricing(true);
		return data !== null;
	}

	/**
	 * Clear pricing cache
	 */
	clearCache(): void {
		this.cachedData = null;
		try {
			if (fs.existsSync(CACHE_FILE)) {
				fs.unlinkSync(CACHE_FILE);
			}
		} catch {
			// Ignore errors
		}
	}

	/**
	 * Get the source of the last fetch
	 */
	getLastSource(): string | null {
		return this.lastSource;
	}

	/**
	 * Get pricing info (version, last updated, source)
	 */
	async getInfo(): Promise<{
		version: string;
		updated: string;
		source: string | null;
		cacheAge: number | null;
	} | null> {
		const pricing = await this.fetchPricing();
		if (!pricing) {
			return null;
		}

		let cacheAge: number | null = null;
		if (this.cachedData) {
			cacheAge = Math.floor(
				(Date.now() - this.cachedData.timestamp) / 1000,
			);
		}

		return {
			version: pricing.version,
			updated: pricing.updated,
			source: this.lastSource,
			cacheAge,
		};
	}

	/**
	 * Print pricing status (for CLI output)
	 */
	async printStatus(): Promise<void> {
		const info = await this.getInfo();

		console.log(chalk.bold("\nPricing System Status:\n"));

		if (info) {
			console.log(`  Version:     ${chalk.green(info.version)}`);
			console.log(`  Last Update: ${chalk.cyan(info.updated)}`);
			console.log(
				`  Source:      ${chalk.yellow(info.source || "Unknown")}`,
			);
			if (info.cacheAge !== null) {
				const hours = Math.floor(info.cacheAge / 3600);
				const minutes = Math.floor((info.cacheAge % 3600) / 60);
				console.log(`  Cache Age:   ${hours}h ${minutes}m`);
			}
		} else {
			console.log(chalk.red("  Unable to fetch pricing data"));
			console.log(
				chalk.gray("  Run 'expressots costs update' to refresh"),
			);
		}
	}

	/**
	 * Get list of available providers
	 */
	async getAvailableProviders(): Promise<CloudProvider[]> {
		const pricing = await this.fetchPricing();
		if (!pricing) {
			return [];
		}

		return Object.keys(pricing.providers) as CloudProvider[];
	}
}

// Singleton instance
let pricingManagerInstance: PricingManager | null = null;

export function getPricingManager(
	config?: PricingManagerConfig,
): PricingManager {
	if (!pricingManagerInstance) {
		pricingManagerInstance = new PricingManager(config);
	}
	return pricingManagerInstance;
}

export function resetPricingManager(): void {
	pricingManagerInstance = null;
}
