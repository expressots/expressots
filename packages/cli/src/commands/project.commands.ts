import { spawn } from "child_process";
import { promises as fs, readFileSync, existsSync, mkdirSync } from "fs";
import os from "os";
import path, { join } from "path";
import { CommandModule } from "yargs";
import { printError, printSuccess } from "../utils/cli-ui";
import Compiler from "../utils/compiler";

/**
 * Helper function to load and extract outDir from tsconfig.build.json
 */
function getOutDir(): string {
	const tsconfigBuildPath = join(process.cwd(), "tsconfig.build.json");

	if (!existsSync(tsconfigBuildPath)) {
		printError(
			"Cannot find tsconfig.build.json. Please create one in the root directory",
			"tsconfig-build-path",
		);
		process.exit(1);
	}

	const tsconfig = JSON.parse(readFileSync(tsconfigBuildPath, "utf-8"));
	const outDir = tsconfig.compilerOptions.outDir;

	if (!outDir) {
		printError(
			"Cannot find outDir in tsconfig.build.json. Please provide an outDir.",
			"tsconfig-build-path",
		);
		process.exit(1);
	}

	if (!existsSync(outDir)) {
		mkdirSync(outDir, { recursive: true });
		printSuccess(`Created outDir: ${outDir}`, "outdir-creation");
	}

	return outDir;
}

/**
 * Build the tsx arguments for running TypeScript files.
 * Used by nodemon to execute the TypeScript entry point.
 *
 * @param opinionated - Whether to use opinionated configuration (tsconfig-paths)
 * @returns The tsx arguments array
 */
async function buildTsxArgs(opinionated: boolean): Promise<Array<string>> {
	const { entryPoint } = await Compiler.loadConfig();

	if (opinionated) {
		return ["-r", "tsconfig-paths/register", `./src/${entryPoint}.ts`];
	}

	return [`./src/${entryPoint}.ts`];
}

/**
 * Build the nodemon arguments for development mode.
 * Uses nodemon for file watching and tsx for TypeScript execution.
 * This combination ensures proper signal handling for graceful shutdown.
 *
 * Options:
 * - --quiet: Suppress nodemon verbose output, show only ExpressoTS logs (default)
 * - --signal SIGTERM: Ensure proper signal forwarding for graceful shutdown
 * - --delay 500ms: Debounce file changes to avoid rapid restarts
 *
 * @param opinionated - Whether to use opinionated configuration
 * @param verbose - Whether to show verbose nodemon output (for debugging)
 * @param clear - Whether to clear console on restart (default: true)
 * @returns The nodemon arguments array
 */
async function buildDevArgs(
	opinionated: boolean,
	verbose: boolean = false,
	clear: boolean = true,
): Promise<Array<string>> {
	const tsxArgs = await buildTsxArgs(opinionated);

	const args: Array<string> = [];

	// Suppress nodemon output unless verbose mode is enabled
	if (!verbose) {
		args.push("--quiet");
	}

	// Build the exec command with optional clear
	const clearCmd = clear
		? os.platform() === "win32"
			? "cls &&"
			: "clear &&"
		: "";
	const execCommand = `${clearCmd} tsx ${tsxArgs.join(" ")}`.trim();

	// Core nodemon configuration
	args.push(
		"--signal",
		"SIGTERM", // Use SIGTERM for graceful shutdown
		"--delay",
		"1000ms", // Debounce rapid file changes (allow time for port release)
		"--watch",
		"src",
		"--ext",
		"ts,json",
		"--ignore",
		"src/**/*.spec.ts",
		"--ignore",
		"src/**/*.test.ts",
		"--exec",
		execCommand,
	);

	return args;
}

/**
 * Dev command options interface
 */
interface DevCommandOptions {
	verbose?: boolean;
	clear?: boolean;
}

/**
 * Dev command module
 * @type {CommandModule<object, DevCommandOptions>}
 * @returns The command module
 */
export const devCommand: CommandModule<object, DevCommandOptions> = {
	command: "dev",
	describe: "Start development server.",
	builder: {
		verbose: {
			alias: "v",
			type: "boolean",
			default: false,
			description: "Show verbose nodemon output for debugging",
		},
		clear: {
			alias: "c",
			type: "boolean",
			default: true,
			description: "Clear console on restart (default: true)",
		},
	},
	handler: async (argv) => {
		await runCommand({
			command: "dev",
			verbose: argv.verbose,
			clear: argv.clear,
		});
	},
};

/**
 * Build command module
 * @type {CommandModule<object, object>}
 * @returns The command module
 */
export const buildCommand: CommandModule<object, object> = {
	command: "build",
	describe: "Build the project.",
	handler: async () => {
		await runCommand({ command: "build" });
	},
};

/**
 * Prod command module
 * @type {CommandModule<object, object>}
 * @returns The command module
 */
export const prodCommand: CommandModule<object, object> = {
	command: "prod",
	describe: "Run in production mode.",
	handler: async () => {
		await runCommand({ command: "prod" });
	},
};

/**
 * Helper function to execute a command
 * @param command The command to execute
 * @param args The arguments to pass to the command
 * @param cwd The current working directory to execute the command in
 * @returns A promise that resolves when the command completes successfully
 */
function execCmd(
	command: string,
	args: Array<string>,
	cwd: string = process.cwd(),
): Promise<void> {
	return new Promise((resolve, reject) => {
		const proc = spawn(command, args, {
			stdio: "inherit",
			shell: true,
			cwd,
		});

		proc.on("close", (code) => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`Command failed with code ${code}`));
			}
		});
	});
}

/**
 * Helper function to clean the dist directory
 */
const cleanDist = async (outDir: string): Promise<void> => {
	await fs.rm(outDir, { recursive: true, force: true });
	printSuccess(`Clean ${outDir} directory`, "clean-dist");
};

/**
 * Helper function to compile TypeScript
 */
const compileTypescript = async () => {
	await execCmd("npx", ["tsc", "-p", "tsconfig.build.json"]);
	printSuccess("Built successfully", "compile-typescript");
};

/**
 * Transform path aliases to relative paths in compiled JavaScript files.
 * This runs after TypeScript compilation to ensure production builds work
 * without runtime path resolution.
 *
 * @param outDir - The output directory (e.g., "./dist")
 */
const transformPathAliases = async (outDir: string): Promise<void> => {
	const tsconfigPath = join(process.cwd(), "tsconfig.build.json");

	if (!existsSync(tsconfigPath)) {
		return; // No tsconfig.build.json, skip transformation
	}

	const tsconfig = JSON.parse(readFileSync(tsconfigPath, "utf-8"));
	const paths = tsconfig.compilerOptions?.paths;
	const baseUrl = tsconfig.compilerOptions?.baseUrl;

	if (!paths || !baseUrl) {
		return; // No path aliases defined, skip
	}

	// Build regex patterns for each alias
	const aliasPatterns: Array<{
		pattern: RegExp;
		alias: string;
		target: string;
	}> = [];

	for (const [alias, targets] of Object.entries(paths)) {
		if (!Array.isArray(targets) || targets.length === 0) continue;

		// Convert @alias/* to regex pattern
		// Matches: require("@alias/something") or require('@alias/something')
		const aliasBase = alias.replace("/*", "");
		const targetBase = (targets[0] as string).replace("/*", "");

		// Pattern to match require("@alias/...") or require('@alias/...')
		const pattern = new RegExp(
			`require\\(["']${aliasBase.replace("@", "\\@")}/([^"']+)["']\\)`,
			"g",
		);

		aliasPatterns.push({
			pattern,
			alias: aliasBase,
			target: targetBase,
		});
	}

	if (aliasPatterns.length === 0) {
		return;
	}

	// Recursively find all .js files in outDir
	const findJsFiles = async (dir: string): Promise<Array<string>> => {
		const files: Array<string> = [];
		const entries = await fs.readdir(dir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = join(dir, entry.name);
			if (entry.isDirectory()) {
				files.push(...(await findJsFiles(fullPath)));
			} else if (entry.name.endsWith(".js")) {
				files.push(fullPath);
			}
		}

		return files;
	};

	const jsFiles = await findJsFiles(outDir);
	let transformedCount = 0;

	for (const file of jsFiles) {
		let content = await fs.readFile(file, "utf-8");
		let modified = false;

		// Get the directory of the current file relative to outDir
		const fileDir = path.dirname(file);

		for (const { pattern, alias, target } of aliasPatterns) {
			// Calculate the relative path from this file to the target
			const targetDir = join(outDir, baseUrl.replace("./", ""), target);
			let relativePath = path.relative(fileDir, targetDir);

			// Ensure it starts with ./ or ../
			if (!relativePath.startsWith(".")) {
				relativePath = "./" + relativePath;
			}

			// Replace Windows backslashes with forward slashes
			relativePath = relativePath.replace(/\\/g, "/");

			// Replace the alias with the relative path
			const newContent = content.replace(pattern, (match, subPath) => {
				modified = true;
				return `require("${relativePath}/${subPath}")`;
			});

			if (newContent !== content) {
				content = newContent;
			}
		}

		if (modified) {
			await fs.writeFile(file, content, "utf-8");
			transformedCount++;
		}
	}

	if (transformedCount > 0) {
		printSuccess(
			`Path aliases resolved in ${transformedCount} files`,
			"transform-paths",
		);
	}
};

/**
 * Helper function to copy files to the dist directory
 */
const copyFiles = async (outDir: string) => {
	// Only copy package.json - path aliases are resolved at build time
	// No need for tsconfig files or register-path.js in production
	const filesToCopy = ["package.json"];

	for (const file of filesToCopy) {
		if (existsSync(file)) {
			await fs.copyFile(file, join(outDir, path.basename(file)));
		}
	}
};

/**
 * Helper function to clear the screen
 */
const clearScreen = () => {
	const platform = os.platform();
	const command = platform === "win32" ? "cls" : "clear";
	spawn(command, { stdio: "inherit", shell: true });
};

/**
 * Run command options
 */
interface RunCommandOptions {
	command: string;
	verbose?: boolean;
	clear?: boolean;
}

/**
 * Helper function to run a command
 * @param options The command options
 */
export const runCommand = async ({
	command,
	verbose = false,
	clear = true,
}: RunCommandOptions): Promise<void> => {
	const { opinionated, entryPoint } = await Compiler.loadConfig();
	const outDir = getOutDir();

	try {
		switch (command) {
			case "dev":
				await execCmd(
					"nodemon",
					await buildDevArgs(opinionated, verbose, clear),
				);
				break;
			case "build":
				if (!outDir) {
					printError(
						"Cannot build project. Please provide an outDir in tsconfig.build.json",
						"build-command",
					);
					process.exit(1);
				}
				await cleanDist(outDir);
				await compileTypescript();
				// Transform path aliases to relative paths for production
				if (opinionated) {
					await transformPathAliases(outDir);
				}
				await copyFiles(outDir);
				break;
			case "prod": {
				if (!outDir) {
					printError(
						"Cannot run in prod mode. Please provide an outDir in tsconfig.build.json",
						"prod-command",
					);
					process.exit(1);
				}

				let config: Array<string> = [];

				// ✅ NEW: Simplified - no more register-path.js
				// Path resolution is now built-in to @expressots/core
				if (opinionated) {
					config = [`./${outDir}/src/${entryPoint}.js`];
				} else {
					config = [`./${outDir}/${entryPoint}.js`];
				}
				clearScreen();
				await execCmd("node", config);
				break;
			}
			default:
				printError(`Unknown command: `, command);
				break;
		}
	} catch (error: Error | any) {
		printError("Error executing command:", error.message);
		process.exit(1);
	}
};
