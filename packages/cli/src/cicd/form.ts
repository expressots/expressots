import fs from "fs";
import path from "path";
import chalk from "chalk";
import inquirer from "inquirer";
import type { CIPlatform, CIStrategy } from "./cli";
import { analyzeProject } from "../containerize/analyzers/project-analyzer";
import {
	generateGitHubActions,
	generateGitLabCI,
	generateCircleCI,
	generateJenkinsfile,
	generateBitbucketPipelines,
	generateAzureDevOps,
} from "./generators";

export interface CICDOptions {
	platform?: CIPlatform | "all";
	strategy: CIStrategy;
	includeSecurity: boolean;
	includeE2E: boolean;
	includeCoverage: boolean;
	dockerRegistry?: string;
	deployTarget: string;
	branch: string;
	nodeVersion: string;
	outputDir?: string;
}

const PLATFORMS: { id: CIPlatform; name: string; description: string }[] = [
	{ id: "github", name: "GitHub Actions", description: "CI/CD for GitHub repositories" },
	{ id: "gitlab", name: "GitLab CI", description: "CI/CD for GitLab repositories" },
	{ id: "circleci", name: "CircleCI", description: "Cloud-based CI/CD platform" },
	{ id: "jenkins", name: "Jenkins", description: "Self-hosted automation server" },
	{ id: "bitbucket", name: "Bitbucket Pipelines", description: "CI/CD for Bitbucket Cloud" },
	{ id: "azure", name: "Azure DevOps", description: "Microsoft Azure CI/CD platform" },
];

/**
 * Interactive CI/CD setup wizard
 */
export async function initCICD(options: CICDOptions): Promise<void> {
	console.log(chalk.cyan("\n🔧 ExpressoTS CI/CD Setup Wizard\n"));

	// Analyze project first
	const analysis = await analyzeProject();
	
	// Interactive prompts
	const answers = await inquirer.prompt([
		{
			type: "checkbox",
			name: "platforms",
			message: "Select CI/CD platforms to configure:",
			choices: PLATFORMS.map(p => ({
				name: `${p.name} - ${p.description}`,
				value: p.id,
				checked: p.id === "github",
			})),
			validate: (input) => input.length > 0 || "Select at least one platform",
		},
		{
			type: "list",
			name: "strategy",
			message: "Select CI/CD strategy:",
			choices: [
				{ name: "Basic - Lint, test, build", value: "basic" },
				{ name: "Comprehensive - Full testing, security, coverage", value: "comprehensive" },
				{ name: "Security-Focused - Maximum security scanning", value: "security-focused" },
			],
			default: "comprehensive",
		},
		{
			type: "confirm",
			name: "includeSecurity",
			message: "Include security scanning (Trivy, Snyk)?",
			default: true,
		},
		{
			type: "confirm",
			name: "includeE2E",
			message: "Include end-to-end tests?",
			default: false,
		},
		{
			type: "confirm",
			name: "includeCoverage",
			message: "Include code coverage reporting?",
			default: true,
		},
		{
			type: "list",
			name: "deployTarget",
			message: "Select deployment target:",
			choices: [
				{ name: "None (build only)", value: "none" },
				{ name: "Kubernetes", value: "kubernetes" },
				{ name: "AWS ECS", value: "ecs" },
				{ name: "Google Cloud Run", value: "cloudrun" },
				{ name: "Railway", value: "railway" },
				{ name: "Render", value: "render" },
				{ name: "Fly.io", value: "fly" },
			],
			default: "none",
		},
		{
			type: "input",
			name: "dockerRegistry",
			message: "Docker registry (leave empty for default):",
			default: "",
		},
		{
			type: "input",
			name: "branch",
			message: "Main branch name:",
			default: "main",
		},
	]);

	// Generate for each selected platform
	const selectedOptions: CICDOptions = {
		...options,
		strategy: answers.strategy,
		includeSecurity: answers.includeSecurity,
		includeE2E: answers.includeE2E,
		includeCoverage: answers.includeCoverage,
		deployTarget: answers.deployTarget,
		dockerRegistry: answers.dockerRegistry || undefined,
		branch: answers.branch,
	};

	console.log(chalk.yellow("\n📝 Generating CI/CD configurations...\n"));

	for (const platform of answers.platforms) {
		await generatePlatformConfig(platform, selectedOptions, analysis);
	}

	console.log(chalk.green("\n✅ CI/CD setup complete!\n"));
	printNextSteps(answers.platforms, selectedOptions);
}

/**
 * Generate CI/CD configuration for specific platform(s)
 */
export async function generateCICD(options: CICDOptions): Promise<void> {
	console.log(chalk.cyan("\n🔧 ExpressoTS CI/CD Generator\n"));

	if (!options.platform) {
		console.log(chalk.red("Error: Please specify a platform. Use 'expressots cicd list' to see available platforms."));
		return;
	}

	const analysis = await analyzeProject();

	console.log(chalk.yellow("📝 Generating CI/CD configuration...\n"));

	if (options.platform === "all") {
		for (const platform of PLATFORMS) {
			await generatePlatformConfig(platform.id, options, analysis);
		}
	} else {
		await generatePlatformConfig(options.platform, options, analysis);
	}

	console.log(chalk.green("\n✅ CI/CD configuration generated!\n"));
	printNextSteps(
		options.platform === "all" ? PLATFORMS.map(p => p.id) : [options.platform],
		options
	);
}

/**
 * List available CI/CD platforms
 */
export async function listPlatforms(): Promise<void> {
	console.log(chalk.cyan("\n📋 Available CI/CD Platforms\n"));

	console.log(chalk.bold("Platform".padEnd(20) + "Description".padEnd(45) + "Status"));
	console.log("-".repeat(80));

	for (const platform of PLATFORMS) {
		const status = chalk.green("✓ Available");
		console.log(
			chalk.white(platform.name.padEnd(20)) +
			chalk.gray(platform.description.padEnd(45)) +
			status
		);
	}

	console.log(chalk.gray("\nUsage: expressots cicd generate <platform>"));
	console.log(chalk.gray("       expressots cicd generate all"));
	console.log(chalk.gray("       expressots cicd init (interactive wizard)\n"));
}

/**
 * Validate existing CI/CD configurations
 */
export async function validatePipelines(): Promise<void> {
	console.log(chalk.cyan("\n🔍 Validating CI/CD Configurations\n"));

	const cwd = process.cwd();
	const validations: { platform: string; file: string; exists: boolean; valid: boolean; issues: string[] }[] = [];

	// Check for each platform's config file
	const platformFiles: { platform: string; paths: string[] }[] = [
		{ platform: "GitHub Actions", paths: [".github/workflows/ci.yml", ".github/workflows/docker-deploy.yml"] },
		{ platform: "GitLab CI", paths: [".gitlab-ci.yml"] },
		{ platform: "CircleCI", paths: [".circleci/config.yml"] },
		{ platform: "Jenkins", paths: ["Jenkinsfile"] },
		{ platform: "Bitbucket", paths: ["bitbucket-pipelines.yml"] },
		{ platform: "Azure DevOps", paths: ["azure-pipelines.yml"] },
	];

	for (const { platform, paths } of platformFiles) {
		for (const filePath of paths) {
			const fullPath = path.join(cwd, filePath);
			const exists = fs.existsSync(fullPath);
			
			if (exists) {
				const issues: string[] = [];
				let valid = true;

				try {
					const content = fs.readFileSync(fullPath, "utf-8");
					
					// Basic validation checks
					if (content.length < 50) {
						issues.push("File seems too short");
						valid = false;
					}

					// Check for common issues
					if (filePath.endsWith(".yml") || filePath.endsWith(".yaml")) {
						if (content.includes("\t")) {
							issues.push("Contains tabs (YAML should use spaces)");
						}
					}

					// Check for placeholder values
					if (content.includes("YOUR_") || content.includes("<REPLACE>")) {
						issues.push("Contains placeholder values that need to be replaced");
					}

				} catch (err) {
					issues.push("Failed to read file");
					valid = false;
				}

				validations.push({ platform, file: filePath, exists, valid, issues });
			}
		}
	}

	if (validations.length === 0) {
		console.log(chalk.yellow("No CI/CD configuration files found."));
		console.log(chalk.gray("\nRun 'expressots cicd init' to create CI/CD configurations.\n"));
		return;
	}

	console.log(chalk.bold("File".padEnd(45) + "Status".padEnd(15) + "Issues"));
	console.log("-".repeat(80));

	for (const v of validations) {
		const status = v.valid ? chalk.green("✓ Valid") : chalk.yellow("⚠ Warning");
		const issues = v.issues.length > 0 ? chalk.gray(v.issues.join(", ")) : "";
		console.log(
			chalk.white(v.file.padEnd(45)) +
			status.padEnd(24) +
			issues
		);
	}

	console.log();
}

/**
 * Generate configuration for a specific platform
 */
async function generatePlatformConfig(
	platform: CIPlatform,
	options: CICDOptions,
	analysis: any
): Promise<void> {
	const cwd = process.cwd();
	const outputDir = options.outputDir || cwd;

	const generatorOptions = {
		projectName: analysis?.projectName || path.basename(cwd),
		nodeVersion: options.nodeVersion || analysis?.nodeVersion || "20",
		packageManager: analysis?.packageManager || "npm",
		strategy: options.strategy,
		includeSecurity: options.includeSecurity,
		includeE2E: options.includeE2E,
		includeCoverage: options.includeCoverage,
		dockerRegistry: options.dockerRegistry,
		deployTarget: options.deployTarget,
		branch: options.branch,
		port: analysis?.port || 3000,
	};

	switch (platform) {
		case "github":
			await generateGitHubActions(outputDir, generatorOptions);
			break;
		case "gitlab":
			await generateGitLabCI(outputDir, generatorOptions);
			break;
		case "circleci":
			await generateCircleCI(outputDir, generatorOptions);
			break;
		case "jenkins":
			await generateJenkinsfile(outputDir, generatorOptions);
			break;
		case "bitbucket":
			await generateBitbucketPipelines(outputDir, generatorOptions);
			break;
		case "azure":
			await generateAzureDevOps(outputDir, generatorOptions);
			break;
	}
}

/**
 * Print next steps after generation
 */
function printNextSteps(platforms: CIPlatform[], options: CICDOptions): void {
	console.log(chalk.bold("📖 Next Steps:\n"));

	console.log(chalk.white("1. Review generated configuration files"));
	console.log(chalk.white("2. Configure required secrets in your CI/CD platform:\n"));

	// Common secrets
	const secrets = [
		"DOCKER_USERNAME - Docker registry username",
		"DOCKER_PASSWORD - Docker registry password/token",
	];

	if (options.includeSecurity) {
		secrets.push("SNYK_TOKEN - Snyk API token (optional)");
	}

	if (options.includeCoverage) {
		secrets.push("CODECOV_TOKEN - Codecov upload token (optional)");
	}

	if (options.deployTarget === "kubernetes") {
		secrets.push("KUBE_CONFIG - Kubernetes configuration");
	} else if (options.deployTarget === "railway") {
		secrets.push("RAILWAY_TOKEN - Railway API token");
	} else if (options.deployTarget === "render") {
		secrets.push("RENDER_API_KEY - Render API key");
	} else if (options.deployTarget === "fly") {
		secrets.push("FLY_API_TOKEN - Fly.io API token");
	}

	for (const secret of secrets) {
		console.log(chalk.gray(`   • ${secret}`));
	}

	console.log(chalk.white("\n3. Commit and push to trigger the pipeline"));
	
	console.log(chalk.gray("\n💡 Tip: Run 'expressots cicd validate' to check your configurations\n"));
}
