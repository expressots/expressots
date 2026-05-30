import { spawnSync } from "node:child_process";
import path from "node:path";

const CLI = path.resolve(__dirname, "../../bin/cli.js");

describe("containerize alias", () => {
	it("resolves the 'ctr' alias to containerize help", () => {
		const result = spawnSync(process.execPath, [CLI, "ctr", "--help"], {
			encoding: "utf8",
		});

		expect(result.status).toBe(0);
		const out = `${result.stdout}\n${result.stderr}`;
		expect(out).toContain("containerize");
		expect(out).toContain("target");
	});

	it("no longer binds the 'c' alias to containerize", () => {
		// `c` should now be an unknown command (containerize moved to ctr),
		// so strict mode rejects it with a non-zero exit.
		const result = spawnSync(process.execPath, [CLI, "c"], {
			encoding: "utf8",
		});

		expect(result.status).not.toBe(0);
	});
});
