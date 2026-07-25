/**
 * Unit tests for help rendering helpers.
 */

import {
	formatAlias,
	renderHelpGroups,
	renderRow,
	type HelpEntry,
} from "../../src/help/render";

describe("help/render", () => {
	describe("formatAlias", () => {
		it("wraps alias in parentheses when present", () => {
			expect(formatAlias("g")).toBe("(g)");
		});

		it("returns empty string when alias is absent", () => {
			expect(formatAlias(undefined)).toBe("");
		});
	});

	describe("renderRow", () => {
		it("pads name and alias columns", () => {
			const entry: HelpEntry = {
				name: "generate",
				alias: "g",
				desc: "Scaffold a resource",
			};
			const row = renderRow(entry, 10, 4);
			expect(row).toContain("generate");
			expect(row).toContain("(g)");
			expect(row).toContain("Scaffold a resource");
		});
	});

	describe("renderHelpGroups", () => {
		it("renders titled groups with aligned columns", () => {
			const lines = renderHelpGroups([
				{
					title: "Project",
					entries: [
						{ name: "dev", desc: "Start development server" },
						{ name: "build", desc: "Build for production" },
					],
				},
			]);

			expect(lines.some((l) => l.includes("Project"))).toBe(true);
			expect(lines.some((l) => l.includes("dev"))).toBe(true);
			expect(lines.some((l) => l.includes("build"))).toBe(true);
		});
	});
});
