import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { Argv, CommandModule } from "yargs";
import { printError, printSuccess } from "../utils/cli-ui";
import Compiler from "../utils/compiler";
import os from "os";

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

// Helper to delete the dist directory
const cleanDist = async (): Promise<void> => {
	await fs.rm("./dist", { recursive: true, force: true });
	printSuccess("Deleted dist directory", "clean-dist");
};

// Helper to compile TypeScript
const compileTypescript = async () => {
	await execCmd("npx", ["tsc", "-p", "tsconfig.build.json"]);
	printSuccess("Built successfully", "compile-typescript");
};

// Helper to copy files
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
		fs.copyFile(file, path.join("./dist", path.basename(file)));
	});
};

// Helper clear screen
const clearScreen = () => {
	const platform = os.platform();
	const command = platform === "win32" ? "cls" : "clear";
	spawn(command, { stdio: "inherit", shell: true });
};

export const devCommand: CommandModule<object, object> = {
	command: "dev",
	describe: "Start development server.",
	handler: async () => {
		await runCommand({ command: "dev" });
	},
};

export const buildCommand: CommandModule<object, object> = {
	command: "build",
	describe: "Build the project.",
	handler: async () => {
		await runCommand({ command: "build" });
	},
};

export const prodCommand: CommandModule<object, object> = {
	command: "prod",
	describe: "Run in production mode.",
	handler: async () => {
		await runCommand({ command: "prod" });
	},
};

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
						"./dist/register-path.js",
						"./dist/src/main.js",
					];
				} else {
					config = ["-r", "dotenv/config", "./dist/main.js"];
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
