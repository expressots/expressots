/**
 * `openapi` command — generate an OpenAPI 3.1 document for the project.
 *
 * The generation logic lives in `@expressots/studio-agent` (the same
 * scanner Studio uses), exposed headlessly through the Studio bin's
 * `emit-openapi` subcommand. This command is a thin, install-aware
 * delegate so users get one consistent CLI surface.
 */

import chalk from "chalk";
import type { Argv, CommandModule } from "yargs";
import ora from "ora";
import { existsSync } from "fs";
import { resolve } from "path";
import { BUNDLE_VERSION } from "../cli";
import { safeSpawn, safeSpawnSync } from "../utils/safe-spawn";
import {
	detectPackageManagerOrDefault,
	getAddPackageArgs,
} from "../utils/package-manager-commands";

interface OpenApiYargsOptions {
	out: string;
	src: string;
	"api-version"?: string;
	"global-prefix"?: string;
	"fail-on-drift"?: string;
	title?: string;
}

function isStudioInstalled(): boolean {
	try {
		return existsSync(
			resolve(process.cwd(), "node_modules/@expressots/studio"),
		);
	} catch {
		return false;
	}
}

async function installStudio(): Promise<boolean> {
	const spinner = ora("Installing @expressots/studio...").start();
	try {
		const studioSpec = `@expressots/studio@^${BUNDLE_VERSION}`;
		const pkgManager = detectPackageManagerOrDefault();
		const args = [
			...getAddPackageArgs(pkgManager, { dev: true }),
			studioSpec,
		];
		const result = safeSpawnSync(pkgManager, args, { stdio: "pipe" });
		if (result.error) throw result.error;
		if (typeof result.status === "number" && result.status !== 0) {
			throw new Error(`exited with code ${result.status}`);
		}
		spinner.succeed(
			chalk.green("@expressots/studio installed successfully"),
		);
		return true;
	} catch {
		spinner.fail(chalk.red("Failed to install @expressots/studio"));
		console.error(
			chalk.yellow(
				"\nPlease install manually: npm install -D @expressots/studio",
			),
		);
		return false;
	}
}

function runEmit(options: OpenApiYargsOptions): Promise<void> {
	return new Promise((resolvePromise) => {
		const args: string[] = [
			"emit-openapi",
			"--out",
			options.out,
			"--src",
			options.src,
		];
		if (options.title) args.push("--title", options.title);
		if (options["api-version"])
			args.push("--api-version", options["api-version"]);
		if (options["global-prefix"] !== undefined) {
			args.push("--global-prefix", options["global-prefix"]);
		}
		if (options["fail-on-drift"]) {
			args.push("--fail-on-drift", options["fail-on-drift"]);
		}

		const isWindows = process.platform === "win32";
		const studioBinName = isWindows
			? "expressots-studio.cmd"
			: "expressots-studio";
		const studioPath = resolve(
			process.cwd(),
			"node_modules/.bin",
			studioBinName,
		);

		const child = safeSpawn(studioPath, args, {
			stdio: "inherit",
			cwd: process.cwd(),
		});

		child.on("error", (error: Error) => {
			console.error(
				chalk.red("Failed to run OpenAPI generator:"),
				error.message,
			);
			process.exit(1);
		});

		child.on("exit", (code: number | null) => {
			// Propagate the generator's exit code (e.g. non-zero on drift) so
			// the command works as a CI gate.
			if (code && code !== 0) process.exit(code);
			resolvePromise();
		});
	});
}

async function openApiHandler(options: OpenApiYargsOptions): Promise<void> {
	if (!isStudioInstalled()) {
		console.log(
			chalk.yellow(
				"📦 @expressots/studio is not installed in this project.",
			),
		);
		console.log("");
		const installed = await installStudio();
		if (!installed) {
			process.exit(1);
		}
		console.log("");
	}

	await runEmit(options);
}

export function openApiCommand(): CommandModule<object, OpenApiYargsOptions> {
	return {
		command: "openapi [action]",
		describe: "Generate an OpenAPI 3.1 spec from your ExpressoTS project",
		builder: (yargs: Argv): Argv<OpenApiYargsOptions> =>
			yargs
				.positional("action", {
					choices: ["emit"] as const,
					describe: "What to do (currently only 'emit')",
					default: "emit",
					type: "string",
				})
				.option("out", {
					alias: "o",
					type: "string",
					default: "openapi.json",
					description: "Output file path",
				})
				.option("src", {
					type: "string",
					default: "./src",
					description: "Source directory to scan",
				})
				.option("api-version", {
					type: "string",
					description:
						"Restrict output to a single API version (e.g. 2)",
				})
				.option("global-prefix", {
					type: "string",
					description:
						"Global route prefix (e.g. /api). Auto-detected from setGlobalRoutePrefix when omitted.",
				})
				.option("fail-on-drift", {
					type: "string",
					description:
						"Diff against a committed spec and exit non-zero on drift (CI gate)",
				})
				.option("title", {
					type: "string",
					description: "API title for info.title",
				}) as unknown as Argv<OpenApiYargsOptions>,
		handler: async (argv) => {
			await openApiHandler({
				out: argv.out,
				src: argv.src,
				"api-version": argv["api-version"],
				"global-prefix": argv["global-prefix"],
				"fail-on-drift": argv["fail-on-drift"],
				title: argv.title,
			});
		},
	};
}
