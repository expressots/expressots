import { Argv, CommandModule } from "yargs";
import { projectForm } from "./form";

// eslint-disable-next-line @typescript-eslint/ban-types
type CommandModuleArgs = {};

const createProject = (): CommandModule<CommandModuleArgs, any> => {
	return {
		command: "new <project-name> [package-manager] [template] [directory]",
		describe: "Create a new project",
		builder: (yargs: Argv): Argv => {
			yargs
				.positional("project-name", {
					describe: "The name of the project",
					type: "string",
				})
				.option("template", {
					describe: "The project template to use",
					type: "string",
					choices: ["non-opinionated", "opinionated"],
					alias: "t",
				})
				.option("package-manager", {
					describe: "The package manager to use",
					type: "string",
					choices: ["npm", "yarn", "pnpm", "bun"],
					alias: "p",
				})
				.option("directory", {
					describe: "The directory for new project",
					type: "string",
					alias: "d",
				})
				.implies("package-manager", "template")
				.implies("template", "package-manager");

			return yargs;
		},
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
