/**
 * Studio command CLI implementation
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
			"node_modules/@expressots/studio",
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
		// Pin the studio install to the same minor as the running CLI so
		// `expressots studio` from a preview-N CLI fetches a matching
		// preview-N studio. Falls back to a caret on the major if the CLI
		// version isn't a valid prerelease (defensive).
		const studioSpec = `@expressots/studio@^${BUNDLE_VERSION}`;

		// Detect the project's package manager (npm/yarn/pnpm/bun),
		// defaulting to npm when no lockfile is present.
		const pkgManager = detectPackageManagerOrDefault();
		const args = [
			...getAddPackageArgs(pkgManager, { dev: true }),
			studioSpec,
		];

		// `safeSpawnSync` (cross-spawn) resolves the Windows `.cmd` shim
		// and properly escapes argv for cmd.exe. The argv here is a
		// fixed list of literal strings, so it is safe by construction.
		const result = safeSpawnSync(pkgManager, args, {
			stdio: "pipe",
		});

		if (result.error) throw result.error;
		if (typeof result.status === "number" && result.status !== 0) {
			throw new Error(`exited with code ${result.status}`);
		}

		spinner.succeed(
			chalk.green("@expressots/studio installed successfully"),
		);
		return true;
	} catch (error) {
		spinner.fail(chalk.red("Failed to install @expressots/studio"));
		console.error(
			chalk.yellow(
				"\nPlease install manually: npm install -D @expressots/studio",
			),
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

	const isWindows = process.platform === "win32";
	const studioBinName = isWindows
		? "expressots-studio.cmd"
		: "expressots-studio";
	const studioPath = resolve(
		process.cwd(),
		"node_modules/.bin",
		studioBinName,
	);

	// `safeSpawn` (cross-spawn) handles Windows `.cmd` shim invocation
	// and per-arg cmd.exe escaping, so user-controlled flags like
	// `--src` or `--port` cannot break out into shell metacharacters
	// even if the project path itself contains spaces.
	const child = safeSpawn(studioPath, args, {
		stdio: "inherit",
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
 * Studio command handler
 */
async function studioHandler(options: StudioOptions): Promise<void> {
	// Check if Studio is installed
	if (!isStudioInstalled()) {
		console.log(
			chalk.yellow(
				"📦 @expressots/studio is not installed in this project.",
			),
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
