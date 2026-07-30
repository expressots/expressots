import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
	applyCloudflareTarget,
	normalizeWorkerName,
} from "../../src/new/cloudflare-target";

describe("normalizeWorkerName", () => {
	it.each([
		["My Worker", "my-worker"],
		["@scope/My API", "my-api"],
		["--edge__api--", "edge-api"],
		["!!!", "expressots-worker"],
		["a".repeat(70), "a".repeat(63)],
		[`${"a".repeat(62)}-suffix`, "a".repeat(62)],
	])("normalizes %s", (input, expected) => {
		expect(normalizeWorkerName(input)).toBe(expected);
	});
});

function createMicroFixture(): string {
	const targetDir = fs.mkdtempSync(
		path.join(os.tmpdir(), "expressots-cloudflare-target-"),
	);
	fs.mkdirSync(path.join(targetDir, "src"), { recursive: true });
	fs.writeFileSync(
		path.join(targetDir, "src", "api.ts"),
		'console.log("node scaffold");\n',
	);
	fs.writeFileSync(
		path.join(targetDir, "README.md"),
		"# Micro\n\n## Learn more\n",
	);
	fs.writeFileSync(
		path.join(targetDir, "package.json"),
		`${JSON.stringify(
			{
				name: "expressots-micro",
				scripts: {
					build: "expressots build",
					dev: "expressots dev",
					prod: "expressots prod",
					studio: "expressots studio",
					test: "jest",
				},
				devDependencies: {
					"@expressots/cli": "4.1.1",
					"@expressots/studio": "4.1.1",
					"@expressots/studio-agent": "4.1.1",
				},
			},
			null,
			4,
		)}\n`,
		"utf8",
	);
	return targetDir;
}

describe("applyCloudflareTarget", () => {
	const temporaryDirectories: string[] = [];

	afterEach(() => {
		for (const directory of temporaryDirectories) {
			fs.rmSync(directory, { recursive: true, force: true });
		}
		temporaryDirectories.length = 0;
	});

	it("generates deterministic Cloudflare artifacts", () => {
		const targetDir = createMicroFixture();
		temporaryDirectories.push(targetDir);
		applyCloudflareTarget({ targetDir, projectName: "@scope/My Worker" });
		applyCloudflareTarget({ targetDir, projectName: "@scope/My Worker" });

		expect(
			fs.readFileSync(path.join(targetDir, "wrangler.toml"), "utf8"),
		).toBe(
			[
				'name = "my-worker"',
				'main = "src/api.ts"',
				'compatibility_date = "2026-07-31"',
				'compatibility_flags = ["nodejs_compat"]',
				"",
			].join("\n"),
		);

		const api = fs.readFileSync(
			path.join(targetDir, "src", "api.ts"),
			"utf8",
		);
		expect(api).toContain("cloudflareAdapter");
		expect(api).toContain("cloudflareAdapter(app.getApp())");
		expect(api).not.toContain("app.listen");

		const pkg = JSON.parse(
			fs.readFileSync(path.join(targetDir, "package.json"), "utf8"),
		);
		expect(pkg.scripts).toMatchObject({
			build: "wrangler deploy --dry-run",
			dev: "wrangler dev",
			deploy: "wrangler deploy",
			types: "wrangler types",
			test: "jest",
		});
		expect(pkg.scripts.prod).toBeUndefined();
		expect(pkg.scripts.studio).toBeUndefined();
		expect(pkg.devDependencies.wrangler).toBe("^4.95.0");
		expect(pkg.devDependencies["@expressots/studio"]).toBeUndefined();
		expect(pkg.devDependencies["@expressots/studio-agent"]).toBeUndefined();

		const readme = fs.readFileSync(
			path.join(targetDir, "README.md"),
			"utf8",
		);
		expect(readme.match(/## Cloudflare Workers/g)).toHaveLength(1);
	});
});
