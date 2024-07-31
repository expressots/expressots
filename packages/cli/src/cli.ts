#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { runCommandModule } from "./commands/project.commands";
import { generateProject } from "./generate";
import { helpCommand } from "./help/cli";
import { infoProject } from "./info";
import { createProject } from "./new";
import { generateProviders } from "./providers";

console.log(`\n[🐎 Expressots]\n`);

yargs(hideBin(process.argv))
	.scriptName("expressots")
	.command(runCommandModule)
	.command(createProject())
	.command(generateProviders())
	.command(generateProject())
	.command(infoProject())
	.command(helpCommand())
	.example("$0 new expressots-demo", "Create interactively")
	.example("$0 new expressots-demo -d ./", "Create interactively with path")
	.example("$0 new expressots-demo -p yarn -t opinionated", "Create silently")
	.example(
		"$0 new expressots-demo -p yarn -t opinionated -d ./",
		"Create silently with path",
	)
	.example("$0 generate service user-create", "Scaffold a service")
	.example("$0 info", "Show CLI details")
	.demandCommand(1, "You need at least one command before moving on")
	.epilog(
		"For more information: \n" +
			"🌐 visit:\t https://expresso-ts.com\n" +
			"💖 Sponsor:\t https://github.com/sponsors/expressots",
	)
	.help("help", "Show command help")
	.alias("h", "help")
	.version(false)
	.wrap(140)
	.parse();
