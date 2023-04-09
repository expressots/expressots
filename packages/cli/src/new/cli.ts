import { CommandModule, Argv } from "yargs";
import { projectForm } from "./form";

type CommandModuleArgs = {};

const createProject = (): CommandModule<CommandModuleArgs, any> => {
	return {
		command: "new <project-name> [package-manager] [template]",
		describe: "Create a new Expresso TS project",
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
				choices: ["npm", "yarn", "pnpm"],
				alias: "p",
			});

			return yargs;
		},
		handler: async ({projectName, packageManager, template}) => {
			return await projectForm(projectName, packageManager, template);
		},
	};
};

export { createProject };
