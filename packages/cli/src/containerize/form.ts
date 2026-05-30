import { stdout } from "process";
import chalk from "chalk";
import {
	printBullet,
	printError,
	printKeyValue,
	printSection,
	printSuccess,
	printWarning,
} from "../utils/cli-ui";
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
		printSection("🐳 ExpressoTS Containerization");

		// Step 1: Analyze project (if enabled)
		let analysis: ProjectAnalysis | undefined;
		if (options.analyze) {
			printSection("📊 Project Analysis");
			analysis = await analyzeProject();

			printKeyValue("Node version", analysis.nodeVersion);
			printKeyValue("Package manager", analysis.packageManager);
			printKeyValue(
				"Dependencies",
				String(analysis.dependencies.length),
			);
			printKeyValue("Controllers", String(analysis.controllers.length));

			if (analysis.hasLocalDependencies) {
				stdout.write("\n");
				printWarning(
					`Detected ${analysis.localDependencyPaths.length} local file dependencies`,
					"containerize",
				);
				printBullet(
					chalk.gray(
						"These will be copied into the Docker image. For production,",
					),
				);
				printBullet(
					chalk.gray("consider publishing to npm registry instead."),
				);
			}

			printBootstrapAnalysis(analysis);
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
		stdout.write("\n");
		printSuccess(
			"Container configuration generated successfully",
			"containerize",
		);

		printSection("📋 Summary");
		printBullet("Generated files are fully customizable");
		printBullet("Edit them to fit your specific needs");
		printBullet(
			`Run ${chalk.cyan("expressots container profile")} to optimize`,
		);

		printSection("📖 Next steps");

		if (analysis?.hasLocalDependencies) {
			const pm = analysis.packageManager;
			printBullet(`Review generated files`);
			printBullet(`Run setup: ${chalk.cyan(`${pm} run docker:setup`)}`);
			printBullet(`Build: ${chalk.cyan("docker build -t myapp .")}`);
			printBullet(`Run: ${chalk.cyan("docker compose up")}`);

			stdout.write("\n");
			printWarning(
				"docker-setup.js copies local dependencies to .docker-deps/ for the Docker build context.",
				"containerize",
			);
		} else {
			printBullet("Review generated files");
			printBullet("Customize as needed");
			printBullet(`Build: ${chalk.cyan("docker build -t myapp .")}`);
			printBullet(`Run: ${chalk.cyan("docker compose up")}`);
		}

		stdout.write("\n");
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

	printSection("📋 Bootstrap Configuration");

	// Show detected env file config
	if (bootstrapConfig.skipFileLoading || bootstrapConfig.ciMode) {
		printSuccess(
			"Container-ready configuration detected",
			"bootstrap",
		);
		printBullet(
			chalk.gray(
				`Using ${bootstrapConfig.skipFileLoading ? "skipFileLoading" : "ciMode"} mode`,
			),
		);
		return;
	}

	// Check if env files are needed
	const copyEnvFiles = shouldCopyEnvFiles(bootstrapConfig);

	if (copyEnvFiles) {
		printWarning(
			"Environment file configuration detected",
			"bootstrap",
		);

		if (bootstrapConfig.existingEnvFiles.length > 0) {
			printBullet(chalk.bold("Existing env files:"));
			bootstrapConfig.existingEnvFiles.forEach((file) => {
				printBullet(chalk.green(`  ✓ ${file}`));
			});
		}

		if (bootstrapConfig.missingEnvFiles.length > 0) {
			printBullet(chalk.bold("Missing env files:"));
			bootstrapConfig.missingEnvFiles.forEach((file) => {
				printBullet(chalk.red(`  ✗ ${file}`));
			});
		}

		if (bootstrapConfig.requiredVariables.length > 0) {
			printBullet(chalk.bold("Required variables:"));
			bootstrapConfig.requiredVariables.forEach((varName) => {
				printBullet(chalk.yellow(`  • ${varName}`));
			});
		}
	}

	// Show recommendations
	if (bootstrapConfig.recommendations.length > 0) {
		printSection("💡 Recommendations");
		bootstrapConfig.recommendations.forEach((rec) => {
			printBullet(rec);
		});
	}

	// Special warning for missing required env files
	if (!bootstrapConfig.isContainerReady) {
		stdout.write("\n");
		printError("Container may fail to start!", "bootstrap");
		printBullet(
			chalk.gray(
				"The bootstrap configuration requires env files that are missing.",
			),
		);
		printBullet(chalk.gray("Options:"));
		printBullet(
			chalk.gray("  1. Create the missing env files before building"),
		);
		printBullet(
			chalk.gray("  2. Update bootstrap to use skipFileLoading: true"),
		);
		printBullet(
			chalk.gray("  3. Set environment variables in docker-compose.yml"),
		);
	}
}
