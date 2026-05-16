import { Argv, CommandModule } from "yargs";
import { projectForm } from "./form";
import semver from "semver";
import { printWarning } from "../utils/cli-ui";
import chalk from "chalk";

type CommandModuleArgs = object;

const packageManagers: Array<string> = [
	"npm",
	"yarn",
	"pnpm",
	...(process.platform !== "win32" ? ["bun"] : []),
];

const middlewarePresets: Array<string> = [
	"api",
	"web",
	"graphql",
	"microservice",
	"minimal",
];

const commandOptions = (yargs: Argv): Argv => {
	return yargs
		.positional("project-name", {
			describe: "The name of the project",
			type: "string",
		})
		.option("template", {
			describe: "The project template to use",
			type: "string",
			choices: ["application", "micro"],
			alias: "t",
		})
		.option("package-manager", {
			describe: "The package manager to use",
			type: "string",
			choices: packageManagers,
			alias: "p",
		})
		.option("preset", {
			describe: "Middleware preset for Application template",
			type: "string",
			choices: middlewarePresets,
			alias: "s",
		})
		.option("events", {
			describe:
				"Include the type-safe Event Bus example (Application template only)",
			type: "boolean",
			alias: "e",
		})
		.option("directory", {
			describe: "The directory for new project",
			type: "string",
			alias: "d",
		})
		.implies("package-manager", "template")
		.implies("template", "package-manager")
		.implies("preset", "template")
		.implies("events", "template");
};

const checkNodeVersion = (): void => {
	const minVersion = "20.0.0";
	const maxVersion = "24.0.0";
	const currentVersion = process.version;

	if (!semver.satisfies(currentVersion, `>=${minVersion} <=${maxVersion}`)) {
		const msg: string = `Node.js version [${chalk.bold(chalk.white(currentVersion))}] is not fully tested. Recommended: v20.x or v22.x LTS.`;
		printWarning(msg);
	}
};

const createProject = (): CommandModule<CommandModuleArgs, any> => {
	return {
		command: "new <project-name> [package-manager] [template] [directory]",
		describe: "Create ExpressoTS application.",
		builder: commandOptions,
		handler: async ({
			projectName,
			packageManager,
			template,
			directory,
			preset,
			events,
		}) => {
			checkNodeVersion();
			return await projectForm(projectName, [
				packageManager,
				template,
				directory,
				preset,
				events,
			]);
		},
	};
};

export { createProject };
