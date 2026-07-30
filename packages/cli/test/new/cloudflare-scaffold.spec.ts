import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CLI = path.resolve(__dirname, "../../bin/cli.js");

describe("Cloudflare target validation", () => {
	const temporaryDirectories: string[] = [];

	afterEach(() => {
		for (const directory of temporaryDirectories) {
			fs.rmSync(directory, { recursive: true, force: true });
		}
		temporaryDirectories.length = 0;
	});

	it("rejects Cloudflare targets for non-micro templates before creating files", () => {
		const tempDir = fs.mkdtempSync(
			path.join(os.tmpdir(), "expressots-cloudflare-scaffold-"),
		);
		temporaryDirectories.push(tempDir);

		const result = spawnSync(
			process.execPath,
			[
				CLI,
				"new",
				"invalid-cloudflare-app",
				"--package-manager",
				"pnpm",
				"--template",
				"application",
				"--target",
				"cloudflare",
			],
			{
				cwd: tempDir,
				encoding: "utf8",
			},
		);

		expect(result.status).not.toBe(0);
		expect(`${result.stdout}\n${result.stderr}`).toContain(
			'The "cloudflare" target supports only the "micro" template.',
		);
		expect(
			fs.existsSync(path.join(tempDir, "invalid-cloudflare-app")),
		).toBe(false);
	});
});
