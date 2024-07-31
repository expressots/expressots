import { Argv, CommandModule } from "yargs";
import { createTemplate } from "./form";

// eslint-disable-next-line @typescript-eslint/ban-types
type CommandModuleArgs = {};

const coerceSchematicAliases = (arg: string) => {
	switch (arg) {
		case "u":
			return "usecase";
		case "c":
			return "controller";
		case "d":
			return "dto";
		case "s":
			return "service";
		case "p":
			return "provider";
		case "e":
			return "entity";
		case "mo":
			return "module";
		case "mi":
			return "middleware";
		default:
			return arg;
	}
};

const generateProject = (): CommandModule<CommandModuleArgs, any> => {
	return {
		command: "generate [schematic] [path] [method]",
		describe: "Scaffold a new resource",
		aliases: ["g"],
		builder: (yargs: Argv): Argv => {
			yargs.positional("schematic", {
				choices: [
					"usecase",
					"controller",
					"dto",
					"service",
					"provider",
					"entity",
					"module",
					"middleware",
				] as const,
				describe: "The schematic to generate",
				type: "string",
				coerce: coerceSchematicAliases,
			});

			yargs.positional("path", {
				describe: "The path to generate the schematic",
				type: "string",
				alias: "d",
			});

			yargs.positional("method", {
				choices: ["get", "post", "put", "patch", "delete"] as const,
				describe: "HTTP method",
				type: "string",
				alias: "m",
			});

			return yargs;
		},
		handler: async ({ schematic, path, method }) => {
			await createTemplate({ schematic, path, method });
		},
	};
};

export { generateProject };
