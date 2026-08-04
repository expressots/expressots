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
		).toContain(
			'import { cloudflareAdapter, micro } from "@expressots/adapter-express";',
		);
		const workerTest = fs.readFileSync(
			path.join(projectDir, "test", "api.spec.ts"),
			"utf8",
		);
		// The suite must run inside workerd, not Node: undici hides the
		// body-parser failures and invents a 204 failure of its own.
		expect(workerTest).toContain('import { SELF } from "cloudflare:test";');
		expect(workerTest).toContain('from "vitest"');
		expect(workerTest).toContain('SELF.fetch("https://example.com/")');
		expect(workerTest).toContain("content-length");
		expect(workerTest).not.toContain('import worker from "../src/api"');
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
		expect(readme).toContain("Express body-parsing middleware does not work");
		expect(readme).toContain("do not add Express body parsers");
		expect(readme).not.toMatch(/\bprod\b/);
		expect(readme).not.toContain("3000");
		expect(readme).not.toContain("app.listen(3000)");
		expect(readme).not.toContain(
			"https://expresso-ts.com/docs/guides/micro-api",
		);
		const pkg = JSON.parse(
			fs.readFileSync(path.join(projectDir, "package.json"), "utf8"),
		);
		expect(pkg).toMatchObject({
			engines: { node: ">=22.0.0" },
			scripts: { dev: "wrangler dev" },
		});
		expect(pkg.main).toBeUndefined();
		expect(pkg.scripts["example:circuit-breaker"]).toBeUndefined();
		expect(pkg.devDependencies["@expressots/cli"]).toBeUndefined();
		expect(pkg.devDependencies.tsx).toBeUndefined();

		// Worker tests run on workerd via Vitest, not on Node via Jest.
		expect(pkg.scripts.test).toBe("vitest run");
		expect(pkg.devDependencies.vitest).toBeDefined();
		expect(
			pkg.devDependencies["@cloudflare/vitest-pool-workers"],
		).toBeDefined();
		expect(pkg.devDependencies.jest).toBeUndefined();
		expect(pkg.devDependencies["ts-jest"]).toBeUndefined();
		expect(pkg.devDependencies["@types/jest"]).toBeUndefined();
		expect(fs.existsSync(path.join(projectDir, "jest.config.ts"))).toBe(
			false,
		);

		const vitestConfig = fs.readFileSync(
			// .mts, because the pool is ESM-only and the project is not
			// "type": "module" — a .ts config would be loaded as CJS.
			path.join(projectDir, "vitest.config.mts"),
			"utf8",
		);
		expect(vitestConfig).toContain("cloudflareTest");
		expect(vitestConfig).toContain("./wrangler.toml");

		// iconv-lite is aliased away: express -> body-parser pulls in ~485 KiB
		// of encoding tables that this target never executes.
		const shim = fs.readFileSync(
			// .cjs on purpose — raw-body/body-parser reach it via require(),
			// and an ESM shim breaks their interop under Vitest.
			path.join(projectDir, "src", "shims", "iconv-lite.cjs"),
			"utf8",
		);
		expect(shim).toContain("module.exports");
		expect(shim).toContain("encodingExists");
		expect(shim).toContain("getDecoder");

		const wrangler = fs.readFileSync(
			path.join(projectDir, "wrangler.toml"),
			"utf8",
		);
		expect(wrangler).toContain(
			'alias = { "iconv-lite" = "./src/shims/iconv-lite.cjs" }',
		);
		// The pool does not read wrangler.toml, so the alias must be repeated
		// in the Vitest config or tests would run against a different bundle
		// than production.
		expect(vitestConfig).toContain("iconv-lite");
		expect(vitestConfig).toContain("./src/shims/iconv-lite.cjs");
		for (const nodeOnlyPath of [
			".env.example",
			"examples",
			"expressots.config.ts",
			"tsconfig.build.json",
		]) {
			expect(fs.existsSync(path.join(projectDir, nodeOnlyPath))).toBe(
				false,
			);
		}
		const agents = fs.readFileSync(
			path.join(projectDir, "AGENTS.md"),
			"utf8",
		);
		expect(agents).toContain("Cloudflare Workers");
		expect(agents).toContain("Never add Express body-parsing middleware");
		expect(agents).not.toContain("npm run prod");
		const gitignore = fs.readFileSync(
			path.join(projectDir, ".gitignore"),
			"utf8",
		);
		expect(gitignore).toContain("/worker-configuration.d.ts");
		expect(gitignore).not.toContain("!.env.example");
		const tsconfig = fs.readFileSync(
			path.join(projectDir, "tsconfig.json"),
			"utf8",
		);
		expect(tsconfig).toContain('"worker-configuration.d.ts"');
		expect(tsconfig).not.toContain('"expressots.config.ts"');
		// Node10 resolution cannot read the pool's exports subpath, so
		// `cloudflare:test` would not typecheck.
		expect(tsconfig).toContain('"moduleResolution": "bundler"');
		expect(tsconfig).toContain('"module": "esnext"');
		expect(tsconfig).toContain('"@cloudflare/vitest-pool-workers/types"');
		expect(tsconfig).not.toContain('"jest"');
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
