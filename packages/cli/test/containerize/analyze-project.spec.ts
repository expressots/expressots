/**
 * Integration-style unit tests for analyzeProject().
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

jest.mock("../../src/utils/compiler", () => ({
	__esModule: true,
	default: {
		loadConfig: jest.fn().mockResolvedValue({ port: 4000 }),
	},
}));

import { analyzeProject } from "../../src/containerize/analyzers/project-analyzer";

let originalCwd: string;
let tmpDir: string;

beforeEach(() => {
	originalCwd = process.cwd();
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ex-cli-analyze-"));
	process.chdir(tmpDir);
});

afterEach(() => {
	process.chdir(originalCwd);
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeBaseProject(extra: Record<string, unknown> = {}): void {
	fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
	fs.writeFileSync(
		path.join(tmpDir, "package.json"),
		JSON.stringify(
			{
				name: "test-app",
				engines: { node: ">=20" },
				dependencies: {
					pg: "8.0.0",
					ioredis: "5.0.0",
					cors: "2.8.5",
					"local-pkg": "file:../packages/local-pkg",
					"bcrypt": "5.0.0",
				},
				devDependencies: {},
				...extra,
			},
			null,
			2,
		),
	);
	fs.writeFileSync(
		path.join(tmpDir, "src", "health.controller.ts"),
		`
import { Controller } from "@expressots/core";
@Controller("/health")
export class HealthController {
  get() { return "/health"; }
}
`,
	);
	fs.writeFileSync(
		path.join(tmpDir, "src", "main.ts"),
		`
import { bootstrap } from "@expressots/core";
bootstrap({
  envFileConfig: {
    skipFileLoading: true,
    files: { development: ".env.development" },
    required: ["DATABASE_URL"],
  },
});
`,
	);
}

describe("analyzeProject", () => {
	it("throws when package.json is missing", async () => {
		await expect(analyzeProject()).rejects.toThrow(/package\.json not found/);
	});

	it("detects stack, toolchain, and bootstrap metadata", async () => {
		writeBaseProject();
		fs.writeFileSync(path.join(tmpDir, "pnpm-lock.yaml"), "lockfileVersion: 6\n");
		fs.writeFileSync(
			path.join(tmpDir, "pnpm-workspace.yaml"),
			"packages:\n  - packages/*\n",
		);
		fs.mkdirSync(path.join(tmpDir, "packages", "pkg-a"), { recursive: true });
		fs.writeFileSync(
			path.join(tmpDir, "packages", "pkg-a", "package.json"),
			'{"name":"pkg-a"}',
		);

		const analysis = await analyzeProject();

		expect(analysis.nodeVersion).toBe("20");
		expect(analysis.packageManager).toBe("pnpm");
		expect(analysis.hasPnpmWorkspace).toBe(true);
		expect(analysis.hasWorkspaces).toBe(true);
		expect(analysis.workspacePackagePaths).toContain("packages/pkg-a");
		expect(analysis.hasDatabase).toBe(true);
		expect(analysis.hasRedis).toBe(true);
		expect(analysis.hasCors).toBe(true);
		expect(analysis.hasLocalDependencies).toBe(true);
		expect(analysis.localDependencyPaths).toContain("../packages/local-pkg");
		expect(analysis.hasNativeDependencies).toBe(true);
		expect(analysis.controllers.length).toBe(1);
		expect(analysis.healthCheckPaths).toContain("/health");
		expect(analysis.port).toBe(3000);
		expect(analysis.bootstrapConfig.skipFileLoading).toBe(true);
		expect(analysis.bootstrapConfig.requiredVariables).toContain(
			"DATABASE_URL",
		);
	});

	it("detects yarn berry and bun lockfiles", async () => {
		writeBaseProject();
		fs.writeFileSync(path.join(tmpDir, "yarn.lock"), "# yarn lock\n");
		fs.writeFileSync(path.join(tmpDir, ".yarnrc.yml"), "nodeLinker: node-modules\n");

		const yarnAnalysis = await analyzeProject();
		expect(yarnAnalysis.packageManager).toBe("yarn");
		expect(yarnAnalysis.yarnBerry).toBe(true);

		fs.unlinkSync(path.join(tmpDir, "yarn.lock"));
		fs.unlinkSync(path.join(tmpDir, ".yarnrc.yml"));
		fs.writeFileSync(path.join(tmpDir, "bun.lock"), "{}");

		const bunAnalysis = await analyzeProject();
		expect(bunAnalysis.packageManager).toBe("bun");
		expect(bunAnalysis.bunLockfileType).toBe("text");
	});

	it("estimates memory from dependency count", async () => {
		writeBaseProject({
			dependencies: Object.fromEntries(
				Array.from({ length: 35 }, (_, i) => [`dep-${i}`, "1.0.0"]),
			),
		});

		const analysis = await analyzeProject();
		expect(analysis.estimatedMemory).toBe("512Mi");
	});
});
