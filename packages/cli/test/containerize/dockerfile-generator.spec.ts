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
		yarnBerry: false,
		hasPnpmWorkspace: false,
		hasWorkspaces: false,
		workspacePackagePaths: [],
		bunLockfileType: undefined,
		hasNativeDependencies: false,
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
				prune: "RUN npm ci --omit=dev",
				devCmd: 'CMD ["npm", "run", "dev"]',
			},
		],
		[
			"pnpm",
			{
				install: "RUN pnpm install --frozen-lockfile",
				build: "RUN pnpm run build",
				prune: "RUN pnpm install --prod --frozen-lockfile",
				devCmd: 'CMD ["pnpm", "run", "dev"]',
			},
		],
		[
			"yarn",
			{
				install: "RUN yarn install --frozen-lockfile",
				build: "RUN yarn build",
				prune: "RUN yarn install --production --frozen-lockfile --ignore-scripts --prefer-offline",
				devCmd: 'CMD ["yarn", "dev"]',
			},
		],
		[
			"bun",
			{
				install: "RUN bun install --frozen-lockfile",
				build: "RUN bun run build",
				prune: "RUN bun install --frozen-lockfile --production",
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
		expect(staging).toContain("RUN npm ci --omit=dev");
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

		expect(fs.existsSync(path.join(tmpDir, "Dockerfile.development"))).toBe(
			true,
		);
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

	test("production Dockerfile uses lockfile-free install when local deps exist", async () => {
		await generateDockerfiles(
			{ environment: "production", preset: "standard" },
			makeAnalysis({
				hasLocalDependencies: true,
				localDependencyPaths: ["./libs/core-1.0.0.tgz"],
			}),
		);

		const prod = fs.readFileSync(path.join(tmpDir, "Dockerfile"), "utf-8");
		expect(prod).toContain("RUN npm install");
		expect(prod).not.toContain("RUN npm ci");
	});

	test("production Dockerfile does NOT copy host package-lock.json when local deps exist", async () => {
		// Regression guard: the host lockfile pins `file:../...` paths
		// that don't exist inside the container. Even with `npm install`
		// (lockfile-free flag), npm still uses a present lockfile to
		// resolve nested dependency locations, leading to ENOENT
		// errors like `node_modules/@expressots/expressots/...tgz`.
		await generateDockerfiles(
			{ environment: "production", preset: "standard" },
			makeAnalysis({
				hasLocalDependencies: true,
				localDependencyPaths: ["./libs/core-1.0.0.tgz"],
			}),
		);

		const prod = fs.readFileSync(path.join(tmpDir, "Dockerfile"), "utf-8");
		expect(prod).not.toMatch(/^COPY package-lock\.json\*?\s/m);
	});

	test("production Dockerfile DOES copy package-lock.json when no local deps", async () => {
		await generateDockerfiles(
			{ environment: "production", preset: "standard" },
			makeAnalysis(),
		);

		const prod = fs.readFileSync(path.join(tmpDir, "Dockerfile"), "utf-8");
		expect(prod).toMatch(/COPY package-lock\.json\*/);
	});

	test("docker-setup.js writes npm `overrides` for transitive file: deps", async () => {
		// Regression guard: published tarballs of unpublished local
		// packages bake in their own `file:../...` references (e.g.
		// core's package.json depends on shared via a relative path).
		// Without npm `overrides`, those transitive paths resolve from
		// inside `node_modules/<pkg>/` and fail with ENOENT inside
		// the container. The setup script must add overrides so npm
		// uses the flattened `.docker-deps/` paths everywhere.
		await generateDockerfiles(
			{ environment: "production", preset: "standard" },
			makeAnalysis({
				hasLocalDependencies: true,
				localDependencyPaths: ["./libs/core-1.0.0.tgz"],
			}),
		);

		const setupScript = fs.readFileSync(
			path.join(tmpDir, "docker-setup.js"),
			"utf-8",
		);
		expect(setupScript).toContain("overrides[key] = newPath");
		expect(setupScript).toContain("pkg.overrides");
	});

	test("docker-setup.js produces package.docker.json with overrides when run", async () => {
		// Functional test: actually execute the generated script and
		// verify the rewritten package.docker.json has both rewritten
		// dependency paths AND a matching `overrides` block so npm
		// will resolve transitive file: refs to .docker-deps/.
		const { execFileSync } = await import("child_process");

		// Pretend we have a tarball at libs/foo-1.0.0.tgz on the host.
		fs.mkdirSync(path.join(tmpDir, "libs"), { recursive: true });
		fs.writeFileSync(path.join(tmpDir, "libs/foo-1.0.0.tgz"), "");

		// Override the minimal package.json with one that has a file:
		// dep — the generator's beforeEach writes a stub without deps.
		fs.writeFileSync(
			path.join(tmpDir, "package.json"),
			JSON.stringify(
				{
					name: "test-app",
					version: "1.0.0",
					dependencies: {
						"@scope/foo": "file:./libs/foo-1.0.0.tgz",
					},
				},
				null,
				2,
			),
		);

		await generateDockerfiles(
			{ environment: "production", preset: "standard" },
			makeAnalysis({
				hasLocalDependencies: true,
				localDependencyPaths: ["./libs/foo-1.0.0.tgz"],
			}),
		);

		// Execute the generated script
		execFileSync("node", ["docker-setup.js"], {
			cwd: tmpDir,
			stdio: "ignore",
		});

		const packageDocker = JSON.parse(
			fs.readFileSync(path.join(tmpDir, "package.docker.json"), "utf-8"),
		);

		expect(packageDocker.dependencies["@scope/foo"]).toBe(
			"file:.docker-deps/foo-1.0.0.tgz",
		);
		expect(packageDocker.overrides).toBeDefined();
		expect(packageDocker.overrides["@scope/foo"]).toBe(
			"file:.docker-deps/foo-1.0.0.tgz",
		);
	});

	test("monorepo: copies each workspace package manifest before install", async () => {
		await generateDockerfiles(
			{ environment: "production", preset: "standard" },
			makeAnalysis({
				packageManager: "pnpm",
				hasWorkspaces: true,
				hasPnpmWorkspace: true,
				workspacePackagePaths: ["apps/api", "packages/shared"],
			}),
		);

		const prod = fs.readFileSync(path.join(tmpDir, "Dockerfile"), "utf-8");
		expect(prod).toContain("COPY apps/api/package.json ./apps/api/");
		expect(prod).toContain(
			"COPY packages/shared/package.json ./packages/shared/",
		);
		// The workspace config file is still copied for pnpm.
		expect(prod).toContain("COPY pnpm-workspace.yaml ./");
	});

	test.each([
		["yarn", "pkg.resolutions", "resolutions"],
		["pnpm", "pkg.pnpm.overrides", "pnpm.overrides"],
		["bun", "pkg.overrides", "overrides"],
		["npm", "pkg.overrides", "overrides"],
	])(
		"docker-setup.js for %s writes the correct dependency-pinning field",
		async (pm, expectedCode, expectedLabel) => {
			await generateDockerfiles(
				{ environment: "production", preset: "standard" },
				makeAnalysis({
					packageManager: pm as ProjectAnalysis["packageManager"],
					hasLocalDependencies: true,
					localDependencyPaths: ["./libs/core-1.0.0.tgz"],
				}),
			);

			const setupScript = fs.readFileSync(
				path.join(tmpDir, "docker-setup.js"),
				"utf-8",
			);
			expect(setupScript).toContain(expectedCode);
			expect(setupScript).toContain(`Added ${expectedLabel} for`);
		},
	);

	test("health check is included when preset enables it", async () => {
		await generateDockerfiles(
			{ environment: "production", preset: "secure" },
			makeAnalysis(),
		);

		const prod = fs.readFileSync(path.join(tmpDir, "Dockerfile"), "utf-8");
		expect(prod).toContain("HEALTHCHECK");
	});

	test("standard preset defaults to non-root user and health check", async () => {
		await generateDockerfiles(
			{ environment: "production", preset: "standard" },
			makeAnalysis(),
		);

		const prod = fs.readFileSync(path.join(tmpDir, "Dockerfile"), "utf-8");
		expect(prod).toContain("USER nodejs");
		expect(prod).toContain("HEALTHCHECK");
		expect(prod).toMatch(/addgroup.*nodejs/);
	});

	test("bun project uses oven/bun builder and node runtime in multi-stage", async () => {
		await generateDockerfiles(
			{ environment: "production", preset: "standard" },
			makeAnalysis({ packageManager: "bun" }),
		);

		const prod = fs.readFileSync(path.join(tmpDir, "Dockerfile"), "utf-8");
		// Builder stage uses the official Bun image.
		expect(prod).toMatch(/FROM oven\/bun:.*AS builder/);
		// Production stage still uses Node (runtime is `node dist/...`).
		expect(prod).toMatch(/Stage 2: Production[\s\S]*FROM node:/);
		// No `npm install -g bun` since the builder base already has it.
		expect(prod).not.toContain("npm install -g bun");
	});

	test("bun dev Dockerfile uses oven/bun as base image", async () => {
		await generateDockerfiles(
			{ environment: "development", preset: "standard" },
			makeAnalysis({ packageManager: "bun" }),
		);

		const dev = fs.readFileSync(
			path.join(tmpDir, "Dockerfile.development"),
			"utf-8",
		);
		expect(dev).toMatch(/FROM oven\/bun:/);
		expect(dev).not.toContain("npm install -g bun");
	});

	test("native dependencies trigger build tools installation in builder", async () => {
		await generateDockerfiles(
			{ environment: "production", preset: "standard" },
			makeAnalysis({
				packageManager: "bun",
				dependencies: ["better-sqlite3", "@expressots/core"],
				hasNativeDependencies: true,
			}),
		);

		const prod = fs.readFileSync(path.join(tmpDir, "Dockerfile"), "utf-8");
		expect(prod).toContain("apk add --no-cache python3 make g++");
	});

	test("no native build tools when hasNativeDependencies is false", async () => {
		await generateDockerfiles(
			{ environment: "production", preset: "standard" },
			makeAnalysis({ packageManager: "bun" }),
		);

		const prod = fs.readFileSync(path.join(tmpDir, "Dockerfile"), "utf-8");
		expect(prod).not.toContain("python3 make g++");
		// The Bun builder needs no apk setup: oven/bun ships bun + bunx,
		// and the CLI build step runs `bunx tsc` (no Node/npm required).
		expect(prod).not.toContain("apk add");
	});

	test("native build tools use apt-get on a Debian (dev preset) image", async () => {
		// The `dev` preset resolves to a Debian Node image (node:<major>),
		// so the native-addon toolchain must be installed via apt-get.
		await generateDockerfiles(
			{ environment: "development", preset: "dev" },
			makeAnalysis({
				packageManager: "npm",
				dependencies: ["better-sqlite3"],
				hasNativeDependencies: true,
			}),
		);

		const dev = fs.readFileSync(
			path.join(tmpDir, "Dockerfile.development"),
			"utf-8",
		);
		expect(dev).toMatch(/FROM node:\d+\b/);
		expect(dev).toContain(
			"apt-get install -y --no-install-recommends python3 make g++",
		);
		expect(dev).not.toContain("apk add");
	});
});
