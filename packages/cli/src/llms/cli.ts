import { CommandModule } from "yargs";
import { printError } from "../utils/cli-ui";
import { resolveLlms } from "./resolve";
import fs from "fs";

const DEFAULT_PACKAGE = "@expressots/core";

interface LlmsArgs {
	package: string;
}

/**
 * Print the installed framework's guidance for language models.
 *
 * Models trained before v4 still write v3 APIs from memory. The package
 * ships `llms.txt` describing the current entry points and the removed
 * names; this command prints the copy that matches the version actually
 * installed in the project, so it can be pasted into an agent's context or
 * piped into a rules file.
 */
export const llmsCommand = (): CommandModule<object, LlmsArgs> => ({
	command: "llms",
	describe:
		"Print the installed framework's llms.txt (guidance for AI coding tools)",
	builder: (yargs) =>
		yargs
			.option("package", {
				alias: "p",
				type: "string",
				default: DEFAULT_PACKAGE,
				describe: "Package whose llms.txt to print",
			})
			.example("$0 llms", `Print ${DEFAULT_PACKAGE}'s guidance`)
			.example(
				"$0 llms >> AGENTS.md",
				"Append it to the project's agent instructions",
			),
	handler: (argv) => {
		const lookup = resolveLlms(argv.package, process.cwd());

		if (!lookup.packageDir) {
			printError(
				`${argv.package} is not installed in this project.`,
				`npm i ${argv.package}`,
			);
			process.exitCode = 1;
			return;
		}

		if (!lookup.llmsPath) {
			printError(
				`${argv.package}@${lookup.version ?? "?"} does not ship an llms.txt (added in @expressots/core 4.3.0).`,
				`npm i ${argv.package}@latest`,
			);
			process.exitCode = 1;
			return;
		}

		// Raw text on stdout, nothing else: the output is meant to be piped.
		process.stdout.write(fs.readFileSync(lookup.llmsPath, "utf8"));
	},
});
