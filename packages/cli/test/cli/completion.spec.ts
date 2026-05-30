import { spawnSync } from "node:child_process";
import path from "node:path";

const CLI = path.resolve(__dirname, "../../bin/cli.js");

describe("expressots completion", () => {
	it("outputs a shell completion script", () => {
		const result = spawnSync(process.execPath, [CLI, "completion"], {
			encoding: "utf8",
		});

		expect(result.status).toBe(0);
		const out = `${result.stdout}\n${result.stderr}`;
		// yargs wraps its generated completion script in these markers.
		expect(out).toContain("###-begin-expressots-completions-###");
	});
});
