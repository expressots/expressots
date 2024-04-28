import { Argv, CommandModule } from "yargs";
import { externalProvider } from "./external/external.provider";
import { prismaProvider } from "./prisma/prisma.provider";

// eslint-disable-next-line @typescript-eslint/ban-types
type CommandModuleArgs = {};

const generateProviders = (): CommandModule<CommandModuleArgs, any> => {
	return {
		command: "add <provider> [library-version] [provider-version]",
		describe: "Scaffold a new provider",
		aliases: ["a"],
		builder: (yargs: Argv): Argv => {
			yargs
				.positional("provider", {
					choices: ["prisma", "provider"] as const,
					describe: "The provider to add to the project",
					type: "string",
					alias: "p",
				})
				.option("library-version", {
					describe: "The library version to install",
					type: "string",
					default: "latest",
					alias: "v",
				})
				.option("provider-version", {
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
			} else if (provider === "provider") {
				await externalProvider();
			}
		},
	};
};

export { generateProviders };
