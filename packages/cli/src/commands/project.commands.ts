import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { Argv, CommandModule } from "yargs";
import Compiler from "../utils/compiler";

/**
 * Load the configuration from the compiler
 * @param compiler The compiler to load the configuration from
 * @returns The configuration
 */

const opinionatedConfig: Array<string> = [
	"--transpile-only",
	"-r",
	"dotenv/config",
	"-r",
	"tsconfig-paths/register",
	"./src/main.ts",
];

const nonOpinionatedConfig: Array<string> = [
	"--transpile-only",
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
};

// Helper to compile TypeScript
const compileTypescript = async () => {
	await execCmd("npx", ["tsc", "-p", "tsconfig.build.json"]);
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

// eslint-disable-next-line @typescript-eslint/ban-types
export const runCommandModule: CommandModule<{}, { command: string }> = {
	command: "run <command>",
	describe: "Run command (dev, build, prod).",
	builder: (yargs: Argv) => {
		return yargs.positional("command", {
			describe: "The command to run",
			type: "string",
			choices: ["dev", "build", "prod"],
		});
	},
	handler: async (argv) => {
		const { command } = argv;
		// Now call your original runCommand function with the command
		// Ensure runCommand is properly defined to handle these commands
		await runCommand({ command });
	},
};

const runCommand = async ({ command }: { command: string }): Promise<void> => {
	const { opinionated } = await Compiler.loadConfig();
	try {
		switch (command) {
			case "dev":
				// Use execSync or spawn to run ts-node-dev programmatically
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
				// Ensure environment variables are set
				execCmd("node", config);
				break;
			}
			default:
				console.log(`Unknown command: ${command}`);
		}
	} catch (error) {
		console.error("Error executing command:", error);
	}
};

export { runCommand };
