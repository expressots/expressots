#!/usr/bin/env node

import { readFileSync } from "fs";
import { resolve } from "path";
import chalk from "chalk";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import {
	buildCommand,
	devCommand,
	prodCommand,
} from "./commands/project.commands";
import { containerize } from "./containerize";
import { cicdCommand } from "./cicd";
import { migrateCommand } from "./migrate";
import { profileCommand } from "./profile";
import { devContainerCommand } from "./dev";
import { costsCommand } from "./costs";
import { templatesCommand } from "./templates";
import { generateProject } from "./generate";
import { helpCommand } from "./help/cli";
import { infoProject } from "./info";
import { createProject } from "./new";
import { addProviderCMD, removeProviderCMD } from "./providers";
import { createExternalProviderCMD } from "./providers/create/cli";
import { printError, printHeader } from "./utils/cli-ui";
import { scriptsCommand } from "./scripts";
import { studioCommand } from "./studio";

/**
 * The current version of the ExpressoTS Bundle.
 * Derived from this CLI package's own package.json — single source of truth.
 * The compiled binary lives at `bin/cli.js`, so the package.json is one
 * directory above `__dirname`. When running from source via tsx the layout
 * is `src/cli.ts` -> `../package.json`, which still resolves correctly.
 */
function readBundleVersion(): string {
	try {
		const pkgPath = resolve(__dirname, "..", "package.json");
		const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
			version?: string;
		};
		if (typeof pkg.version === "string" && pkg.version.length > 0) {
			return pkg.version;
		}
	} catch {
		// fall through to the safe default below
	}
	return "0.0.0";
}

export const BUNDLE_VERSION = readBundleVersion();

printHeader();

yargs(hideBin(process.argv))
	.scriptName("expressots")
	.command(createProject())
	.command(devCommand)
	.command(buildCommand)
	.command(prodCommand)
	.command(createExternalProviderCMD())
	.command(addProviderCMD())
	.command(removeProviderCMD())
	.command(generateProject())
	.command(containerize())
	.command(cicdCommand())
	.command(migrateCommand())
	.command(profileCommand())
	.command(devContainerCommand())
	.command(costsCommand())
	.command(templatesCommand())
	.command(scriptsCommand())
	.command(studioCommand())
	.command(infoProject())
	.command(helpCommand())
	.demandCommand(1, "You need at least one command before moving on")
	.strict()
	.fail((msg, err, yargs) => {
		if (msg) {
			if (msg.includes("Unknown argument")) {
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
			printError(err.stack, "command-validator");
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
