import { CommandModule, Argv } from "yargs";

const importProject = (): CommandModule<{}, any> => {
	return {
		command: "import project",
		describe: "Import an existing Expresso TS project",
		builder: (yargs: Argv): Argv<any> => {
			return yargs.option("url", {
				describe: "The URL of the project",
				type: "string",
			});
		},
		handler: ({ url }) => {
			console.log(`Project imported from ${url}!`);
		},
	};
};

export { importProject };
