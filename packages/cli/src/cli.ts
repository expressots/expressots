#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { runCommandModule } from "./commands/project.commands";
import { generateProject } from "./generate";
import { helpCommand } from "./help/cli";
import { infoProject } from "./info";
import { createProject } from "./new";
import { createExternalProviderCMD } from "./providers/create/cli";
import { addProviderCMD } from "./providers";
import chalk from "chalk";
import { stdout } from "process";

stdout.write(`\n${[chalk.bold.green("🐎 Expressots")]}\n\n`);

yargs(hideBin(process.argv))
	.scriptName("expressots")
	.command(runCommandModule)
	.command(createProject())
	.command(createExternalProviderCMD())
	.command(addProviderCMD())
	.command(generateProject())
	.command(infoProject())
	.command(helpCommand())
	.demandCommand(1, "You need at least one command before moving on")
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
