import { Argv, CommandModule } from "yargs";
import { containerizeProject } from "./form";

// eslint-disable-next-line @typescript-eslint/ban-types
type CommandModuleArgs = {};

const containerize = (): CommandModule<CommandModuleArgs, any> => {
	return {
		command: "containerize [target] [environment]",
		describe:
			"Generate container configurations for your ExpressoTS application.",
		aliases: ["c"],
		builder: (yargs: Argv): Argv => {
			yargs.positional("target", {
				choices: ["docker", "kubernetes", "k8s", "compose"] as const,
				describe: "Target platform for containerization",
				type: "string",
				default: "docker",
			});

			yargs.positional("environment", {
				choices: [
					"development",
					"staging",
					"production",
					"all",
				] as const,
				describe: "Target environment",
				type: "string",
				alias: "env",
				default: "production",
			});

			yargs.option("preset", {
				choices: [
					"minimal",
					"secure",
					"fast-startup",
					"dev",
					"multi-arch",
					"standard",
				] as const,
				describe: "Container preset to use",
				type: "string",
				default: "standard",
			});

			yargs.option("analyze", {
				describe: "Analyze project before generating",
				type: "boolean",
				default: true,
			});

			yargs.option("skip-compose", {
				describe: "Skip docker-compose.yml generation",
				type: "boolean",
				default: false,
			});

			yargs.option("include-ci", {
				describe: "Include CI/CD pipeline configuration",
				type: "boolean",
				default: false,
			});

			yargs.option("ci-platform", {
				choices: [
					"github",
					"gitlab",
					"circleci",
					"jenkins",
					"bitbucket",
					"azure",
					"all",
				] as const,
				describe: "CI/CD platform to generate configuration for",
				type: "string",
				default: "github",
			});

			yargs.option("ci-strategy", {
				choices: [
					"basic",
					"comprehensive",
					"security-focused",
				] as const,
				describe: "CI/CD pipeline strategy",
				type: "string",
				default: "comprehensive",
			});

			yargs.option("include-security-scans", {
				describe: "Include security scanning (Trivy, Snyk)",
				type: "boolean",
				default: true,
			});

			yargs.option("include-e2e", {
				describe: "Include end-to-end tests in CI pipeline",
				type: "boolean",
				default: false,
			});

			yargs.option("deployment-strategy", {
				choices: [
					"rolling",
					"blue-green",
					"canary",
					"recreate",
				] as const,
				describe: "Kubernetes deployment strategy",
				type: "string",
				default: "rolling",
			});

			return yargs;
		},
		handler: async ({
			target,
			environment,
			preset,
			analyze,
			skipCompose,
			includeCi,
			ciPlatform,
			ciStrategy,
			includeSecurityScans,
			includeE2e,
			deploymentStrategy,
		}) => {
			await containerizeProject({
				target,
				environment,
				preset,
				analyze,
				skipCompose,
				includeCi,
				ciPlatform,
				ciStrategy,
				includeSecurityScans,
				includeE2E: includeE2e,
				deploymentStrategy,
			});
		},
	};
};

export { containerize };
