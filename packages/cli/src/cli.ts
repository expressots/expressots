#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { generateProject } from "./generate";
import { infoProject } from "./info";
import { createProject } from "./new";

export const CLI_VERSION = "1.3.0";

console.log(`\n[🐎 Expressots]\n`);

yargs(hideBin(process.argv))
	.scriptName("expressots")
	.command(createProject())
	.command(generateProject())
	.command(infoProject())
	.example("$0 new expressots-demo", "Create interactively")
	.example("$0 new expressots-demo -d ./", "Create interactively with path")
	.example("$0 new expressots-demo -p yarn -t opinionated", "Create silently")
	.example("$0 new expressots-demo -p yarn -t opinionated -d ./", "Create silently with path")
	.example("$0 generate service user-create", "Scaffold a service")
	.example("$0 info", "Show CLI details")
	.demandCommand(1, "You need at least one command before moving on")
	.epilog("For more information: \n" +
	"🌐 visit:\t https://expresso-ts.com\n" +
	"💖 Sponsor:\t https://github.com/sponsors/expressots")
	.help("help", "Show command help")
	.alias("h", "help")
	.version(false)
	.wrap(140)
	.parse();