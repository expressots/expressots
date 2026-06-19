/**
 * Tests for non-GitHub CI/CD generators (Bitbucket, GitLab, CircleCI, Jenkins, Azure).
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

jest.mock("../../src/cicd/generators/template-loader", () => {
	const actual = jest.requireActual(
		"../../src/cicd/generators/template-loader",
	);
	return {
		...actual,
		loadCICDTemplate: async (
			_platform: string,
			_strategy: string,
			options: unknown,
			fallback: (opts: unknown) => string,
		) => ({ content: fallback(options), source: "embedded" }),
		logTemplateSource: jest.fn(),
	};
});

import { generateAzureDevOps } from "../../src/cicd/generators/azure-devops";
import { generateBitbucketPipelines } from "../../src/cicd/generators/bitbucket";
import { generateCircleCI } from "../../src/cicd/generators/circleci";
import { generateGitLabCI } from "../../src/cicd/generators/gitlab-ci";
import { generateJenkinsfile } from "../../src/cicd/generators/jenkins";
import type { GeneratorOptions } from "../../src/cicd/generators/github-actions";

let tmpDir: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ex-cli-cicd-gen-"));
	jest.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
	jest.restoreAllMocks();
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

const baseOptions: GeneratorOptions = {
	projectName: "test-app",
	nodeVersion: "22",
	packageManager: "npm",
	strategy: "comprehensive",
	includeSecurity: true,
	includeE2E: false,
	includeCoverage: true,
	deployTarget: "none",
	branch: "main",
	port: 3000,
};

describe("cicd generators", () => {
	test("generateBitbucketPipelines writes bitbucket-pipelines.yml", async () => {
		await generateBitbucketPipelines(tmpDir, baseOptions);
		const file = path.join(tmpDir, "bitbucket-pipelines.yml");
		expect(fs.existsSync(file)).toBe(true);
		const yml = fs.readFileSync(file, "utf-8");
		expect(yml).toContain("pipelines:");
		expect(yml).toContain("npm ci");
	});

	test("generateGitLabCI writes .gitlab-ci.yml", async () => {
		await generateGitLabCI(tmpDir, { ...baseOptions, packageManager: "pnpm" });
		const file = path.join(tmpDir, ".gitlab-ci.yml");
		expect(fs.existsSync(file)).toBe(true);
		const yml = fs.readFileSync(file, "utf-8");
		expect(yml).toContain("pnpm install");
	});

	test("generateCircleCI writes .circleci/config.yml", async () => {
		await generateCircleCI(tmpDir, baseOptions);
		const file = path.join(tmpDir, ".circleci", "config.yml");
		expect(fs.existsSync(file)).toBe(true);
		const yml = fs.readFileSync(file, "utf-8");
		expect(yml).toContain("version:");
	});

	test("generateJenkinsfile writes Jenkinsfile", async () => {
		await generateJenkinsfile(tmpDir, baseOptions);
		const file = path.join(tmpDir, "Jenkinsfile");
		expect(fs.existsSync(file)).toBe(true);
		const content = fs.readFileSync(file, "utf-8");
		expect(content).toContain("pipeline");
	});

	test("generateAzureDevOps writes azure-pipelines.yml", async () => {
		await generateAzureDevOps(tmpDir, {
			...baseOptions,
			packageManager: "bun",
		});
		const file = path.join(tmpDir, "azure-pipelines.yml");
		expect(fs.existsSync(file)).toBe(true);
		const yml = fs.readFileSync(file, "utf-8");
		expect(yml).toContain("bun install");
	});
});
