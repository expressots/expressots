import { CommandModule, Argv } from "yargs";
import { projectForm } from "./create-project-ui";

const createProject = (): CommandModule<{}, any> => {
	return {
		command: "new [project-name]",
		describe: "Create a new Expresso TS project",
		builder: (yargs: Argv): Argv<any> => {
			yargs.positional("project-name", {
				describe: "The name of the project",
				type: "string",
			});

			return yargs;
		},
		handler: async ({ projectName }) => {
			return await projectForm(projectName);
		},
	};
};

export { createProject };
