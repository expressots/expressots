import { Argv, CommandModule } from "yargs";
import { prismaProvider } from "./prisma/prisma.provider";

// eslint-disable-next-line @typescript-eslint/ban-types
type CommandModuleArgs = {};

const generateProviders = (): CommandModule<CommandModuleArgs, any> => {
	return {
		command: "add <provider> [libraryVersion] [providerVersion]",
		describe: "Scaffold a new provider",
		aliases: ["a"],
		builder: (yargs: Argv): Argv => {
			yargs.positional("provider", {
				choices: [
					"prisma",
				] as const,
				describe: "The provider to add to the project",
				type: "string",
			})
			.option("libraryVersion", {
				describe: "The version to install",
				type: "string",
				default: "latest",
				alias: "v",
			})
			.option("providerVersion", {
				describe: "The version of the provider to install",
				type: "string",
				default: "latest",
				alias: "vp",
			});

			return yargs;
		},
		handler: async ({ provider, libraryVersion, providerVersion }) => {
			if (provider === "prisma") {
				await prismaProvider(libraryVersion, providerVersion);
			}
		},
	};
};

export { generateProviders };
