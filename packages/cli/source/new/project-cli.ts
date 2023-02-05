import { CommandModule, Argv } from "yargs";
import { ProjectUIForm } from "./project-ui";

const createProject = (): CommandModule<{}, any> => {
	return {
		command: "new project [project-name]",
		describe: "Create a new Expresso TS project",
		builder: (yargs: Argv): Argv<any> => {
			yargs.positional("project-name", {
				describe: "The name of the project",
				type: "string",
			});

			return yargs;
		},
		handler: ({ projectName }) => {
			return ProjectUIForm({ projectName });
		},
	};
};

export { createProject };
