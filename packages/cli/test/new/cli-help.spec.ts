import { spawnSync } from "node:child_process";
import path from "node:path";

const CLI = path.resolve(__dirname, "../../bin/cli.js");

describe("expressots new --help", () => {
	it("lists templates, package managers, and presets", () => {
		const result = spawnSync(process.execPath, [CLI, "new", "--help"], {
			encoding: "utf8",
		});

		expect(result.status).toBe(0);
		const out = `${result.stdout}\n${result.stderr}`;

		expect(out).toContain("application");
		expect(out).toContain("micro");
		expect(out).toContain("npm");
		expect(out).toContain("pnpm");
		expect(out).toContain("api");
		expect(out).toContain("graphql");
		expect(out).toContain("microservice");
		expect(out).toContain("minimal");
		expect(out).toContain("Available choices");
		expect(out).toContain("application-with-events");
	});
});
