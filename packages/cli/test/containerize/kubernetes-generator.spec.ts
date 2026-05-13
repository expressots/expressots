/**
 * Kubernetes generator tests.
 *
 * Same isolation pattern as the other containerize specs: tmp cwd
 * + bypass remote template fetch via mock.
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
		loadKubernetesTemplate: async (
			_type: string,
			_vars: unknown,
			fallback: () => string,
		) => ({ content: fallback(), source: "embedded" }),
		logTemplateSource: jest.fn(),
	};
});

import { generateKubernetesConfigs } from "../../src/containerize/generators/kubernetes-generator";
import type { ProjectAnalysis } from "../../src/containerize/analyzers/project-analyzer";

let tmpDir: string;
let originalCwd: string;
let logSpy: jest.SpyInstance;

beforeEach(() => {
	originalCwd = process.cwd();
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ex-cli-k8s-"));
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

describe("generateKubernetesConfigs", () => {
	test("creates k8s/ directory with deployment, service, and configmap manifests", async () => {
		await generateKubernetesConfigs(
			{ environment: "production", preset: "standard" },
			makeAnalysis(),
		);

		const k8sDir = path.join(tmpDir, "k8s");
		expect(fs.existsSync(k8sDir)).toBe(true);
		expect(
			fs.existsSync(path.join(k8sDir, "deployment.yaml")),
		).toBe(true);
		expect(fs.existsSync(path.join(k8sDir, "service.yaml"))).toBe(true);
		expect(fs.existsSync(path.join(k8sDir, "configmap.yaml"))).toBe(true);
	});

	test("deployment manifest includes liveness/readiness probes and resource limits", async () => {
		await generateKubernetesConfigs(
			{ environment: "production", preset: "standard" },
			makeAnalysis(),
		);

		const deployment = fs.readFileSync(
			path.join(tmpDir, "k8s", "deployment.yaml"),
			"utf-8",
		);

		expect(deployment).toContain("kind: Deployment");
		expect(deployment).toContain("livenessProbe:");
		expect(deployment).toContain("readinessProbe:");
		expect(deployment).toContain("resources:");
		expect(deployment).toContain("memory:");
		expect(deployment).toContain("cpu:");
	});

	test("deployment honors analyzed port for container, probes, and env", async () => {
		await generateKubernetesConfigs(
			{ environment: "production", preset: "standard" },
			makeAnalysis({ port: 4567 }),
		);

		const deployment = fs.readFileSync(
			path.join(tmpDir, "k8s", "deployment.yaml"),
			"utf-8",
		);
		expect(deployment).toContain("containerPort: 4567");
		expect(deployment).toContain('value: "4567"');
		// Probes should hit the same port.
		expect(deployment).toMatch(/port: 4567/);
	});

	test("service manifest exposes a LoadBalancer routing to the analyzed port", async () => {
		await generateKubernetesConfigs(
			{ environment: "production", preset: "standard" },
			makeAnalysis({ port: 8080 }),
		);

		const service = fs.readFileSync(
			path.join(tmpDir, "k8s", "service.yaml"),
			"utf-8",
		);
		expect(service).toContain("kind: Service");
		expect(service).toContain("type: LoadBalancer");
		expect(service).toContain("targetPort: 8080");
	});

	test("configmap manifest is valid YAML scaffolding", async () => {
		await generateKubernetesConfigs(
			{ environment: "production", preset: "standard" },
			makeAnalysis(),
		);

		const cm = fs.readFileSync(
			path.join(tmpDir, "k8s", "configmap.yaml"),
			"utf-8",
		);
		expect(cm).toContain("kind: ConfigMap");
		expect(cm).toContain("name: app-config");
	});
});
