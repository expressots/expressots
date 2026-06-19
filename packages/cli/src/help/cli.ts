import { CommandModule } from "yargs";
import { helpForm } from "./form";

type CommandModuleArgs = Record<string, never>;

const helpCommand = (): CommandModule<CommandModuleArgs, any> => {
	return {
		command: "resources",
		describe: "Resource list.",
		aliases: ["r"],
		handler: async () => {
			await helpForm();
		},
	};
};

export { helpCommand };
