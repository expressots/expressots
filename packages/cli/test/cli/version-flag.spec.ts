import { spawnSync } from "node:child_process";
import path from "node:path";

const CLI = path.resolve(__dirname, "../../bin/cli.js");

describe("expressots --version", () => {
	it("prints a semver version with --version", () => {
		const result = spawnSync(process.execPath, [CLI, "--version"], {
			encoding: "utf8",
		});

		expect(result.status).toBe(0);
		const out = `${result.stdout}\n${result.stderr}`;
		expect(out).toMatch(/\d+\.\d+\.\d+/);
	});

	it("prints a semver version with -V alias", () => {
		const result = spawnSync(process.execPath, [CLI, "-V"], {
			encoding: "utf8",
		});

		expect(result.status).toBe(0);
		const out = `${result.stdout}\n${result.stderr}`;
		expect(out).toMatch(/\d+\.\d+\.\d+/);
	});
});
