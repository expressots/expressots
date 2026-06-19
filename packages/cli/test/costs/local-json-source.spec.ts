/**
 * Unit tests for the local JSON pricing source.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import {
	createLocalJSONPricingSource,
	LocalJSONPricingSource,
} from "../../src/costs/sources/local-json-source";

const validPricing = {
	version: "1.0.0",
	updated: "2026-01-01T00:00:00Z",
	providers: {
		aws: {
			serviceName: "ECS",
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

let tmpFile: string;

beforeEach(() => {
	tmpFile = path.join(
		fs.mkdtempSync(path.join(os.tmpdir(), "ex-cli-pricing-")),
		"pricing.json",
	);
});

afterEach(() => {
	fs.rmSync(path.dirname(tmpFile), { recursive: true, force: true });
});

describe("LocalJSONPricingSource", () => {
	it("returns null when file does not exist", async () => {
		const source = new LocalJSONPricingSource(tmpFile);
		expect(await source.fetch()).toBeNull();
		expect(source.exists()).toBe(false);
	});

	it("reads valid pricing JSON from disk", async () => {
		fs.writeFileSync(tmpFile, JSON.stringify(validPricing));
		const source = createLocalJSONPricingSource(
			tmpFile,
		) as LocalJSONPricingSource;

		const data = await source.fetch();
		expect(data?.version).toBe("1.0.0");
		expect(source.exists()).toBe(true);
		expect(source.getPath()).toBe(tmpFile);
	});

	it("returns null for invalid pricing structure", async () => {
		fs.writeFileSync(tmpFile, JSON.stringify({ version: "1.0.0" }));
		const source = createLocalJSONPricingSource(tmpFile);
		expect(await source.fetch()).toBeNull();
	});

	it("returns null for malformed JSON", async () => {
		fs.writeFileSync(tmpFile, "{not json");
		const source = createLocalJSONPricingSource(tmpFile);
		expect(await source.fetch()).toBeNull();
	});

	it("supports changing the file path", async () => {
		const source = new LocalJSONPricingSource();
		source.setPath(tmpFile);
		fs.writeFileSync(tmpFile, JSON.stringify(validPricing));
		expect(await source.fetch()).not.toBeNull();
	});
});
