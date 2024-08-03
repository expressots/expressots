import { Argv, CommandModule } from "yargs";
import { createExternalProvider } from "./form";

// eslint-disable-next-line @typescript-eslint/ban-types
type CommandModuleArgs = {};

export const createExternalProviderCMD = (): CommandModule<
	CommandModuleArgs,
	any
> => {
	return {
		command: "create [provider]",
		describe: "Create a provider.",
		builder: (yargs: Argv): Argv => {
			yargs.option("provider", {
				describe: "Provider name",
				type: "string",
			});
			return yargs;
		},
		handler: async ({ provider }) => {
			await createExternalProvider(provider);
		},
	};
};
