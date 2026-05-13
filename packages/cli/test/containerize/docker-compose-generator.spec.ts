/**
 * Docker Compose generator tests.
 *
 * Same isolation pattern as the Dockerfile suite: tmp cwd + bypass
 * the remote template fetch via a mock so we exclusively test the
 * embedded fallback content.
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

import { generateDockerCompose } from "../../src/containerize/generators/docker-compose-generator";
import type { ProjectAnalysis } from "../../src/containerize/analyzers/project-analyzer";

let tmpDir: string;
let originalCwd: string;
let logSpy: jest.SpyInstance;

beforeEach(() => {
	originalCwd = process.cwd();
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ex-cli-compose-"));
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

describe("generateDockerCompose", () => {
	test("production compose references the production Dockerfile", async () => {
		await generateDockerCompose(
			{ environment: "production", preset: "standard" },
			makeAnalysis(),
		);
		const compose = fs.readFileSync(
			path.join(tmpDir, "docker-compose.yml"),
			"utf-8",
		);
		expect(compose).toMatch(/dockerfile: Dockerfile\b/);
		expect(compose).toContain("NODE_ENV=production");
		expect(compose).toContain("expressots-app-production");
	});

	test("development compose mounts source for hot reload and references Dockerfile.development", async () => {
		await generateDockerCompose(
			{ environment: "development", preset: "standard" },
			makeAnalysis(),
		);
		const compose = fs.readFileSync(
			path.join(tmpDir, "docker-compose.development.yml"),
			"utf-8",
		);
		expect(compose).toContain("dockerfile: Dockerfile.development");
		expect(compose).toContain("./src:/app/src");
		expect(compose).toContain("9229:9229");
		expect(compose).toContain("NODE_ENV=development");
	});

	test("environment=development also produces a production compose file", async () => {
		await generateDockerCompose(
			{ environment: "development", preset: "standard" },
			makeAnalysis(),
		);
		expect(
			fs.existsSync(path.join(tmpDir, "docker-compose.development.yml")),
		).toBe(true);
		expect(fs.existsSync(path.join(tmpDir, "docker-compose.yml"))).toBe(
			true,
		);
	});

	test("port mapping uses analyzed port", async () => {
		await generateDockerCompose(
			{ environment: "production", preset: "standard" },
			makeAnalysis({ port: 4321 }),
		);
		const compose = fs.readFileSync(
			path.join(tmpDir, "docker-compose.yml"),
			"utf-8",
		);
		expect(compose).toContain('"4321:4321"');
		expect(compose).toContain("PORT=4321");
	});

	test("includes a postgres service when database deps are detected", async () => {
		await generateDockerCompose(
			{ environment: "production", preset: "standard" },
			makeAnalysis({ hasDatabase: true }),
		);
		const compose = fs.readFileSync(
			path.join(tmpDir, "docker-compose.yml"),
			"utf-8",
		);
		expect(compose).toContain("image: postgres:");
		expect(compose).toContain("postgres_data:");
		expect(compose).toContain("DATABASE_URL=postgresql://");
	});

	test("includes a redis service when redis deps are detected", async () => {
		await generateDockerCompose(
			{ environment: "production", preset: "standard" },
			makeAnalysis({ hasRedis: true }),
		);
		const compose = fs.readFileSync(
			path.join(tmpDir, "docker-compose.yml"),
			"utf-8",
		);
		expect(compose).toContain("image: redis:");
		expect(compose).toContain("REDIS_URL=redis://");
	});

	test("omits database and redis services when not detected", async () => {
		await generateDockerCompose(
			{ environment: "production", preset: "standard" },
			makeAnalysis(),
		);
		const compose = fs.readFileSync(
			path.join(tmpDir, "docker-compose.yml"),
			"utf-8",
		);
		expect(compose).not.toContain("image: postgres:");
		expect(compose).not.toContain("image: redis:");
	});
});
