import type { CloudProvider } from "../cli";

export interface ProviderPricing {
	serviceName: string;
	model: "per-hour" | "per-month" | "usage";
	basePrice: number;
	cpuPerHour: number;
	memoryPerGbHour: number;
	storagePerGb: number;
	bandwidthPerGb: number;
	freeBandwidth: number;
	freeCredits?: number;
	notes?: string;
}

/**
 * Pricing data for various cloud providers
 * Note: These are approximate prices for estimation purposes.
 * Actual prices vary by region, instance type, and commitment.
 */
const PROVIDER_PRICING: Record<CloudProvider, ProviderPricing> = {
	aws: {
		serviceName: "ECS Fargate",
		model: "per-hour",
		basePrice: 0,
		cpuPerHour: 0.04048, // per vCPU-hour
		memoryPerGbHour: 0.004445, // per GB-hour
		storagePerGb: 0.1, // EBS gp3
		bandwidthPerGb: 0.09, // data transfer out
		freeBandwidth: 100, // 100GB free tier
		notes: "Prices for us-east-1 region",
	},

	gcp: {
		serviceName: "Cloud Run",
		model: "per-hour",
		basePrice: 0,
		cpuPerHour: 0.024, // per vCPU-hour
		memoryPerGbHour: 0.0025, // per GB-hour
		storagePerGb: 0.1,
		bandwidthPerGb: 0.12,
		freeBandwidth: 200, // 200GB free
		freeCredits: 300, // $300 free credits for new users
		notes: "Pay only for what you use, scales to zero",
	},

	azure: {
		serviceName: "Container Apps",
		model: "per-hour",
		basePrice: 0,
		cpuPerHour: 0.024,
		memoryPerGbHour: 0.003,
		storagePerGb: 0.1,
		bandwidthPerGb: 0.087,
		freeBandwidth: 100,
		freeCredits: 200,
		notes: "First 180,000 vCPU-seconds free per month",
	},

	railway: {
		serviceName: "Web Service",
		model: "usage",
		basePrice: 5, // Starter plan
		cpuPerHour: 0.000463, // per vCPU-second
		memoryPerGbHour: 0.000231, // per GB-second
		storagePerGb: 0.25,
		bandwidthPerGb: 0, // included
		freeBandwidth: 1000,
		freeCredits: 5, // $5 free tier
		notes: "Usage-based pricing, great DX",
	},

	render: {
		serviceName: "Web Service",
		model: "per-month",
		basePrice: 7, // Starter instance
		cpuPerHour: 0,
		memoryPerGbHour: 0,
		storagePerGb: 0.25,
		bandwidthPerGb: 0.1,
		freeBandwidth: 100,
		notes: "Simple pricing, auto-scaling available",
	},

	fly: {
		serviceName: "Machines",
		model: "per-hour",
		basePrice: 0,
		cpuPerHour: 0.0000158, // shared CPU per second
		memoryPerGbHour: 0.0000047, // per GB-second
		storagePerGb: 0.15,
		bandwidthPerGb: 0.02,
		freeBandwidth: 100,
		freeCredits: 0,
		notes: "Pay for resources while running, scales to zero",
	},

	digitalocean: {
		serviceName: "App Platform",
		model: "per-month",
		basePrice: 5, // Basic instance
		cpuPerHour: 0,
		memoryPerGbHour: 0,
		storagePerGb: 0.1,
		bandwidthPerGb: 0.01,
		freeBandwidth: 500,
		notes: "Simple pricing, good for small projects",
	},

	heroku: {
		serviceName: "Eco Dyno",
		model: "per-month",
		basePrice: 5, // Eco dyno
		cpuPerHour: 0,
		memoryPerGbHour: 0,
		storagePerGb: 0, // No persistent storage in free tier
		bandwidthPerGb: 0, // Included
		freeBandwidth: 2000,
		notes: "Basic: $7/mo, Standard: $25/mo, Performance: $250+/mo",
	},
};

/**
 * Get pricing for a specific provider
 */
export function getPricing(provider: CloudProvider): ProviderPricing {
	return PROVIDER_PRICING[provider] || PROVIDER_PRICING.aws;
}

/**
 * Get all provider pricing
 */
export function getAllPricing(): Record<CloudProvider, ProviderPricing> {
	return PROVIDER_PRICING;
}

/**
 * Calculate monthly cost for a provider
 */
export function calculateMonthlyCost(
	provider: CloudProvider,
	resources: {
		instances: number;
		cpu: number;
		memory: number;
		storage: number;
		bandwidth: number;
		hours: number;
	},
): number {
	const pricing = getPricing(provider);
	const hoursRatio = resources.hours / 720;

	let cost = 0;

	switch (pricing.model) {
		case "per-hour":
			cost =
				resources.instances *
				(resources.cpu * pricing.cpuPerHour * resources.hours +
					resources.memory *
						pricing.memoryPerGbHour *
						resources.hours);
			break;
		case "per-month":
			cost = resources.instances * pricing.basePrice * hoursRatio;
			break;
		case "usage":
			cost =
				pricing.basePrice +
				resources.instances *
					(resources.cpu * pricing.cpuPerHour * resources.hours +
						resources.memory *
							pricing.memoryPerGbHour *
							resources.hours);
			break;
	}

	// Add storage cost
	cost += resources.storage * pricing.storagePerGb;

	// Add bandwidth cost (above free tier)
	const billableBandwidth = Math.max(
		0,
		resources.bandwidth - pricing.freeBandwidth,
	);
	cost += billableBandwidth * pricing.bandwidthPerGb;

	return Math.round(cost * 100) / 100;
}
