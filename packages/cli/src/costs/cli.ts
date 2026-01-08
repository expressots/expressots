import { Argv, CommandModule } from "yargs";
import chalk from "chalk";
import {
	estimateCosts,
	compareCosts,
	optimizeCosts,
	showPricing,
} from "./form";
import { getPricingManager } from "./pricing-manager";

// eslint-disable-next-line @typescript-eslint/ban-types
type CommandModuleArgs = {};

export type CloudProvider =
	| "aws"
	| "gcp"
	| "azure"
	| "railway"
	| "render"
	| "fly"
	| "digitalocean"
	| "heroku";

const costsCommand = (): CommandModule<CommandModuleArgs, any> => {
	return {
		command: "costs <action>",
		describe: "Estimate and compare cloud deployment costs.",
		aliases: ["cost", "pricing"],
		builder: (yargs: Argv): Argv => {
			yargs.positional("action", {
				choices: [
					"estimate",
					"compare",
					"optimize",
					"pricing",
					"update",
					"info",
				] as const,
				describe: "Action to perform",
				type: "string",
				demandOption: true,
			});

			yargs.option("provider", {
				choices: [
					"aws",
					"gcp",
					"azure",
					"railway",
					"render",
					"fly",
					"digitalocean",
					"heroku",
				] as const,
				describe: "Cloud provider",
				type: "string",
				alias: "p",
			});

			yargs.option("service", {
				choices: [
					"ecs",
					"eks",
					"lambda",
					"cloudrun",
					"gke",
					"aci",
					"aks",
					"web-service",
				] as const,
				describe: "Specific service type",
				type: "string",
				alias: "s",
			});

			yargs.option("instances", {
				describe: "Number of instances/replicas",
				type: "number",
				alias: "i",
				default: 1,
			});

			yargs.option("cpu", {
				describe: "CPU cores/vCPUs per instance",
				type: "number",
				alias: "c",
				default: 1,
			});

			yargs.option("memory", {
				describe: "Memory in GB per instance",
				type: "number",
				alias: "m",
				default: 1,
			});

			yargs.option("storage", {
				describe: "Storage in GB",
				type: "number",
				default: 10,
			});

			yargs.option("bandwidth", {
				describe: "Expected bandwidth in GB/month",
				type: "number",
				default: 100,
			});

			yargs.option("region", {
				describe: "Cloud region",
				type: "string",
				alias: "r",
				default: "us-east-1",
			});

			yargs.option("hours", {
				describe: "Expected running hours per month",
				type: "number",
				default: 720, // 24 * 30
			});

			yargs.option("format", {
				choices: ["text", "json", "markdown"] as const,
				describe: "Output format",
				type: "string",
				default: "text",
			});

			yargs.option("output", {
				describe: "Output file",
				type: "string",
				alias: "o",
			});

			return yargs;
		},
		handler: async (argv) => {
			const {
				action,
				provider,
				service,
				instances,
				cpu,
				memory,
				storage,
				bandwidth,
				region,
				hours,
				format,
				output,
			} = argv;

			const options = {
				provider: provider as CloudProvider | undefined,
				service,
				instances,
				cpu,
				memory,
				storage,
				bandwidth,
				region,
				hours,
				format: format as "text" | "json" | "markdown",
				output,
			};

			switch (action) {
				case "estimate":
					await estimateCosts(options);
					break;
				case "compare":
					await compareCosts(options);
					break;
				case "optimize":
					await optimizeCosts(options);
					break;
				case "pricing":
					await showPricing(options);
					break;
				case "update":
					await updatePricingData();
					break;
				case "info":
					await showPricingInfo();
					break;
				default:
					console.log(`Unknown action: ${action}`);
			}
		},
	};
};

/**
 * Update pricing data from remote sources
 */
async function updatePricingData(): Promise<void> {
	console.log(chalk.cyan("\n🔄 Updating Pricing Data...\n"));

	const manager = getPricingManager();
	manager.clearCache();

	const success = await manager.updateCache();

	if (success) {
		const source = manager.getLastSource();
		console.log(chalk.green(`✓ Pricing data updated`));
		console.log(chalk.gray(`  Source: ${source}`));
	} else {
		console.log(chalk.red("✗ Failed to update pricing data"));
		console.log(
			chalk.gray("  Check your network connection and try again."),
		);
	}
	console.log();
}

/**
 * Show pricing system info
 */
async function showPricingInfo(): Promise<void> {
	const manager = getPricingManager();
	await manager.printStatus();

	const providers = await manager.getAvailableProviders();
	if (providers.length > 0) {
		console.log(chalk.bold("\nAvailable Providers:"));
		console.log(`  ${providers.join(", ")}`);
	}
	console.log();
}

export { costsCommand };
