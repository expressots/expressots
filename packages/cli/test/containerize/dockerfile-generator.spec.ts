/**
 * Dockerfile generator tests.
 *
 * The generator writes files to `process.cwd()`, so each test runs
 * inside an isolated tmp directory. We bypass the remote-template
 * fetch by mocking `template-loader.loadDockerTemplate` to always
 * call the embedded fallback — that way the assertions cover what
 * the CLI emits when offline / when no remote template overrides
 * the local one.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

jest.mock("../../src/containerize/generators/template-loader", () => {
	const actual = jest.requireActual(
		"../../src/containerize/generators/template-loader",
	);
	return {
		...actual,
		loadDockerTemplate: async (
			_type: string,
			_vars: unknown,
			fallback: () => string,
		) => ({ content: fallback(), source: "embedded" }),
		logTemplateSource: jest.fn(),
	};
});

import { generateDockerfiles } from "../../src/containerize/generators/dockerfile-generator";
import type { ProjectAnalysis } from "../../src/containerize/analyzers/project-analyzer";

let tmpDir: string;
let originalCwd: string;
let logSpy: jest.SpyInstance;

beforeEach(() => {
	originalCwd = process.cwd();
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ex-cli-docker-"));
	process.chdir(tmpDir);

	// Minimal package.json + tsconfig so the generator's helpers
	// (entryPoint detection, package.json updates) don't blow up.
	fs.writeFileSync(
		path.join(tmpDir, "package.json"),
		JSON.stringify(
			{
				name: "test-app",
				version: "1.0.0",
				dependencies: {},
			},
			null,
			2,
		),
	);
	fs.writeFileSync(
		path.join(tmpDir, "tsconfig.build.json"),
		JSON.stringify({
			compilerOptions: { outDir: "./dist", rootDir: "./" },
		}),
	);

	logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
	logSpy.mockRestore();
	process.chdir(originalCwd);
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

function makeAnalysis(
	overrides: Partial<ProjectAnalysis> = {},
): ProjectAnalysis {
	return {
		nodeVersion: "22",
		packageManager: "npm",
		dependencies: [],
		devDependencies: [],
		controllers: [],
		hasDatabase: false,
		hasRedis: false,
		hasCors: false,
		estimatedMemory: "256Mi",
		estimatedCpu: "250m",
		healthCheckPaths: [],
		port: 3000,
		hasLocalDependencies: false,
		localDependencyPaths: [],
		bootstrapConfig: {
			hasEnvFileConfig: false,
			skipFileLoading: false,
			ciMode: undefined,
			envFiles: {},
			requiredVariables: [],
			autoCreateTemplate: false,
			currentEnvironment: undefined,
			existingEnvFiles: [],
			missingEnvFiles: [],
			isContainerReady: true,
			recommendations: [],
		} as ProjectAnalysis["bootstrapConfig"],
		...overrides,
	};
}

describe("generateDockerfiles — package manager wiring", () => {
	test.each([
		[
			"npm",
			{
				install: "RUN npm ci",
				build: "RUN npm run build",
				prune: "RUN npm prune --production",
				devCmd: 'CMD ["npm", "run", "dev"]',
			},
		],
		[
			"pnpm",
			{
				install: "RUN pnpm install",
				build: "RUN pnpm run build",
				prune: "RUN pnpm install --prod --no-frozen-lockfile",
				devCmd: 'CMD ["pnpm", "run", "dev"]',
			},
		],
		[
			"yarn",
			{
				install: "RUN yarn install",
				build: "RUN yarn build",
				prune: "RUN yarn install --production",
				devCmd: 'CMD ["yarn", "dev"]',
			},
		],
		[
			"bun",
			{
				install: "RUN bun install",
				build: "RUN bun run build",
				prune: "RUN bun install --production",
				devCmd: 'CMD ["bun", "run", "dev"]',
			},
		],
	])(
		"%s emits matching install/build/prune/CMD lines",
		async (pm, expected) => {
			await generateDockerfiles(
				{ environment: "all", preset: "standard" },
				makeAnalysis({
					packageManager: pm as ProjectAnalysis["packageManager"],
				}),
			);

			const dev = fs.readFileSync(
				path.join(tmpDir, "Dockerfile.development"),
				"utf-8",
			);
			const prod = fs.readFileSync(
				path.join(tmpDir, "Dockerfile"),
				"utf-8",
			);

			expect(dev).toContain(expected.devCmd);
			expect(prod).toContain(expected.install);
			expect(prod).toContain(expected.build);
			expect(prod).toContain(expected.prune);
		},
	);

	test("never leaks hardcoded npm commands when pm=pnpm", async () => {
		await generateDockerfiles(
			{ environment: "production", preset: "standard" },
			makeAnalysis({ packageManager: "pnpm" }),
		);

		const prod = fs.readFileSync(path.join(tmpDir, "Dockerfile"), "utf-8");
		// Use whole-word checks so substrings of `pnpm` don't trigger
		// false positives. The production Dockerfile itself must not
		// reference npm install/build commands as standalone tokens.
		expect(prod).not.toMatch(/(^|\s)npm\s+(install|ci|run)\b/);
	});
});

describe("generateDockerfiles — environment handling", () => {
	test("staging maps to production template with NODE_ENV=staging", async () => {
		await generateDockerfiles(
			{ environment: "staging", preset: "standard" },
			makeAnalysis(),
		);

		const staging = fs.readFileSync(
			path.join(tmpDir, "Dockerfile.staging"),
			"utf-8",
		);

		expect(staging).toContain("ENV NODE_ENV=staging");
		// Production-style scaffolding markers (multi-stage builder
		// stage + prune step) should be present — staging used to
		// silently fall through to a dev Dockerfile.
		expect(staging).toMatch(/AS builder/);
		expect(staging).toContain("RUN npm prune --production");
	});

	test("production sets NODE_ENV=production and uses multi-stage build", async () => {
		await generateDockerfiles(
			{ environment: "production", preset: "standard" },
			makeAnalysis(),
		);

		const prod = fs.readFileSync(path.join(tmpDir, "Dockerfile"), "utf-8");
		expect(prod).toContain("ENV NODE_ENV=production");
		expect(prod).toMatch(/Stage 1: Builder/);
		expect(prod).toMatch(/Stage 2: Production/);
	});

	test("development emits a single-stage Dockerfile with hot-reload CMD", async () => {
		await generateDockerfiles(
			{ environment: "development", preset: "standard" },
			makeAnalysis(),
		);

		const dev = fs.readFileSync(
			path.join(tmpDir, "Dockerfile.development"),
			"utf-8",
		);
		expect(dev).toContain("ENV NODE_ENV=development");
		expect(dev).toContain("EXPOSE 9229");
		expect(dev).toContain('CMD ["npm", "run", "dev"]');
		expect(dev).not.toMatch(/AS builder/);
	});

	test("environment=development also writes a production Dockerfile", async () => {
		await generateDockerfiles(
			{ environment: "development", preset: "standard" },
			makeAnalysis(),
		);

		expect(
			fs.existsSync(path.join(tmpDir, "Dockerfile.development")),
		).toBe(true);
		expect(fs.existsSync(path.join(tmpDir, "Dockerfile"))).toBe(true);
	});
});

describe("generateDockerfiles — auxiliary outputs", () => {
	test("always writes .dockerignore", async () => {
		await generateDockerfiles(
			{ environment: "production", preset: "standard" },
			makeAnalysis(),
		);
		const ignore = fs.readFileSync(
			path.join(tmpDir, ".dockerignore"),
			"utf-8",
		);
		expect(ignore).toContain("node_modules/");
		expect(ignore).toContain("dist/");
	});

	test("local dependencies path: docker:setup script invocation matches package manager", async () => {
		await generateDockerfiles(
			{ environment: "production", preset: "standard" },
			makeAnalysis({
				packageManager: "pnpm",
				hasLocalDependencies: true,
				localDependencyPaths: ["./libs/shared"],
			}),
		);

		const pkg = JSON.parse(
			fs.readFileSync(path.join(tmpDir, "package.json"), "utf-8"),
		);
		// The composite docker:build script should call the project's
		// package manager (pnpm), not hardcoded npm.
		expect(pkg.scripts["docker:build"]).toMatch(/^pnpm run docker:setup/);
	});

	test("health check is included when preset enables it", async () => {
		await generateDockerfiles(
			{ environment: "production", preset: "secure" },
			makeAnalysis(),
		);

		const prod = fs.readFileSync(path.join(tmpDir, "Dockerfile"), "utf-8");
		expect(prod).toContain("HEALTHCHECK");
	});
});
