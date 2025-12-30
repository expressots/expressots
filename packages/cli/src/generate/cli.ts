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
		// NEW v4.0 schematics
		case "i":
			return "interceptor";
		case "ev":
			return "event";
		case "h":
			return "handler";
		case "gu":
			return "guard";
		case "cfg":
			return "config";
		default:
			return arg;
	}
};

const generateProject = (): CommandModule<CommandModuleArgs, any> => {
	return {
		command: "generate [schematic] [path] [method]",
		describe: "Generate ExpressoTS resource.",
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
					// NEW v4.0 schematics
					"interceptor",
					"event",
					"handler",
					"guard",
					"config",
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

			// NEW: Options for v4.0 schematics
			yargs.option("event", {
				describe: "Event class name for handler generation",
				type: "string",
			});

			yargs.option("priority", {
				describe:
					"Priority for interceptors/handlers (lower = earlier execution)",
				type: "number",
				default: 10,
			});

			return yargs;
		},
		handler: async ({ schematic, path, method, event, priority }) => {
			await createTemplate({ schematic, path, method, event, priority });
		},
	};
};

export { generateProject };
