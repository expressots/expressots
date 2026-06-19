/**
 * Unit tests for bootstrap configuration analysis.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import {
	analyzeBootstrapConfig,
	getEnvFileForEnvironment,
	shouldCopyEnvFiles,
	type BootstrapConfig,
} from "../../src/containerize/analyzers/bootstrap-analyzer";

let originalCwd: string;
let tmpDir: string;

beforeEach(() => {
	originalCwd = process.cwd();
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ex-cli-bootstrap-"));
	process.chdir(tmpDir);
	fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
});

afterEach(() => {
	process.chdir(originalCwd);
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeMain(content: string): void {
	fs.writeFileSync(path.join(tmpDir, "src", "main.ts"), content);
}

describe("bootstrap-analyzer", () => {
	it("returns defaults when main.ts is missing", async () => {
		const config = await analyzeBootstrapConfig();
		expect(config.hasEnvFileConfig).toBe(false);
		expect(config.isContainerReady).toBe(true);
	});

	it("parses envFileConfig from bootstrap call", async () => {
		writeMain(`
import { bootstrap } from "@expressots/core";
bootstrap({
  envFileConfig: {
    skipFileLoading: false,
    ciMode: true,
    autoCreateTemplate: true,
    currentEnvironment: "development",
    files: { development: ".env.dev", production: ".env.prod" },
    required: ["API_KEY", "DATABASE_URL"],
  },
});
`);
		fs.writeFileSync(path.join(tmpDir, ".env.dev"), "API_KEY=x\n");

		const config = await analyzeBootstrapConfig();

		expect(config.hasEnvFileConfig).toBe(true);
		expect(config.skipFileLoading).toBe(false);
		expect(config.ciMode).toBe(true);
		expect(config.autoCreateTemplate).toBe(true);
		expect(config.currentEnvironment).toBe("development");
		expect(config.envFiles.development).toBe(".env.dev");
		expect(config.requiredVariables).toEqual(["API_KEY", "DATABASE_URL"]);
		expect(config.existingEnvFiles).toContain(".env.dev");
		expect(config.missingEnvFiles).toContain(".env.prod");
	});

	it("flags container readiness when dev env file is missing", async () => {
		writeMain(`
bootstrap({
  envFileConfig: {
    files: { development: ".env.development" },
  },
});
`);

		const config = await analyzeBootstrapConfig();

		expect(config.isContainerReady).toBe(false);
		expect(config.recommendations.some((r) => r.includes(".env.development"))).toBe(
			true,
		);
	});

	describe("getEnvFileForEnvironment", () => {
		it("returns mapped file or convention default", () => {
			const config = {
				envFiles: { staging: ".env.staging" },
			} as unknown as BootstrapConfig;

			expect(getEnvFileForEnvironment(config, "staging")).toBe(".env.staging");
			expect(getEnvFileForEnvironment(config, "production")).toBe(
				".env.production",
			);
		});
	});

	describe("shouldCopyEnvFiles", () => {
		it("skips copy when skipFileLoading or ciMode is set", () => {
			expect(
				shouldCopyEnvFiles({
					skipFileLoading: true,
					ciMode: false,
					hasEnvFileConfig: true,
					existingEnvFiles: [".env"],
				} as unknown as BootstrapConfig),
			).toBe(false);

			expect(
				shouldCopyEnvFiles({
					skipFileLoading: false,
					ciMode: true,
					hasEnvFileConfig: true,
					existingEnvFiles: [".env"],
				} as unknown as BootstrapConfig),
			).toBe(false);
		});

		it("copies when env files exist and loading is enabled", () => {
			expect(
				shouldCopyEnvFiles({
					skipFileLoading: false,
					ciMode: false,
					hasEnvFileConfig: true,
					existingEnvFiles: [".env.development"],
				} as unknown as BootstrapConfig),
			).toBe(true);
		});
	});
});
