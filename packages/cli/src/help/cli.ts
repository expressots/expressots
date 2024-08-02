import { CommandModule } from "yargs";
import { helpForm } from "./form";

// eslint-disable-next-line @typescript-eslint/ban-types
type CommandModuleArgs = {};

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
