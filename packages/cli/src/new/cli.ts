import { Argv, CommandModule } from "yargs";
import { projectForm } from "./form";
import semver from "semver";
import { printWarning } from "../utils/cli-ui";
import chalk from "chalk";

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
			choices: ["opinionated", "non-opinionated", "micro"],
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

const checkNodeVersion = (): void => {
	const minVersion = "18.0.0";
	const maxVersion = "22.5.1";
	const currentVersion = process.version;

	if (!semver.satisfies(currentVersion, `>=${minVersion} <=${maxVersion}`)) {
		const msg: string = `Node.js version [${chalk.bold(chalk.white(currentVersion))}] is not tested. Please use a version between ${minVersion} and ${maxVersion}.`;
		printWarning(msg);
	}
};

const createProject = (): CommandModule<CommandModuleArgs, any> => {
	return {
		command: "new <project-name> [package-manager] [template] [directory]",
		describe: "Create ExpressoTS application.",
		builder: commandOptions,
		handler: async ({
			projectName,
			packageManager,
			template,
			directory,
		}) => {
			checkNodeVersion();
			return await projectForm(projectName, [
				packageManager,
				template,
				directory,
			]);
		},
	};
};

export { createProject };
