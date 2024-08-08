#!/usr/bin/env node

import chalk from "chalk";
import { stdout } from "process";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import {
	buildCommand,
	devCommand,
	prodCommand,
} from "./commands/project.commands";
import { generateProject } from "./generate";
import { helpCommand } from "./help/cli";
import { infoProject } from "./info";
import { createProject } from "./new";
import { addProviderCMD } from "./providers";
import { createExternalProviderCMD } from "./providers/create/cli";
import { printError } from "./utils/cli-ui";
import { scriptsCommand } from "./scripts";

stdout.write(`\n${[chalk.bold.green("🐎 Expressots")]}\n\n`);

yargs(hideBin(process.argv))
	.scriptName("expressots")
	.command(createProject())
	.command(devCommand)
	.command(buildCommand)
	.command(prodCommand)
	.command(createExternalProviderCMD())
	.command(addProviderCMD())
	.command(generateProject())
	.command(scriptsCommand())
	.command(infoProject())
	.command(helpCommand())
	.demandCommand(1, "You need at least one command before moving on")
	.strict()
	.fail((msg, err, yargs) => {
		if (msg) {
			if (msg.includes("Unknown argument")) {
				// Get the command name
				const command = process.argv[2];

				if (command === "run") {
					printError(
						`The "run" command has been removed. Use "dev", "prod" or "build" instead.`,
						"expressots help",
					);
				} else {
					printError(
						`Unknown command [${command}]. For help type`,
						"expressots help",
					);
				}
			} else {
				printError(msg, "expressots help");
			}
		} else if (err) {
			printError(err.message, "command-validator");
		} else {
			printError(
				"Command invalid. Consider updating the CLI.",
				"command-validator",
			);
			yargs.showHelp();
		}
		process.exit(1);
	})
	.epilog(
		`${chalk.bold.green("For more information:")} \n\n` +
			"🌐 visit:\t https://expresso-ts.com\n" +
			"💖 Sponsor:\t https://github.com/sponsors/expressots",
	)
	.help("help", "Show command help")
	.alias("h", "help")
	.version(false)
	.wrap(140)
	.parse();
