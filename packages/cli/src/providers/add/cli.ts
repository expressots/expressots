import { Argv, CommandModule } from "yargs";
import { addProvider, removeProvider } from "./form";

// eslint-disable-next-line @typescript-eslint/ban-types
type CommandModuleArgs = {};

export const addProviderCMD = (): CommandModule<CommandModuleArgs, any> => {
	return {
		command: "add <provider> [version]",
		describe: "Add provider to the project.",
		builder: (yargs: Argv): Argv => {
			yargs
				.positional("provider", {
					describe: "The provider to be added to the project",
					type: "string",
				})
				.option("version", {
					describe: "The provider version to be installed",
					type: "string",
					default: false,
					alias: "v",
				})
				.option("dev", {
					describe: "Add provider as a dev dependency",
					type: "boolean",
					default: false,
					alias: "d",
				});
			return yargs;
		},
		handler: async ({ provider, version, dev }) => {
			await addProvider(provider, version, dev);
		},
	};
};

export const removeProviderCMD = (): CommandModule<CommandModuleArgs, any> => {
	return {
		command: "remove <provider>",
		describe: "Remove provider from the project.",
		builder: (yargs: Argv): Argv => {
			yargs.positional("provider", {
				describe: "The provider to be removed from the project",
				type: "string",
			});
			return yargs;
		},
		handler: async ({ provider: packageName }) => {
			await removeProvider(packageName);
		},
	};
};
