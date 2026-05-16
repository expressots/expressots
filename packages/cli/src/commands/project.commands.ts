import { spawn } from "child_process";
import {
	promises as fs,
	readFileSync,
	existsSync,
	mkdirSync,
	readdirSync,
} from "fs";
import os from "os";
import path, { join } from "path";
import chalk from "chalk";
import { CommandModule } from "yargs";
import { printError, printSuccess } from "../utils/cli-ui";
import Compiler from "../utils/compiler";
import { safeSpawn, safeSpawnSync } from "../utils/safe-spawn";

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

	let tsconfig: { compilerOptions?: { outDir?: string } };
	try {
		tsconfig = JSON.parse(readFileSync(tsconfigBuildPath, "utf-8"));
	} catch (err) {
		printError(
			`Failed to parse tsconfig.build.json: ${(err as Error).message}`,
			"tsconfig-build-path",
		);
		process.exit(1);
	}

	const outDir = tsconfig.compilerOptions?.outDir;

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
 * Build the tsx watch arguments for development mode.
 * Uses tsx's built-in --watch flag for reliable cross-platform file watching
 * (avoids nodemon + SIGTERM issues on Windows).
 *
 * @param opinionated - Whether to use opinionated configuration
 * @returns The tsx arguments array
 */
async function buildDevArgs(opinionated: boolean): Promise<Array<string>> {
	const { entryPoint, sourceRoot } = await Compiler.loadConfig();

	const args: Array<string> = ["--watch"];

	if (opinionated) {
		args.push("-r", "tsconfig-paths/register");
	}

	// Honor `sourceRoot` from expressots.config.ts so projects whose
	// source lives under a non-default folder (e.g. `api/` or
	// `services/`) still resolve their entry point correctly.
	args.push(`./${sourceRoot}/${entryPoint}.ts`);

	return args;
}

/**
 * Dev command options interface
 */
interface DevCommandOptions {
	container?: boolean;
	build?: boolean;
	detach?: boolean;
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
		container: {
			alias: "c",
			type: "boolean",
			default: false,
			description: "Run development inside Docker container",
		},
		build: {
			alias: "b",
			type: "boolean",
			default: false,
			description: "Rebuild container before starting (with --container)",
		},
		detach: {
			alias: "d",
			type: "boolean",
			default: false,
			description: "Run container in background (with --container)",
		},
	},
	handler: async (argv) => {
		if (argv.container) {
			await runContainerDev({
				build: argv.build ?? false,
				detach: argv.detach ?? false,
			});
		} else {
			await runCommand({ command: "dev" });
		}
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
		// `safeSpawn` (cross-spawn) resolves Windows `.cmd` shims (npx,
		// tsx, tsc, etc.) via PATHEXT and applies cmd.exe-aware escaping
		// for every argv entry, while falling through to plain `spawn`
		// with `shell: false` on Unix.
		const proc = safeSpawn(command, args, {
			stdio: "inherit",
			cwd,
		});

		proc.on("error", (err) => reject(err));
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

	let tsconfig: {
		compilerOptions?: {
			paths?: Record<string, string[]>;
			baseUrl?: string;
		};
	};
	try {
		tsconfig = JSON.parse(readFileSync(tsconfigPath, "utf-8"));
	} catch (err) {
		printError(
			`Failed to parse tsconfig.build.json for path-alias transform: ${(err as Error).message}`,
			"transform-paths",
		);
		return;
	}
	const paths = tsconfig.compilerOptions?.paths;
	// `baseUrl` is deprecated in TypeScript 7. When it's omitted the path
	// targets are resolved relative to the tsconfig file itself, which is
	// the project root in our generated templates — so default to ".".
	const baseUrl = tsconfig.compilerOptions?.baseUrl ?? ".";

	if (!paths) {
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
	// `cls` and `clear` are built-ins / well-known executables.
	// Invoking them via `shell: true` is safe here because there are no
	// user-controlled args, but we keep `windowsHide: true` to suppress
	// the Windows console flash.
	const platform = os.platform();
	const command = platform === "win32" ? "cls" : "clear";
	spawn(command, [], { stdio: "inherit", shell: true, windowsHide: true });
};

/**
 * Container dev options
 */
interface ContainerDevOptions {
	build: boolean;
	detach: boolean;
}

/**
 * Run development in Docker container with auto-setup
 * This is the seamless "just works" experience
 */
async function runContainerDev(options: ContainerDevOptions): Promise<void> {
	console.log(chalk.cyan("\n🐳 ExpressoTS Container Development\n"));

	const cwd = process.cwd();
	const composeDevFile = join(cwd, "docker-compose.development.yml");
	const dockerfileDevFile = join(cwd, "Dockerfile.development");
	const dockerSetupFile = join(cwd, "docker-setup.js");
	const dockerDepsDir = join(cwd, ".docker-deps");
	const packageDockerJson = join(cwd, "package.docker.json");

	// Check if Docker is running
	if (!isDockerRunning()) {
		console.log(chalk.red("❌ Docker is not running."));
		console.log(
			chalk.gray("   Please start Docker Desktop or Docker daemon."),
		);
		return;
	}

	// Step 1: Auto-generate Docker files if missing
	if (!existsSync(dockerfileDevFile) || !existsSync(composeDevFile)) {
		console.log(chalk.yellow("📝 Docker files not found. Generating..."));

		try {
			// Import and run containerize
			const { containerizeProject } = await import(
				"../containerize/form"
			);
			await containerizeProject({
				target: "docker",
				environment: "development",
				preset: "standard",
				analyze: true,
				skipCompose: false,
				includeCi: false,
			});
			console.log();
		} catch (error) {
			console.log(chalk.red("❌ Failed to generate Docker files."));
			console.log(
				chalk.gray(
					"   Run manually: expressots containerize docker --env development",
				),
			);
			return;
		}
	}

	// Step 1.5: Check bootstrap config and create missing env files if needed
	try {
		const {
			analyzeBootstrapConfig,
			shouldCopyEnvFiles,
			getEnvFileForEnvironment,
		} = await import("../containerize/analyzers/bootstrap-analyzer");
		const bootstrapConfig = await analyzeBootstrapConfig();

		if (
			bootstrapConfig.hasEnvFileConfig &&
			shouldCopyEnvFiles(bootstrapConfig)
		) {
			const devEnvFile = getEnvFileForEnvironment(
				bootstrapConfig,
				"development",
			);

			// Check if required env file is missing
			if (bootstrapConfig.missingEnvFiles.includes(devEnvFile)) {
				console.log(
					chalk.yellow(
						`⚠️  Required env file missing: ${devEnvFile}`,
					),
				);

				// Auto-create template if configured or prompt user
				if (bootstrapConfig.autoCreateTemplate) {
					console.log(
						chalk.gray(`   Creating template ${devEnvFile}...`),
					);
					await createEnvTemplate(
						cwd,
						devEnvFile,
						"development",
						bootstrapConfig.requiredVariables,
					);
					console.log(chalk.green(`   ✓ Created ${devEnvFile}`));
				} else {
					// Provide helpful instructions
					console.log(chalk.cyan("\n💡 To fix this, either:"));
					console.log(
						chalk.gray(
							`   1. Create ${devEnvFile} with your environment variables`,
						),
					);
					console.log(
						chalk.gray(
							`   2. Add autoCreateTemplate: true to envFileConfig in bootstrap`,
						),
					);
					console.log(
						chalk.gray(
							`   3. Use skipFileLoading: true for container deployments`,
						),
					);
					console.log();

					// Still continue - the container might work if env vars are set in docker-compose
					console.log(
						chalk.yellow(
							`   ⚠️  Container may fail if ${devEnvFile} is required`,
						),
					);
					console.log();
				}
			}

			// Show required variables that need to be set
			if (bootstrapConfig.requiredVariables.length > 0) {
				console.log(chalk.cyan("📋 Required environment variables:"));
				bootstrapConfig.requiredVariables.forEach((varName) => {
					console.log(chalk.gray(`   • ${varName}`));
				});
				console.log(
					chalk.gray(
						`   Set these in ${devEnvFile} or docker-compose.development.yml`,
					),
				);
				console.log();
			}
		}
	} catch (error) {
		// Non-fatal - continue with container startup
		console.log(chalk.gray("   (Bootstrap analysis skipped)"));
	}

	// Step 2: Auto-run docker:setup if local dependencies exist
	if (existsSync(packageDockerJson) && existsSync(dockerSetupFile)) {
		// Check if .docker-deps needs to be updated
		const needsSetup =
			!existsSync(dockerDepsDir) || isDirEmpty(dockerDepsDir);

		if (needsSetup) {
			console.log(chalk.yellow("📦 Setting up local dependencies..."));
			try {
				const setupResult = safeSpawnSync(
					process.execPath,
					["docker-setup.js"],
					{
						cwd,
						stdio: "inherit",
						encoding: "utf-8",
					},
				);
				if (setupResult.error) throw setupResult.error;
				if (
					typeof setupResult.status === "number" &&
					setupResult.status !== 0
				) {
					throw new Error(`exited with code ${setupResult.status}`);
				}
				console.log();
			} catch (error) {
				console.log(
					chalk.red("❌ Failed to setup local dependencies."),
				);
				console.log(
					chalk.gray("   Run manually: npm run docker:setup"),
				);
				return;
			}
		}
	}

	// Step 3: Start the containers
	console.log(chalk.yellow(`📄 Using docker-compose.development.yml`));

	const args: string[] = ["-f", composeDevFile, "up"];

	if (options.build) {
		console.log(chalk.yellow("🔨 Rebuilding containers..."));
		args.splice(2, 0, "--build");
	}

	if (options.detach) {
		args.push("-d");
	}

	console.log(chalk.yellow("🚀 Starting development containers...\n"));

	// Print dev info
	console.log(chalk.bold("Development Environment:"));
	console.log(`  🌐 App:      http://localhost:3000`);
	console.log(`  🔍 Debug:    localhost:9229`);
	console.log();
	console.log(chalk.bold("Commands:"));
	console.log(
		`  ${chalk.gray("expressots dev -c")}           Start containers`,
	);
	console.log(
		`  ${chalk.gray("expressots dev -c -b")}        Rebuild & start`,
	);
	console.log(
		`  ${chalk.gray("expressots dev -c -d")}        Start in background`,
	);
	console.log(
		`  ${chalk.gray("docker-compose -f docker-compose.development.yml down")}  Stop`,
	);
	console.log();
	console.log(
		chalk.green("🔄 Hot reload enabled - edit files to see changes"),
	);

	if (!options.detach) {
		console.log(chalk.gray("Press Ctrl+C to stop\n"));
	}

	// Run docker-compose
	runDockerComposeCommand(args, cwd, options.detach);

	if (options.detach) {
		console.log(chalk.green("\n✅ Containers started in background."));
		console.log(
			chalk.gray(
				"   View logs: docker-compose -f docker-compose.development.yml logs -f",
			),
		);
	}
}

/**
 * Check if Docker is running
 */
function isDockerRunning(): boolean {
	const result = safeSpawnSync("docker", ["info"], {
		stdio: ["pipe", "pipe", "pipe"],
	});
	return !result.error && result.status === 0;
}

/**
 * Check if directory is empty
 */
function isDirEmpty(dir: string): boolean {
	try {
		const files = readdirSync(dir);
		return files.length === 0;
	} catch {
		return true;
	}
}

/**
 * Create an environment template file
 */
async function createEnvTemplate(
	cwd: string,
	fileName: string,
	environment: string,
	requiredVariables: string[],
): Promise<void> {
	const filePath = join(cwd, fileName);

	const commonVars = [
		"PORT=3000",
		`NODE_ENV=${environment}`,
		"# Add your environment variables below",
	];

	const requiredVars = requiredVariables.map((key) => `${key}=`);
	const template = [...commonVars, ...requiredVars].join("\n");

	await fs.writeFile(filePath, template, "utf-8");
}

/**
 * Run docker-compose command
 */
function runDockerComposeCommand(
	args: string[],
	cwd: string,
	detach: boolean,
): void {
	// Try docker compose (v2) first, fall back to docker-compose (v1).
	// `safeSpawnSync` (cross-spawn) handles platform-specific binary
	// resolution and cmd.exe-aware argv escaping, so compose file paths
	// and service names are forwarded as discrete arguments rather than
	// re-interpreted by the OS shell.
	const v2 = safeSpawnSync("docker", ["compose", ...args], {
		cwd,
		stdio: "inherit",
	});

	if (v2.error || (typeof v2.status === "number" && v2.status !== 0)) {
		const v1 = safeSpawnSync("docker-compose", args, {
			cwd,
			stdio: "inherit",
		});

		if (v1.error || (typeof v1.status === "number" && v1.status !== 0)) {
			console.log(chalk.red("Error running docker-compose"));
		}
	}

	// `detach` is honored implicitly by docker compose itself when "-d"
	// is present in `args`. The previous branch tried to switch between
	// execSync and spawnSync for that case, which served no real
	// purpose and made shell injection harder to reason about.
	void detach;
}

/**
 * Run command options
 */
interface RunCommandOptions {
	command: string;
}

/**
 * Helper function to run a command
 * @param options The command options
 */
export const runCommand = async ({
	command,
}: RunCommandOptions): Promise<void> => {
	const { opinionated, entryPoint, sourceRoot } = await Compiler.loadConfig();
	const outDir = getOutDir();

	try {
		switch (command) {
			case "dev":
				await execCmd("tsx", await buildDevArgs(opinionated));
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

				// Honor `sourceRoot` so the compiled entry-point path
				// matches whatever folder the user configured (the TS
				// compiler preserves the source tree under `outDir`).
				const config = [`./${outDir}/${sourceRoot}/${entryPoint}.js`];
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
