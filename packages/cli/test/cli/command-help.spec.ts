/**
 * Verifies that option-heavy subcommands render the refined, grouped help
 * screen (matching the top-level help) instead of yargs' sprawling default
 * table — and that aliases and `-h` resolve to the same screen.
 */

import { spawnSync } from "node:child_process";
import path from "node:path";

const CLI = path.resolve(__dirname, "../../bin/cli.js");

function run(args: string[]): string {
	const result = spawnSync(process.execPath, [CLI, ...args], {
		encoding: "utf8",
		env: { ...process.env, NO_COLOR: "1" },
	});
	expect(result.status).toBe(0);
	return `${result.stdout}\n${result.stderr}`;
}

describe("subcommand help (refined)", () => {
	it("renders costs help with usage, grouped actions and options", () => {
		const out = run(["costs", "--help"]);
		expect(out).toContain("🐎 ExpressoTS CLI");
		expect(out).toContain("Usage: expressots costs <action> [options]");
		expect(out).toContain("Actions");
		expect(out).toContain("estimate");
		expect(out).toContain("Options");
		expect(out).toContain("-p, --provider");
		expect(out).toContain("Global: -h, --help");
		expect(out).toContain("Docs:");
	});

	it("does not emit yargs' default positional/options tables", () => {
		const out = run(["costs", "--help"]);
		expect(out).not.toContain("Positionals:");
		// yargs renders `[choices: "estimate", ...]`; the refined screen does not.
		expect(out).not.toContain('[choices:');
	});

	it("resolves aliases and -h to the same screen", () => {
		const viaAlias = run(["cost", "-h"]);
		const viaPricing = run(["pricing", "--help"]);
		expect(viaAlias).toContain("Estimate and compare cloud deployment costs.");
		expect(viaPricing).toContain(
			"Estimate and compare cloud deployment costs.",
		);
	});

	it.each([
		["cicd", "Generate and manage CI/CD"],
		["migrate", "Generate migration scripts"],
		["profile", "Analyze and optimize container"],
		["containerize", "Generate container configurations"],
		["container-dev", "Develop inside Docker"],
		["templates", "Manage CLI templates"],
		["dev", "Start the development server"],
	])("renders refined help for %s", (command, snippet) => {
		const out = run([command, "--help"]);
		expect(out).toContain("🐎 ExpressoTS CLI");
		expect(out).toContain(`Usage: expressots ${command}`);
		expect(out).toContain(snippet);
		expect(out).toContain("Global: -h, --help");
		expect(out).not.toContain("Positionals:");
	});
});
