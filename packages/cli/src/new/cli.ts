import { Argv, CommandModule } from "yargs";
import { projectForm } from "./form";

type CommandModuleArgs = object;

const packageManagers: Array<string> = [
	"npm",
	"yarn",
	"pnpm",
	...(process.platform !== "win32" ? ["bun"] : []),
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
			choices: ["opinionated", "non-opinionated"],
			alias: "t",
		})
		.option("package-manager", {
			describe: "The package manager to use",
			type: "string",
			choices: packageManagers,
			alias: "p",
		})
		.option("directory", {
			describe: "The directory for new project",
			type: "string",
			alias: "d",
		})
		.implies("package-manager", "template")
		.implies("template", "package-manager");
};

const createProject = (): CommandModule<CommandModuleArgs, any> => {
	return {
		command: "new <project-name> [package-manager] [template] [directory]",
		describe: "Create a new project",
		builder: commandOptions,
		handler: async ({
			projectName,
			packageManager,
			template,
			directory,
		}) => {
			return await projectForm(projectName, [
				packageManager,
				template,
				directory,
			]);
		},
	};
};

export { createProject };
