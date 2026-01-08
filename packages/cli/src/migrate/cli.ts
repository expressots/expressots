import { Argv, CommandModule } from "yargs";
import {
	initMigration,
	generateMigration,
	listMigrations,
	analyzeMigration,
} from "./form";

// eslint-disable-next-line @typescript-eslint/ban-types
type CommandModuleArgs = {};

export type MigrationSource = "heroku" | "docker-compose" | "vercel" | "aws-ecs" | "gcp-cloudrun" | "azure-container";
export type MigrationTarget = "railway" | "render" | "fly" | "kubernetes" | "aws-ecs" | "gcp-cloudrun" | "azure-container";

const migrateCommand = (): CommandModule<CommandModuleArgs, any> => {
	return {
		command: "migrate <action> [options]",
		describe: "Generate migration scripts between cloud platforms.",
		aliases: ["migration", "mig"],
		builder: (yargs: Argv): Argv => {
			yargs.positional("action", {
				choices: ["init", "generate", "list", "analyze"] as const,
				describe: "Action to perform",
				type: "string",
				demandOption: true,
			});

			yargs.option("from", {
				choices: ["heroku", "docker-compose", "vercel", "aws-ecs", "gcp-cloudrun", "azure-container"] as const,
				describe: "Source platform to migrate from",
				type: "string",
				alias: "f",
			});

			yargs.option("to", {
				choices: ["railway", "render", "fly", "kubernetes", "aws-ecs", "gcp-cloudrun", "azure-container"] as const,
				describe: "Target platform to migrate to",
				type: "string",
				alias: "t",
			});

			yargs.option("include-data", {
				describe: "Include data migration scripts",
				type: "boolean",
				default: false,
			});

			yargs.option("include-secrets", {
				describe: "Include secrets/environment variable migration",
				type: "boolean",
				default: true,
			});

			yargs.option("dry-run", {
				describe: "Show migration steps without generating files",
				type: "boolean",
				default: false,
			});

			yargs.option("output-dir", {
				describe: "Output directory for migration files",
				type: "string",
				alias: "o",
				default: "./migration",
			});

			return yargs;
		},
		handler: async (argv) => {
			const {
				action,
				from,
				to,
				includeData,
				includeSecrets,
				dryRun,
				outputDir,
			} = argv;

			const options = {
				from: from as MigrationSource | undefined,
				to: to as MigrationTarget | undefined,
				includeData,
				includeSecrets,
				dryRun,
				outputDir,
			};

			switch (action) {
				case "init":
					await initMigration(options);
					break;
				case "generate":
					await generateMigration(options);
					break;
				case "list":
					await listMigrations();
					break;
				case "analyze":
					await analyzeMigration(options);
					break;
				default:
					console.log(`Unknown action: ${action}`);
			}
		},
	};
};

export { migrateCommand };
