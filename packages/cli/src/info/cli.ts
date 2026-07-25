import { CommandModule } from "yargs";
import { infoForm } from "./form";

type CommandModuleArgs = object;

const infoProject = (): CommandModule<CommandModuleArgs, any> => {
	return {
		command: "info",
		describe: "Displays project info.",
		aliases: ["i"],
		handler: async () => {
			await infoForm();
		},
	};
};

export { infoProject };
