/**
 * Pricing types and interfaces
 */

export type CloudProvider = "aws" | "gcp" | "azure" | "railway" | "render" | "fly" | "digitalocean" | "heroku";

export type PricingModel = "per-hour" | "per-month" | "usage";

export interface ProviderPricing {
	serviceName: string;
	model: PricingModel;
	basePrice: number;
	cpuPerHour: number;
	memoryPerGbHour: number;
	storagePerGb: number;
	bandwidthPerGb: number;
	freeBandwidth: number;
	freeCredits?: number;
	notes?: string;
	source?: string;
	lastVerified?: string;
}

export interface PricingData {
	version: string;
	updated: string;
	providers: Record<CloudProvider, ProviderPricing>;
}

export interface PricingSource {
	name: string;
	fetch(): Promise<PricingData | null>;
}

export interface ResourceEstimate {
	instances: number;
	cpu: number;
	memory: number;
	storage: number;
	bandwidth: number;
	hours: number;
}

export interface CostEstimate {
	provider: CloudProvider;
	monthlyCost: number;
	breakdown: {
		compute: number;
		storage: number;
		bandwidth: number;
		base: number;
	};
	currency: string;
	notes?: string;
}

export interface PricingCacheEntry {
	data: PricingData;
	timestamp: number;
	source: string;
}
