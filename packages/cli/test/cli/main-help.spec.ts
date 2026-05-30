/**
 * Verifies the refined top-level help screen: it must list every command
 * grouped under section headers, stay compact (no repeated `expressots`
 * prefix per command line), and not interfere with per-command help.
 */

import { spawnSync } from "node:child_process";
import path from "node:path";

const CLI = path.resolve(__dirname, "../../bin/cli.js");

function runHelp(args: string[]): string {
	const result = spawnSync(process.execPath, [CLI, ...args], {
		encoding: "utf8",
	});
	expect(result.status).toBe(0);
	return `${result.stdout}\n${result.stderr}`;
}

describe("top-level help", () => {
	it("renders grouped section headers", () => {
		const out = runHelp(["--help"]);
		expect(out).toContain("Project");
		expect(out).toContain("Generate");
		expect(out).toContain("Providers");
		expect(out).toContain("DevOps");
		expect(out).toContain("Studio & Help");
		expect(out).toContain("Options");
	});

	it.each([
		"new",
		"dev",
		"build",
		"prod",
		"generate",
		"containerize",
		"cicd",
		"migrate",
		"profile",
		"container-dev",
		"costs",
		"templates",
		"studio",
		"resources",
		"completion",
	])("lists the %s command", (command) => {
		const out = runHelp(["--help"]);
		expect(out).toContain(command);
	});

	it("is compact: does not repeat the 'expressots <name>' prefix per command", () => {
		const out = runHelp(["--help"]);
		// The default yargs help prints `expressots new ...`, `expressots dev ...`
		// on every row. The refined screen should not.
		const repeatedPrefix = out.match(/expressots (new|dev|build) /g) ?? [];
		expect(repeatedPrefix.length).toBe(0);
	});

	it("responds to `help` and bare invocation the same way", () => {
		expect(runHelp(["help"])).toContain("Usage: expressots <command>");
		expect(runHelp([])).toContain("Usage: expressots <command>");
	});

	it("does not override per-command help (new --help keeps its epilog)", () => {
		const result = spawnSync(process.execPath, [CLI, "new", "--help"], {
			encoding: "utf8",
		});
		expect(result.status).toBe(0);
		const out = `${result.stdout}\n${result.stderr}`;
		expect(out).toContain("Available choices");
	});
});
