/**
 * Unit tests for embedded cloud provider pricing tables.
 */

import {
	calculateMonthlyCost,
	getAllPricing,
	getPricing,
} from "../../src/costs/providers/index";

describe("costs/providers", () => {
	it("returns pricing for each provider", () => {
		expect(getPricing("aws").serviceName).toBe("ECS Fargate");
		expect(getPricing("railway").model).toBe("usage");
		expect(getPricing("unknown" as never).serviceName).toBe("ECS Fargate");
	});

	it("returns the full pricing table", () => {
		const all = getAllPricing();
		expect(Object.keys(all).length).toBeGreaterThanOrEqual(8);
	});

	it.each([
		["aws", "per-hour"],
		["render", "per-month"],
		["railway", "usage"],
	] as const)("calculates monthly cost for %s (%s model)", (provider, _model) => {
		const cost = calculateMonthlyCost(provider, {
			instances: 1,
			cpu: 1,
			memory: 1,
			storage: 10,
			bandwidth: 200,
			hours: 720,
		});
		expect(cost).toBeGreaterThan(0);
	});
});
