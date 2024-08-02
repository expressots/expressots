import { Argv, CommandModule } from "yargs";
import { addExternalProvider } from "./form";

// eslint-disable-next-line @typescript-eslint/ban-types
type CommandModuleArgs = {};

export const addProviderCMD = (): CommandModule<CommandModuleArgs, any> => {
	return {
		command: "add <provider> [version]",
		describe: "Add an external provider to the project",
		builder: (yargs: Argv): Argv => {
			yargs
				.positional("provider", {
					describe: "The provider to be added to the project",
					type: "string",
				})
				.option("version", {
					describe: "The provider version to be installed",
					type: "string",
					default: "latest",
					alias: "v",
				});
			return yargs;
		},
		handler: async ({ provider, version }) => {
			await addExternalProvider(provider, version);
		},
	};
};
