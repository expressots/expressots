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
	fs.mkdirSync(path.join(targetDir, "test"), { recursive: true });
	fs.mkdirSync(path.join(targetDir, "examples"), { recursive: true });
	fs.writeFileSync(
		path.join(targetDir, "src", "api.ts"),
		'console.log("node scaffold");\n',
	);
	fs.writeFileSync(
		path.join(targetDir, "test", "api.spec.ts"),
		'import { micro } from "@expressots/adapter-express";\n',
	);
	fs.writeFileSync(
		path.join(targetDir, "README.md"),
		"# Micro\n\n## Learn more\n",
	);
	fs.writeFileSync(path.join(targetDir, "AGENTS.md"), "Run npm run prod.\n");
	fs.writeFileSync(path.join(targetDir, ".env.example"), "PORT=3000\n");
	fs.writeFileSync(
		path.join(targetDir, "examples", "serverless-lambda.example.ts"),
		"export {};\n",
	);
	fs.writeFileSync(
		path.join(targetDir, "expressots.config.ts"),
		"export default {};\n",
	);
	fs.writeFileSync(path.join(targetDir, "tsconfig.build.json"), "{}\n");
	fs.writeFileSync(
		path.join(targetDir, ".gitignore"),
		"/dist\n/node_modules\n\n# Environment files (except examples)\n.env\n!.env.example\n",
	);
	fs.writeFileSync(
		path.join(targetDir, "tsconfig.json"),
		`${JSON.stringify(
			{
				compilerOptions: { types: ["node", "jest"] },
				include: [
					"src/**/*.ts",
					"test/**/*.ts",
					"expressots.config.ts",
				],
				exclude: ["node_modules", "dist"],
			},
			null,
			4,
		)}\n`,
	);
	fs.writeFileSync(
		path.join(targetDir, "package.json"),
		`${JSON.stringify(
			{
				name: "expressots-micro",
				main: "dist/src/api.js",
				engines: {
					node: ">=20.19.0",
				},
				scripts: {
					build: "expressots build",
					dev: "expressots dev",
					prod: "expressots prod",
					studio: "expressots studio",
					test: "jest",
					"example:circuit-breaker":
						"tsx examples/circuit-breaker.example.ts",
					"example:service-discovery":
						"tsx examples/service-discovery.example.ts",
					"example:service-client":
						"tsx examples/service-client.example.ts",
					"example:full-di-api":
						"tsx examples/full-di-api.example.ts",
				},
				devDependencies: {
					"@expressots/cli": "4.1.1",
					"@expressots/studio": "4.1.1",
					"@expressots/studio-agent": "4.1.1",
					tsx: "4.21.0",
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
				'compatibility_date = "2026-07-29"',
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
		expect(api).toContain("autoParseJson: false");
		expect(api).not.toContain("app.listen");

		const workerTest = fs.readFileSync(
			path.join(targetDir, "test", "api.spec.ts"),
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
		expect(pkg.devDependencies.wrangler).toBe("^4.115.0");
		expect(pkg.devDependencies["@expressots/studio"]).toBeUndefined();
		expect(pkg.devDependencies["@expressots/studio-agent"]).toBeUndefined();
		expect(pkg.engines.node).toBe(">=22.0.0");

		const readme = fs.readFileSync(
			path.join(targetDir, "README.md"),
			"utf8",
		);
		expect(readme.match(/## Cloudflare Workers/g)).toHaveLength(1);
	});

	it("formats the generated Worker entrypoint", () => {
		const targetDir = createMicroFixture();
		temporaryDirectories.push(targetDir);

		applyCloudflareTarget({ targetDir, projectName: "edge-api" });

		expect(
			fs.readFileSync(path.join(targetDir, "src", "api.ts"), "utf8"),
		).toContain(
			'import { cloudflareAdapter, micro } from "@expressots/adapter-express";',
		);
	});

	it("removes Node-only scaffold files and metadata", () => {
		const targetDir = createMicroFixture();
		temporaryDirectories.push(targetDir);

		applyCloudflareTarget({ targetDir, projectName: "edge-api" });

		const pkg = JSON.parse(
			fs.readFileSync(path.join(targetDir, "package.json"), "utf8"),
		);
		expect(pkg.main).toBeUndefined();
		expect(pkg.scripts["example:circuit-breaker"]).toBeUndefined();
		expect(pkg.scripts["example:service-discovery"]).toBeUndefined();
		expect(pkg.scripts["example:service-client"]).toBeUndefined();
		expect(pkg.scripts["example:full-di-api"]).toBeUndefined();
		expect(pkg.devDependencies["@expressots/cli"]).toBeUndefined();
		expect(pkg.devDependencies.tsx).toBeUndefined();

		for (const nodeOnlyPath of [
			"AGENTS.md",
			".env.example",
			"examples",
			"expressots.config.ts",
			"tsconfig.build.json",
		]) {
			expect(fs.existsSync(path.join(targetDir, nodeOnlyPath))).toBe(
				false,
			);
		}
	});

	it("configures generated Worker tooling artifacts", () => {
		const targetDir = createMicroFixture();
		temporaryDirectories.push(targetDir);

		applyCloudflareTarget({ targetDir, projectName: "edge-api" });

		const gitignore = fs.readFileSync(
			path.join(targetDir, ".gitignore"),
			"utf8",
		);
		expect(gitignore).toContain("/.wrangler/");
		expect(gitignore).toContain("/worker-configuration.d.ts");
		expect(gitignore).not.toContain("!.env.example");

		const tsconfig = JSON.parse(
			fs.readFileSync(path.join(targetDir, "tsconfig.json"), "utf8"),
		);
		expect(tsconfig.include).toEqual([
			"src/**/*.ts",
			"test/**/*.ts",
			"worker-configuration.d.ts",
		]);
	});

	it.each([
		[
			"npm",
			[
				"npm install",
				"npm run dev",
				"npm run build",
				"npx wrangler login",
				"npm run deploy",
			],
		],
		[
			"yarn",
			[
				"yarn install",
				"yarn dev",
				"yarn build",
				"yarn wrangler login",
				"yarn deploy",
			],
		],
		[
			"pnpm",
			[
				"pnpm install",
				"pnpm run dev",
				"pnpm run build",
				"pnpm exec wrangler login",
				"pnpm run deploy",
			],
		],
		[
			"bun",
			[
				"bun install",
				"bun run dev",
				"bun run build",
				"bunx wrangler login",
				"bun run deploy",
			],
		],
	])(
		"replaces Node instructions with a %s-specific Worker guide",
		(packageManager, commands) => {
			const targetDir = createMicroFixture();
			temporaryDirectories.push(targetDir);
			const options = {
				targetDir,
				projectName: "edge-api",
				packageManager,
			};

			applyCloudflareTarget(options);

			const readme = fs.readFileSync(
				path.join(targetDir, "README.md"),
				"utf8",
			);
			for (const command of commands) {
				expect(readme).toContain(command);
			}
			expect(readme).toContain("wrangler dev");
			expect(readme).toContain("ex dev");
			expect(readme).toContain("dry-run");
			expect(readme).toContain("nodejs_compat");
			expect(readme).toContain("autoParseJson: false");
			expect(readme).toContain("app.setErrorHandler()");
			expect(readme).not.toContain("## Learn more");
			expect(readme).not.toMatch(/\bprod\b/);
			expect(readme).not.toContain("3000");
			expect(readme).not.toContain("app.listen(3000)");
			expect(readme).not.toContain(
				"https://expresso-ts.com/docs/guides/micro-api",
			);
		},
	);
});
