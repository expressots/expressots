import { Argv, CommandModule } from "yargs";
import {
	initCICD,
	generateCICD,
	listPlatforms,
	validatePipelines,
} from "./form";
import { printError } from "../utils/cli-ui";

type CommandModuleArgs = Record<string, never>;

export type CIPlatform =
	| "github"
	| "gitlab"
	| "circleci"
	| "jenkins"
	| "bitbucket"
	| "azure";
export type CIStrategy = "basic" | "comprehensive" | "security-focused";

const cicdCommand = (): CommandModule<CommandModuleArgs, any> => {
	return {
		command: "cicd <action> [platform]",
		describe: "Generate and manage CI/CD pipeline configurations.",
		aliases: ["ci", "pipeline"],
		builder: (yargs: Argv): Argv => {
			yargs.positional("action", {
				choices: ["init", "generate", "list", "validate"] as const,
				describe: "Action to perform",
				type: "string",
				demandOption: true,
			});

			yargs.positional("platform", {
				choices: [
					"github",
					"gitlab",
					"circleci",
					"jenkins",
					"bitbucket",
					"azure",
					"all",
				] as const,
				describe: "CI/CD platform to generate for",
				type: "string",
			});

			yargs.option("strategy", {
				choices: [
					"basic",
					"comprehensive",
					"security-focused",
				] as const,
				describe: "CI/CD pipeline strategy",
				type: "string",
				alias: "s",
				default: "comprehensive",
			});

			yargs.option("include-security", {
				describe: "Include security scanning (Trivy, Snyk)",
				type: "boolean",
				default: true,
			});

			yargs.option("include-e2e", {
				describe: "Include end-to-end tests",
				type: "boolean",
				default: false,
			});

			yargs.option("include-coverage", {
				describe: "Include code coverage reporting",
				type: "boolean",
				default: true,
			});

			yargs.option("docker-registry", {
				describe: "Docker registry URL (e.g., ghcr.io, docker.io)",
				type: "string",
				alias: "r",
			});

			yargs.option("deploy-target", {
				choices: [
					"kubernetes",
					"ecs",
					"cloudrun",
					"railway",
					"render",
					"fly",
					"none",
				] as const,
				describe: "Deployment target platform",
				type: "string",
				default: "none",
			});

			yargs.option("branch", {
				describe: "Branch to trigger CI/CD on",
				type: "string",
				alias: "b",
				default: "main",
			});

			yargs.option("node-version", {
				describe: "Node.js version for CI",
				type: "string",
				default: "20",
			});

			yargs.option("output-dir", {
				describe: "Output directory for generated files",
				type: "string",
				alias: "o",
			});

			return yargs;
		},
		handler: async (argv) => {
			const {
				action,
				platform,
				strategy,
				includeSecurity,
				includeE2e,
				includeCoverage,
				dockerRegistry,
				deployTarget,
				branch,
				nodeVersion,
				outputDir,
			} = argv;

			const options = {
				platform: platform as CIPlatform | "all" | undefined,
				strategy: strategy as CIStrategy,
				includeSecurity,
				includeE2E: includeE2e,
				includeCoverage,
				dockerRegistry,
				deployTarget,
				branch,
				nodeVersion,
				outputDir,
			};

			switch (action) {
				case "init":
					await initCICD(options);
					break;
				case "generate":
					await generateCICD(options);
					break;
				case "list":
					await listPlatforms();
					break;
				case "validate":
					await validatePipelines();
					break;
				default:
					printError(`Unknown action: ${action}`, "cicd");
					process.exit(1);
			}
		},
	};
};

export { cicdCommand };
