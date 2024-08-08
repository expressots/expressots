import { CommandModule } from "yargs";
import { scriptsForm } from "./form";

const scriptsCommand = (): CommandModule => {
	return {
		command: "scripts [scripts..]",
		describe: "Run scripts list or specific scripts",
		builder: (yargs) => {
			return yargs.positional("scripts", {
				describe: "The names of the scripts to run",
				type: "string",
				array: true,
			});
		},
		handler: async (argv) => {
			const scripts = Array.isArray(argv.scripts)
				? argv.scripts.filter((script) => typeof script === "string")
				: [];
			await scriptsForm(scripts);
		},
	};
};

export { scriptsCommand };
