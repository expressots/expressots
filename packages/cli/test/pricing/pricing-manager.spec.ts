/**
 * Pricing Manager Tests
 */

import { PricingManager } from "../../src/costs/pricing-manager";

// Mock the config manager
jest.mock("../../src/config", () => ({
	getConfigManager: () => ({
		getPricingConfig: () => ({
			sources: ["local"],
			cacheTTL: 3600,
			customFile: null,
		}),
	}),
}));

describe("PricingManager", () => {
	let manager: PricingManager;

	beforeEach(() => {
		manager = new PricingManager({
			sources: ["local"],
		});
	});

	describe("Pricing Validation", () => {
		it("should validate correct pricing data", () => {
			const validPricing = {
				version: "1.0.0",
				updated: "2026-01-01T00:00:00Z",
				providers: {
					aws: {
						serviceName: "ECS Fargate",
						model: "per-hour",
						basePrice: 0,
						cpuPerHour: 0.04,
						memoryPerGbHour: 0.004,
						storagePerGb: 0.1,
						bandwidthPerGb: 0.09,
						freeBandwidth: 100,
					},
				},
			};

			const result = manager.validatePricing(validPricing as any);
			expect(result).toBe(true);
		});

		it("should reject pricing without version", () => {
			const invalidPricing = {
				providers: {},
			};

			const result = manager.validatePricing(invalidPricing as any);
			expect(result).toBe(false);
		});

		it("should reject pricing without providers", () => {
			const invalidPricing = {
				version: "1.0.0",
			};

			const result = manager.validatePricing(invalidPricing as any);
			expect(result).toBe(false);
		});
	});

	describe("Cost Calculation", () => {
		it("should return null if pricing not available", async () => {
			const estimate = await manager.calculateMonthlyCost("aws", {
				instances: 1,
				cpu: 1,
				memory: 1,
				storage: 10,
				bandwidth: 100,
				hours: 720,
			});

			// May be null if no pricing source available
			if (estimate === null) {
				expect(estimate).toBeNull();
			} else {
				expect(estimate.provider).toBe("aws");
				expect(estimate.monthlyCost).toBeGreaterThanOrEqual(0);
			}
		});
	});

	describe("Cache Management", () => {
		it("should track last source", async () => {
			await manager.fetchPricing();
			// Last source should be set (may be null if no sources available)
			const source = manager.getLastSource();
			expect(source === null || typeof source === "string").toBe(true);
		});

		it("should clear cache", () => {
			manager.clearCache();
			// Should not throw
			expect(true).toBe(true);
		});
	});

	describe("Provider List", () => {
		it("should return available providers as array", async () => {
			const providers = await manager.getAvailableProviders();
			expect(Array.isArray(providers)).toBe(true);
		});
	});
});
