import { spawn } from "child_process";
import { promises as fs, readFileSync } from "fs";
import os from "os";
import path, { join } from "path";
import { CommandModule } from "yargs";
import { printError, printSuccess } from "../utils/cli-ui";
import Compiler from "../utils/compiler";

/**
 * Load tsconfig path and extract outDir
 */
const tsconfigBuildPath = join(process.cwd(), "tsconfig.build.json");
const tsconfig = JSON.parse(readFileSync(tsconfigBuildPath, "utf-8"));
const outDir = tsconfig.compilerOptions.outDir || "dist";

/**
 * Load the configuration from the compiler
 * @param compiler The compiler to load the configuration from
 * @returns The configuration
 */
const opinionatedConfig: Array<string> = [
	"--transpile-only",
	"--clear",
	"-r",
	"dotenv/config",
	"-r",
	"tsconfig-paths/register",
	"./src/main.ts",
];

const nonOpinionatedConfig: Array<string> = [
	"--transpile-only",
	"--clear",
	"-r",
	"dotenv/config",
	"./src/main.ts",
];

/**
 * Dev command module
 * @type {CommandModule<object, object>}
 * @returns The command module
 */
export const devCommand: CommandModule<object, object> = {
	command: "dev",
	describe: "Start development server.",
	handler: async () => {
		await runCommand({ command: "dev" });
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
const cleanDist = async (): Promise<void> => {
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
 * Helper function to copy files to the dist directory
 */
const copyFiles = async () => {
	const { opinionated } = await Compiler.loadConfig();
	let filesToCopy: Array<string> = [];
	if (opinionated) {
		filesToCopy = [
			"./register-path.js",
			"tsconfig.build.json",
			"package.json",
		];
	} else {
		filesToCopy = ["tsconfig.json", "package.json"];
	}
	filesToCopy.forEach((file) => {
		fs.copyFile(file, join(outDir, path.basename(file)));
	});
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
 * Helper function to run a command
 * @param command The command to run
 */
export const runCommand = async ({
	command,
}: {
	command: string;
}): Promise<void> => {
	const { opinionated } = await Compiler.loadConfig();

	try {
		switch (command) {
			case "dev":
				execCmd(
					"tsnd",
					opinionated ? opinionatedConfig : nonOpinionatedConfig,
				);
				break;
			case "build":
				await cleanDist();
				await compileTypescript();
				await copyFiles();
				break;
			case "prod": {
				let config: Array<string> = [];
				if (opinionated) {
					config = [
						"-r",
						"dotenv/config",
						"-r",
						`./${outDir}/register-path.js`,
						`./${outDir}/src/main.js`,
					];
				} else {
					config = ["-r", "dotenv/config", `./${outDir}/main.js`];
				}
				clearScreen();
				execCmd("node", config);
				break;
			}
			default:
				printError(`Unknown command: `, command);
				break;
		}
	} catch (error: Error | any) {
		printError("Error executing command:", error.message);
	}
};
