/**
 * Tests for `buildDockerVars`, which feeds the remote `.tpl` Dockerfiles.
 * These variables must stay aligned with the embedded generator so a
 * project gets the same image regardless of whether the remote template
 * is reachable.
 */

import { buildDockerVars } from "../../src/containerize/generators/template-loader";
import type { ProjectAnalysis } from "../../src/containerize/analyzers/project-analyzer";

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
		hasNativeDependencies: false,
		...(overrides as ProjectAnalysis),
	} as ProjectAnalysis;
}

describe("buildDockerVars", () => {
	test("npm project resolves Node alpine images and production NODE_ENV", () => {
		const vars = buildDockerVars(
			makeAnalysis({ packageManager: "npm", nodeVersion: "22" }),
			"dist/src/main.js",
			{ environment: "production" },
		);
		expect(vars.builderImage).toBe("node:22-alpine");
		expect(vars.runtimeImage).toBe("node:22-alpine");
		expect(vars.nodeEnv).toBe("production");
		expect(vars.nonRootUserSetup).toContain("addgroup");
	});

	test("bun project uses the oven/bun builder but a Node runtime", () => {
		const vars = buildDockerVars(
			makeAnalysis({ packageManager: "bun", nodeVersion: "22" }),
			"dist/src/main.js",
		);
		expect(vars.builderImage).toBe("oven/bun:1-alpine");
		expect(vars.runtimeImage).toBe("node:22-alpine");
		// Bun needs no PM setup (oven/bun ships bun + bunx).
		expect(vars.pmSetup).toBe("");
	});

	test("debian preset variant resolves Node (non-alpine) and useradd", () => {
		const vars = buildDockerVars(
			makeAnalysis({ packageManager: "npm", nodeVersion: "20" }),
			"dist/src/main.js",
			{ preset: { baseVariant: "debian" } },
		);
		expect(vars.builderImage).toBe("node:20");
		expect(vars.runtimeImage).toBe("node:20");
		expect(vars.nonRootUserSetup).toContain("useradd");
	});

	test("staging environment is preserved in NODE_ENV", () => {
		const vars = buildDockerVars(makeAnalysis(), "dist/src/main.js", {
			environment: "staging",
		});
		expect(vars.nodeEnv).toBe("staging");
	});

	test("native deps emit apt-get on debian, apk on alpine", () => {
		const alpine = buildDockerVars(
			makeAnalysis({ hasNativeDependencies: true }),
			"dist/src/main.js",
		);
		expect(alpine.nativeDepsSetup).toContain("apk add --no-cache python3");

		const debian = buildDockerVars(
			makeAnalysis({ hasNativeDependencies: true }),
			"dist/src/main.js",
			{ preset: { baseVariant: "debian" } },
		);
		expect(debian.nativeDepsSetup).toContain("apt-get install");
	});

	test("back-compat: a bare string still sets the package manager", () => {
		const vars = buildDockerVars(undefined, "dist/src/main.js", "pnpm");
		expect(vars.packageManager).toBe("pnpm");
	});
});
