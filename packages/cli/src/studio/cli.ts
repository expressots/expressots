/**
 * Studio command CLI implementation
 */

import chalk from "chalk";
import type { Argv, CommandModule } from "yargs";
import { execSync, spawn } from "child_process";
import ora from "ora";
import { existsSync } from "fs";
import { resolve } from "path";

interface StudioOptions {
	port: number;
	agentPort: number;
	noBrowser: boolean;
	src: string;
}

/**
 * Check if @expressots/studio is installed
 */
function isStudioInstalled(): boolean {
	try {
		// Check if the package exists in node_modules
		const studioPath = resolve(
			process.cwd(),
			"node_modules/@expressots/studio"
		);
		return existsSync(studioPath);
	} catch {
		return false;
	}
}

/**
 * Install @expressots/studio as a dev dependency
 */
async function installStudio(): Promise<boolean> {
	const spinner = ora("Installing @expressots/studio...").start();

	try {
		// Detect package manager
		const hasYarn = existsSync(resolve(process.cwd(), "yarn.lock"));
		const hasPnpm = existsSync(resolve(process.cwd(), "pnpm-lock.yaml"));

		let command: string;
		if (hasPnpm) {
			command = "pnpm add -D @expressots/studio";
		} else if (hasYarn) {
			command = "yarn add -D @expressots/studio";
		} else {
			command = "npm install -D @expressots/studio";
		}

		execSync(command, { stdio: "pipe" });
		spinner.succeed(chalk.green("@expressots/studio installed successfully"));
		return true;
	} catch (error) {
		spinner.fail(chalk.red("Failed to install @expressots/studio"));
		console.error(
			chalk.yellow(
				"\nPlease install manually: npm install -D @expressots/studio"
			)
		);
		return false;
	}
}

/**
 * Launch the Studio
 */
async function launchStudio(options: StudioOptions): Promise<void> {
	const args: string[] = ["start"];

	if (options.port) {
		args.push("--port", String(options.port));
	}

	if (options.agentPort) {
		args.push("--agent-port", String(options.agentPort));
	}

	if (options.noBrowser) {
		args.push("--no-browser");
	}

	if (options.src) {
		args.push("--src", options.src);
	}

	const studioPath = resolve(
		process.cwd(),
		"node_modules/.bin/expressots-studio"
	);

	const child = spawn(studioPath, args, {
		stdio: "inherit",
		shell: true,
		cwd: process.cwd(),
	});

	child.on("error", (error) => {
		console.error(chalk.red("Failed to start Studio:"), error.message);
		process.exit(1);
	});

	child.on("exit", (code) => {
		process.exit(code ?? 0);
	});
}

/**
 * Print the v4.0.0 GA preview banner so users understand Studio's status.
 *
 * Studio ships at v4.1.0 GA. In v4.0.0 it is published under the npm
 * `preview` dist-tag (4.0.0-preview.1) and several flagship features
 * (Replay, Architecture Map async sync, AI Fix Generator) are intentionally
 * incomplete. We surface this every launch.
 */
function printPreviewBanner(): void {
	console.log("");
	console.log(chalk.cyan("  ⚡ ExpressoTS Studio"));
	console.log(chalk.gray("     Developer Experience Platform"));
	console.log("");
	console.log(
		chalk.yellow(
			"  ⚠  PREVIEW: Studio is in technical preview for v4.0.0."
		)
	);
	console.log(
		chalk.gray(
			"     Replay, Architecture Map and AI Fix Generator are still being"
		)
	);
	console.log(
		chalk.gray(
			"     finalized. The full release ships with v4.1.0. Roadmap:"
		)
	);
	console.log(
		chalk.gray("     https://github.com/expressots/expressots/blob/main/ROADMAP_v4.1.md")
	);
	console.log("");
}

/**
 * Studio command handler
 */
async function studioHandler(options: StudioOptions): Promise<void> {
	printPreviewBanner();

	// Check if Studio is installed
	if (!isStudioInstalled()) {
		console.log(
			chalk.yellow("📦 @expressots/studio is not installed in this project.")
		);
		console.log("");

		// Try to install
		const installed = await installStudio();
		if (!installed) {
			process.exit(1);
		}

		console.log("");
	}

	// Launch Studio
	await launchStudio(options);
}

interface StudioYargsOptions {
	port: number;
	"agent-port": number;
	"no-browser": boolean;
	src: string;
}

/**
 * Studio command definition
 */
export function studioCommand(): CommandModule<object, StudioYargsOptions> {
	return {
		command: "studio",
		describe: "Launch ExpressoTS Studio - Developer Experience Platform",
		builder: (yargs: Argv): Argv<StudioYargsOptions> =>
			yargs
				.option("port", {
					alias: "p",
					type: "number",
					default: 3333,
					description: "UI port",
				})
				.option("agent-port", {
					alias: "a",
					type: "number",
					default: 3334,
					description: "Agent WebSocket port",
				})
				.option("no-browser", {
					type: "boolean",
					default: false,
					description: "Do not open browser automatically",
				})
				.option("src", {
					type: "string",
					default: "./src",
					description: "Source directory to scan",
				}) as Argv<StudioYargsOptions>,
		handler: async (argv) => {
			await studioHandler({
				port: argv.port,
				agentPort: argv["agent-port"],
				noBrowser: argv["no-browser"],
				src: argv.src,
			});
		},
	};
}
