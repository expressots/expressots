import chalk from "chalk";
import Compiler from "../utils/compiler";
import { printError, printSection, printSuccess } from "../utils/cli-ui";
import {
	analyzeProject,
	type ProjectAnalysis,
} from "./analyzers/project-analyzer";
import { generateDockerfiles } from "./generators/dockerfile-generator";
import { generateKubernetesConfigs } from "./generators/kubernetes-generator";
import { generateDockerCompose } from "./generators/docker-compose-generator";
import {
	generateCIConfig,
	type CIPlatform,
	type CIStrategy,
} from "./generators/ci-generator";
import { shouldCopyEnvFiles } from "./analyzers/bootstrap-analyzer";

type ContainerizeOptions = {
	target: string;
	environment: string;
	preset: string;
	analyze: boolean;
	skipCompose: boolean;
	includeCi: boolean;
	ciPlatform?: CIPlatform;
	ciStrategy?: CIStrategy;
	includeSecurityScans?: boolean;
	includeE2E?: boolean;
};

export const containerizeProject = async (
	options: ContainerizeOptions,
): Promise<void> => {
	try {
		console.log(chalk.bold.cyan("\n🐳 ExpressoTS Containerization\n"));

		// Step 1: Analyze project (if enabled)
		let analysis: ProjectAnalysis | undefined;
		if (options.analyze) {
			console.log(chalk.yellow("📊 Analyzing your project...\n"));
			analysis = await analyzeProject();

			console.log(chalk.white("Project Analysis:"));
			console.log(chalk.gray(`  Node version: ${analysis.nodeVersion}`));
			console.log(
				chalk.gray(`  Package manager: ${analysis.packageManager}`),
			);
			console.log(
				chalk.gray(`  Dependencies: ${analysis.dependencies.length}`),
			);
			console.log(
				chalk.gray(`  Controllers: ${analysis.controllers.length}`),
			);

			// Warn about local dependencies
			if (analysis.hasLocalDependencies) {
				console.log(
					chalk.yellow(
						`\n⚠️  Warning: Detected ${analysis.localDependencyPaths.length} local file dependencies`,
					),
				);
				console.log(
					chalk.gray(
						"  These will be copied into the Docker image. For production,",
					),
				);
				console.log(
					chalk.gray(
						"  consider publishing to npm registry instead.",
					),
				);
			}

			// Bootstrap configuration analysis
			printBootstrapAnalysis(analysis);

			console.log("");
		}

		// Step 2: Generate based on target
		switch (options.target) {
			case "docker":
				await generateDockerfiles(options, analysis);
				if (!options.skipCompose) {
					await generateDockerCompose(options, analysis);
				}
				break;

			case "kubernetes":
			case "k8s":
				await generateDockerfiles(options, analysis);
				await generateKubernetesConfigs(options, analysis);
				break;

			case "compose":
				// Compose `build:` blocks reference Dockerfiles by
				// path (Dockerfile or Dockerfile.development), so the
				// compose-only target must also emit them — otherwise
				// `docker compose up --build` fails with "no such file
				// or directory".
				await generateDockerfiles(options, analysis);
				await generateDockerCompose(options, analysis);
				break;

			default:
				await generateDockerfiles(options, analysis);
				break;
		}

		// Step 3: Generate CI/CD config (if requested)
		if (options.includeCi) {
			await generateCIConfig(options, analysis);
		}

		// Step 4: Success message
		console.log(
			chalk.bold.green(
				"\n✅ Container configuration generated successfully!\n",
			),
		);

		console.log(chalk.white("📋 Summary:"));
		console.log(chalk.gray("  • Generated files are fully customizable"));
		console.log(chalk.gray("  • Edit them to fit your specific needs"));
		console.log(
			chalk.gray("  • Run 'expressots container profile' to optimize"),
		);

		printSection("📖 Next steps:");

		if (analysis?.hasLocalDependencies) {
			console.log(chalk.white("  1. Review generated files"));
			console.log(chalk.white("  2. Run setup: npm run docker:setup"));
			console.log(chalk.white("  3. Build: docker build -t myapp ."));
			console.log(chalk.white("  4. Run: docker-compose up"));
			console.log(
				chalk.yellow(
					"\n💡 Tip: The docker-setup.sh script copies local dependencies",
				),
			);
			console.log(
				chalk.yellow(
					"   to .docker-deps/ for the Docker build context.",
				),
			);
		} else {
			console.log(chalk.white("  1. Review generated files"));
			console.log(chalk.white("  2. Customize as needed"));
			console.log(chalk.white("  3. Build: docker build -t myapp ."));
			console.log(chalk.white("  4. Run: docker-compose up"));
		}

		console.log("");
	} catch (error) {
		printError(
			`Containerization failed: ${error instanceof Error ? error.message : String(error)}`,
			"containerize",
		);
		throw error;
	}
};

/**
 * Print bootstrap configuration analysis and recommendations
 */
function printBootstrapAnalysis(analysis: ProjectAnalysis): void {
	const bootstrapConfig = analysis.bootstrapConfig;

	if (!bootstrapConfig.hasEnvFileConfig) {
		return; // No env file config, nothing to warn about
	}

	printSection("📋 Bootstrap Configuration:");

	// Show detected env file config
	if (bootstrapConfig.skipFileLoading || bootstrapConfig.ciMode) {
		console.log(chalk.green("  ✓ Container-ready configuration detected"));
		console.log(
			chalk.gray(
				`    Using ${bootstrapConfig.skipFileLoading ? "skipFileLoading" : "ciMode"} mode`,
			),
		);
		return;
	}

	// Check if env files are needed
	const copyEnvFiles = shouldCopyEnvFiles(bootstrapConfig);

	if (copyEnvFiles) {
		console.log(
			chalk.yellow("  ⚠️  Environment file configuration detected"),
		);

		// Show existing env files
		if (bootstrapConfig.existingEnvFiles.length > 0) {
			console.log(chalk.gray("  Existing env files:"));
			bootstrapConfig.existingEnvFiles.forEach((file) => {
				console.log(chalk.green(`    ✓ ${file}`));
			});
		}

		// Show missing env files
		if (bootstrapConfig.missingEnvFiles.length > 0) {
			console.log(chalk.gray("  Missing env files:"));
			bootstrapConfig.missingEnvFiles.forEach((file) => {
				console.log(chalk.red(`    ✗ ${file}`));
			});
		}

		// Show required variables
		if (bootstrapConfig.requiredVariables.length > 0) {
			console.log(chalk.gray("  Required variables:"));
			bootstrapConfig.requiredVariables.forEach((varName) => {
				console.log(chalk.yellow(`    • ${varName}`));
			});
		}
	}

	// Show recommendations
	if (bootstrapConfig.recommendations.length > 0) {
		printSection("💡 Recommendations:");
		bootstrapConfig.recommendations.forEach((rec) => {
			console.log(chalk.gray(`  • ${rec}`));
		});
	}

	// Special warning for missing required env files
	if (!bootstrapConfig.isContainerReady) {
		console.log(chalk.red("\n⚠️  Container may fail to start!"));
		console.log(
			chalk.gray(
				"  The bootstrap configuration requires env files that are missing.",
			),
		);
		console.log(chalk.gray("  Options:"));
		console.log(
			chalk.gray("    1. Create the missing env files before building"),
		);
		console.log(
			chalk.gray("    2. Update bootstrap to use skipFileLoading: true"),
		);
		console.log(
			chalk.gray(
				"    3. Set environment variables in docker-compose.yml",
			),
		);
	}
}
