import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CLI = path.resolve(__dirname, "../../bin/cli.js");
const REPO_ROOT = path.resolve(__dirname, "../../../..");

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

	it("generates a Cloudflare micro project", () => {
		const tempDir = fs.mkdtempSync(
			path.join(os.tmpdir(), "expressots-cloudflare-scaffold-"),
		);
		temporaryDirectories.push(tempDir);

		const result = spawnSync(
			process.execPath,
			[
				CLI,
				"new",
				"edge-api",
				"--package-manager",
				"pnpm",
				"--template",
				"micro",
				"--directory",
				tempDir,
				"--target",
				"cloudflare",
			],
			{
				cwd: REPO_ROOT,
				encoding: "utf8",
				env: {
					...process.env,
					EXPRESSOTS_DEV: "1",
					EXPRESSOTS_USE_LOCAL_TEMPLATES: "1",
					EXPRESSOTS_SKIP_INSTALL: "1",
				},
			},
		);

		expect(result.status).toBe(0);
		const projectDir = path.join(tempDir, "edge-api");
		expect(fs.existsSync(path.join(projectDir, "wrangler.toml"))).toBe(
			true,
		);
		expect(
			fs.readFileSync(path.join(projectDir, "src", "api.ts"), "utf8"),
		).toContain("cloudflareAdapter(app.getApp())");
		const workerTest = fs.readFileSync(
			path.join(projectDir, "test", "api.spec.ts"),
			"utf8",
		);
		expect(workerTest).toContain('import worker from "../src/api";');
		expect(workerTest).toContain(
			'worker.fetch(new Request("http://localhost/")',
		);
		expect(workerTest).toContain('new Request("http://localhost/health")');
		expect(workerTest).not.toContain("micro(");
		expect(workerTest).not.toContain(".listen(");
		expect(workerTest).not.toContain("getHttpServer");
		expect(
			fs.readFileSync(
				path.join(projectDir, "pnpm-workspace.yaml"),
				"utf8",
			),
		).toContain("workerd: true");
		const readme = fs.readFileSync(
			path.join(projectDir, "README.md"),
			"utf8",
		);
		expect(readme).toContain("pnpm install");
		expect(readme).toContain("pnpm run dev");
		expect(readme).toContain("pnpm run build");
		expect(readme).toContain("pnpm exec wrangler login");
		expect(readme).toContain("pnpm run deploy");
		expect(readme).toContain("wrangler dev");
		expect(readme).toContain("ex dev");
		expect(readme).toContain("nodejs_compat");
		expect(readme).not.toMatch(/\bprod\b/);
		expect(readme).not.toContain("3000");
		expect(readme).not.toContain("app.listen");
		expect(readme).not.toContain(
			"https://expresso-ts.com/docs/guides/micro-api",
		);
		expect(
			JSON.parse(
				fs.readFileSync(path.join(projectDir, "package.json"), "utf8"),
			),
		).toMatchObject({
			engines: { node: ">=22.0.0" },
			scripts: { dev: "wrangler dev" },
		});
		expect(`${result.stdout}\n${result.stderr}`).toContain(
			"$ pnpm run dev",
		);
	});

	it("preserves an untargeted micro project", () => {
		const tempDir = fs.mkdtempSync(
			path.join(os.tmpdir(), "expressots-cloudflare-scaffold-"),
		);
		temporaryDirectories.push(tempDir);

		const result = spawnSync(
			process.execPath,
			[
				CLI,
				"new",
				"plain-api",
				"--package-manager",
				"pnpm",
				"--template",
				"micro",
				"--directory",
				tempDir,
			],
			{
				cwd: REPO_ROOT,
				encoding: "utf8",
				env: {
					...process.env,
					EXPRESSOTS_DEV: "1",
					EXPRESSOTS_USE_LOCAL_TEMPLATES: "1",
					EXPRESSOTS_SKIP_INSTALL: "1",
				},
			},
		);

		expect(result.status).toBe(0);
		const projectDir = path.join(tempDir, "plain-api");
		expect(fs.existsSync(path.join(projectDir, "wrangler.toml"))).toBe(
			false,
		);
		expect(
			JSON.parse(
				fs.readFileSync(path.join(projectDir, "package.json"), "utf8"),
			).engines.node,
		).toBe(">=20.19.0");
		expect(
			fs.readFileSync(path.join(projectDir, "src", "api.ts"), "utf8"),
		).toBe(
			fs.readFileSync(
				path.join(REPO_ROOT, "templates", "micro", "src", "api.ts"),
				"utf8",
			),
		);
	});
});
