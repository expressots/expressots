import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
	PNPM_ALLOW_BUILDS_YAML,
	writePnpmAllowBuildsConfig,
} from "../../src/new/pnpm-allow-builds";

describe("pnpm allowBuilds scaffold", () => {
	it("writes pnpm-workspace.yaml with approved lifecycle builds", () => {
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "expressots-pnpm-"));
		writePnpmAllowBuildsConfig(tmpDir);

		const filePath = path.join(tmpDir, "pnpm-workspace.yaml");
		expect(fs.existsSync(filePath)).toBe(true);
		expect(fs.readFileSync(filePath, "utf8")).toBe(PNPM_ALLOW_BUILDS_YAML);
		expect(PNPM_ALLOW_BUILDS_YAML).toContain("allowBuilds:");
		expect(PNPM_ALLOW_BUILDS_YAML).toContain("esbuild: true");
	});
});
