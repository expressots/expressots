/**
 * Extended PricingManager tests with a temp local pricing file.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// PricingManager derives its disk-cache path from os.homedir() at import
// time. Point it at a per-process temp dir so tests never read or write the
// real ~/.expressots cache (which made this suite order-dependent).
jest.mock("os", () => {
	const actual = jest.requireActual("os");
	const actualPath = jest.requireActual("path");
	const fakeHome = actualPath.join(
		actual.tmpdir(),
		`ex-cli-pmgr-home-${process.pid}`,
	);
	return { ...actual, homedir: () => fakeHome };
});

jest.mock("../../src/config", () => ({
	getConfigManager: () => ({
		getPricingConfig: () => ({
			sources: ["local"],
			cacheTTL: 3600,
			customFile: null,
		}),
	}),
}));

import {
	PricingManager,
	resetPricingManager,
} from "../../src/costs/pricing-manager";

const pricingFixture = {
	version: "2.0.0",
	updated: "2026-06-01T00:00:00Z",
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
		railway: {
			serviceName: "Web Service",
			model: "per-month",
			basePrice: 5,
			cpuPerHour: 0,
			memoryPerGbHour: 0,
			storagePerGb: 0.25,
			bandwidthPerGb: 0.1,
			freeBandwidth: 0,
		},
	},
};

let pricingFile: string;
let logSpy: jest.SpyInstance;

beforeEach(() => {
	resetPricingManager();
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ex-cli-pmgr-"));
	pricingFile = path.join(dir, "pricing.json");
	fs.writeFileSync(pricingFile, JSON.stringify(pricingFixture));
	logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
	logSpy.mockRestore();
	fs.rmSync(path.dirname(pricingFile), { recursive: true, force: true });
	fs.rmSync(os.homedir(), { recursive: true, force: true });
	resetPricingManager();
});

describe("PricingManager (local file)", () => {
	let manager: PricingManager;

	beforeEach(() => {
		manager = new PricingManager({
			sources: ["local"],
			customLocalFile: pricingFile,
		});
	});

	it("loads pricing from the local file", async () => {
		const pricing = await manager.fetchPricing();
		expect(pricing?.version).toBe("2.0.0");
		expect(manager.getLastSource()).toBe("local");
	});

	it("calculates per-hour provider costs", async () => {
		const estimate = await manager.calculateMonthlyCost("aws", {
			instances: 2,
			cpu: 1,
			memory: 2,
			storage: 20,
			bandwidth: 150,
			hours: 720,
		});

		expect(estimate).not.toBeNull();
		expect(estimate!.provider).toBe("aws");
		expect(estimate!.monthlyCost).toBeGreaterThan(0);
		expect(estimate!.breakdown.compute).toBeGreaterThan(0);
		expect(estimate!.breakdown.storage).toBe(2);
		expect(estimate!.breakdown.bandwidth).toBeCloseTo(4.5, 1);
	});

	it("calculates per-month provider costs", async () => {
		const estimate = await manager.calculateMonthlyCost("railway", {
			instances: 1,
			cpu: 1,
			memory: 1,
			storage: 0,
			bandwidth: 0,
			hours: 720,
		});

		expect(estimate?.monthlyCost).toBe(5);
		expect(estimate?.breakdown.base).toBe(5);
	});

	it("compares costs across providers", async () => {
		const estimates = await manager.compareCosts({
			instances: 1,
			cpu: 1,
			memory: 1,
			storage: 10,
			bandwidth: 50,
			hours: 720,
		});

		expect(estimates.length).toBe(2);
		expect(estimates[0].monthlyCost).toBeLessThanOrEqual(
			estimates[1].monthlyCost,
		);
	});

	it("returns provider list and info metadata", async () => {
		const providers = await manager.getAvailableProviders();
		expect(providers).toEqual(expect.arrayContaining(["aws", "railway"]));

		const info = await manager.getInfo();
		expect(info?.version).toBe("2.0.0");
		expect(info?.source).toContain("local");
	});

	it("rejects invalid provider pricing during validation", () => {
		expect(
			manager.validatePricing({
				version: "1.0.0",
				providers: {
					bad: {
						serviceName: "X",
						model: "per-hour",
						cpuPerHour: "nope",
						memoryPerGbHour: 1,
					},
				},
			} as never),
		).toBe(false);
	});

	it("prints status output", async () => {
		await manager.printStatus();
		expect(logSpy.mock.calls.some((c) => String(c[0]).includes("Pricing System Status"))).toBe(
			true,
		);
	});

	it("force refresh bypasses memory cache", async () => {
		await manager.fetchPricing();
		const refreshed = await manager.updateCache();
		expect(refreshed).toBe(true);
	});
});
