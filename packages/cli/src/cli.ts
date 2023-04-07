#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { generateProject } from "./generate";
import { createProject } from "./new";

yargs(hideBin(process.argv))
	.example("$0 new <project-name>", "Create a new Expresso TS project")
	.command(createProject())
	.command(generateProject())
	.demandCommand(1, "You need at least one command before moving on")
	.epilog("For more information, visit https://expresso-ts.com")
	.help()
	.parse();
