/**
 * Tests for pure helpers in the containerize project analyzer.
 *
 * `resolveNodeMajor` turns an arbitrary `engines.node` value into a
 * Docker-tag-safe major version. Getting this wrong produces invalid
 * image tags like `node:>=20-alpine`, so each shape is covered here.
 */

import { resolveNodeMajor } from "../../src/containerize/analyzers/project-analyzer";

describe("resolveNodeMajor", () => {
	test.each([
		[">=20", "20"],
		["^20.0.0", "20"],
		["~18.17.0", "18"],
		["24.3.0", "24"],
		["20.x", "20"],
		["20 || 22", "20"],
		[">=18 <23", "18"],
		["lts/*", undefined], // no number -> host fallback
	])("parses %s", (input, expected) => {
		const result = resolveNodeMajor(input);
		if (expected === undefined) {
			// Falls back to the CLI host's major version.
			expect(result).toBe(
				process.version.replace(/^v/, "").split(".")[0],
			);
		} else {
			expect(result).toBe(expected);
		}
	});

	test("falls back to host major version when engines.node is absent", () => {
		const hostMajor = process.version.replace(/^v/, "").split(".")[0];
		expect(resolveNodeMajor(undefined)).toBe(hostMajor);
		expect(resolveNodeMajor("")).toBe(hostMajor);
	});
});
