/**
 * Unit tests for container preset registry.
 */

import {
	getPresetConfig,
	listPresets,
} from "../../src/containerize/presets/preset-registry";

describe("preset-registry", () => {
	it("returns known presets", () => {
		const minimal = getPresetConfig("minimal");
		expect(minimal.name).toBe("Minimal");
		expect(minimal.baseVariant).toBe("alpine");
	});

	it("falls back to standard for unknown preset names", () => {
		const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
		const preset = getPresetConfig("does-not-exist");
		expect(preset.name).toBe("Standard");
		warnSpy.mockRestore();
	});

	it("lists all presets", () => {
		const presets = listPresets();
		expect(presets.length).toBeGreaterThanOrEqual(5);
		expect(presets.some((p) => p.name === "Development")).toBe(true);
	});
});
