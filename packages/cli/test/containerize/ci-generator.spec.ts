/**
 * Tests for the containerize CD generator
 * (`expressots containerize --include-ci`).
 *
 * Scope: this generator is the CD half (Docker build/push/deploy).
 * The CI half lives under `src/cicd/generators/*` and has its own
 * test suite. Both share the package-manager command helpers.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { generateCIConfig } from "../../src/containerize/generators/ci-generator";
import type { ProjectAnalysis } from "../../src/containerize/analyzers/project-analyzer";

let tmpDir: string;
let originalCwd: string;
let logSpy: jest.SpyInstance;

beforeEach(() => {
	originalCwd = process.cwd();
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ex-cli-cd-"));
	process.chdir(tmpDir);
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

describe("generateCIConfig — GitHub Actions (CD)", () => {
	test("writes .github/workflows/cd-docker.yml (NOT docker-deploy.yml or ci.yml)", async () => {
		await generateCIConfig(
			{
				environment: "production",
				preset: "standard",
				ciPlatform: "github",
				ciStrategy: "comprehensive",
				includeSecurityScans: true,
				includeE2E: false,
			},
			makeAnalysis(),
		);

		const cdFile = path.join(
			tmpDir,
			".github",
			"workflows",
			"cd-docker.yml",
		);
		expect(fs.existsSync(cdFile)).toBe(true);

		// Make sure the legacy filename is gone (regression guard for
		// the rename in the hardening plan §6).
		expect(
			fs.existsSync(
				path.join(
					tmpDir,
					".github",
					"workflows",
					"docker-deploy.yml",
				),
			),
		).toBe(false);
		// CI workflow is owned by `cicd init`, not this generator.
		expect(
			fs.existsSync(
				path.join(tmpDir, ".github", "workflows", "ci.yml"),
			),
		).toBe(false);
	});

	test("workflow body documents its CD scope and points at `cicd init` for CI", async () => {
		await generateCIConfig(
			{
				environment: "production",
				preset: "standard",
				ciPlatform: "github",
			},
			makeAnalysis(),
		);

		const yml = fs.readFileSync(
			path.join(tmpDir, ".github", "workflows", "cd-docker.yml"),
			"utf-8",
		);
		expect(yml).toMatch(/CD Pipeline/);
		expect(yml).toMatch(/expressots cicd init github/);
	});

	test("install steps respect detected package manager", async () => {
		await generateCIConfig(
			{
				environment: "production",
				preset: "standard",
				ciPlatform: "github",
			},
			makeAnalysis({ packageManager: "pnpm" }),
		);
		const yml = fs.readFileSync(
			path.join(tmpDir, ".github", "workflows", "cd-docker.yml"),
			"utf-8",
		);
		expect(yml).toContain("pnpm install --frozen-lockfile");
		// Should not silently default to npm ci when pm is pnpm.
		expect(yml).not.toMatch(/run:\s+npm ci\b/);
	});

	test("triggers on push to main and develop, plus PRs to main", async () => {
		await generateCIConfig(
			{
				environment: "production",
				preset: "standard",
				ciPlatform: "github",
			},
			makeAnalysis(),
		);
		const yml = fs.readFileSync(
			path.join(tmpDir, ".github", "workflows", "cd-docker.yml"),
			"utf-8",
		);
		expect(yml).toContain("branches: [main, develop]");
		expect(yml).toMatch(/pull_request:\s+branches: \[main\]/);
	});
});

describe("generateCIConfig — non-GitHub platforms", () => {
	test("gitlab platform writes the canonical .gitlab-ci.yml", async () => {
		await generateCIConfig(
			{
				environment: "production",
				preset: "standard",
				ciPlatform: "gitlab",
			},
			makeAnalysis(),
		);
		expect(fs.existsSync(path.join(tmpDir, ".gitlab-ci.yml"))).toBe(true);
	});

	test("jenkins platform writes a Jenkinsfile at the project root", async () => {
		await generateCIConfig(
			{
				environment: "production",
				preset: "standard",
				ciPlatform: "jenkins",
			},
			makeAnalysis(),
		);
		expect(fs.existsSync(path.join(tmpDir, "Jenkinsfile"))).toBe(true);
	});

	test("non-github platforms emit a single-pipeline-config warning", async () => {
		await generateCIConfig(
			{
				environment: "production",
				preset: "standard",
				ciPlatform: "gitlab",
			},
			makeAnalysis(),
		);
		const messages = logSpy.mock.calls
			.map((c) => c.join(" "))
			.join("\n");
		expect(messages).toMatch(/single canonical pipeline config/);
	});
});
