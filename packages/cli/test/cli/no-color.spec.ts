import { spawnSync } from "node:child_process";
import path from "node:path";

const CLI = path.resolve(__dirname, "../../bin/cli.js");

// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE = /\x1b\[/;

describe("NO_COLOR support", () => {
	it("emits no ANSI escape codes when NO_COLOR is set", () => {
		const result = spawnSync(process.execPath, [CLI, "resources"], {
			encoding: "utf8",
			env: { ...process.env, NO_COLOR: "1" },
		});

		const out = `${result.stdout}\n${result.stderr}`;
		expect(out).not.toMatch(ANSI_ESCAPE);
	});
});

describe("piped output", () => {
	it("does not print the startup header banner when stdout is not a TTY", () => {
		// spawnSync pipes stdout by default, so process.stdout.isTTY is
		// undefined in the child and the startup header should be
		// suppressed. We probe with `--version` because its own output
		// never contains the brand banner (unlike `resources`/help).
		const result = spawnSync(process.execPath, [CLI, "--version"], {
			encoding: "utf8",
		});

		const out = `${result.stdout}\n${result.stderr}`;
		expect(out).not.toContain("🐎 ExpressoTS CLI");
	});
});
