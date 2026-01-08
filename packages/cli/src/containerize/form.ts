import chalk from "chalk";
import Compiler from "../utils/compiler";
import { printError, printSuccess } from "../utils/cli-ui";
import { analyzeProject } from "./analyzers/project-analyzer";
import { generateDockerfiles } from "./generators/dockerfile-generator";
import { generateKubernetesConfigs } from "./generators/kubernetes-generator";
import { generateDockerCompose } from "./generators/docker-compose-generator";
import {
	generateCIConfig,
	type CIPlatform,
	type CIStrategy,
} from "./generators/ci-generator";

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
	deploymentStrategy?: string;
};

export const containerizeProject = async (
	options: ContainerizeOptions,
): Promise<void> => {
	try {
		console.log(chalk.bold.cyan("\n🐳 ExpressoTS Containerization\n"));

		// Step 1: Analyze project (if enabled)
		let analysis;
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

		console.log(chalk.cyan("\n📖 Next steps:"));

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
