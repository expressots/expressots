import fs from "fs";
import path from "path";
import chalk from "chalk";
import { spawn, execSync, SpawnOptions } from "child_process";

export interface DevOptions {
	container: boolean;
	service: string;
	composeFile: string;
	build: boolean;
	detach: boolean;
	port?: number;
	debugPort: number;
	watch: boolean;
	follow: boolean;
	tail: number;
}

/**
 * Start development container with hot reload
 */
export async function startDevContainer(options: DevOptions): Promise<void> {
	console.log(chalk.cyan("\n🐳 ExpressoTS Container Development\n"));

	const cwd = process.cwd();
	const composeFile = path.join(cwd, options.composeFile);

	// Check if docker-compose file exists
	if (!fs.existsSync(composeFile)) {
		console.log(chalk.yellow(`⚠️  ${options.composeFile} not found.`));
		console.log(
			chalk.gray("Generating development Docker configuration..."),
		);

		// Try to generate if containerize is available
		console.log(
			chalk.gray("\nRun the following to generate development config:"),
		);
		console.log(
			chalk.white(`  expressots containerize docker --env development`),
		);
		console.log();
		return;
	}

	// Check if Docker is running
	if (!isDockerRunning()) {
		console.log(chalk.red("Error: Docker is not running."));
		console.log(
			chalk.gray("Please start Docker Desktop or Docker daemon."),
		);
		return;
	}

	console.log(chalk.yellow(`📄 Using ${options.composeFile}`));

	// Build arguments
	const args: string[] = ["-f", composeFile];

	if (options.build) {
		console.log(chalk.yellow("🔨 Building containers..."));
		runDockerCompose([...args, "build"], { cwd });
	}

	// Start containers
	console.log(chalk.yellow("🚀 Starting development containers..."));

	const upArgs = [...args, "up"];
	if (options.detach) {
		upArgs.push("-d");
	}

	// Set environment variables
	const env: NodeJS.ProcessEnv = {
		...process.env,
	};

	if (options.port) {
		env.PORT = String(options.port);
	}
	env.DEBUG_PORT = String(options.debugPort);

	if (options.detach) {
		runDockerCompose(upArgs, { cwd, env });
		console.log(
			chalk.green("\n✅ Development containers started in background.\n"),
		);
		printDevInfo(options);
	} else {
		console.log(chalk.green("\n✅ Starting development environment...\n"));
		printDevInfo(options);
		console.log(chalk.gray("Press Ctrl+C to stop\n"));

		// Run in foreground
		spawnDockerCompose(upArgs, { cwd, env, stdio: "inherit" });
	}
}

/**
 * Stop development containers
 */
export async function stopDevContainer(options: DevOptions): Promise<void> {
	console.log(chalk.cyan("\n🛑 Stopping development containers...\n"));

	const cwd = process.cwd();
	const composeFile = path.join(cwd, options.composeFile);

	if (!fs.existsSync(composeFile)) {
		// Try default compose file
		const defaultCompose = path.join(cwd, "docker-compose.yml");
		if (fs.existsSync(defaultCompose)) {
			runDockerCompose(["-f", defaultCompose, "down"], { cwd });
		} else {
			console.log(chalk.yellow("No docker-compose file found."));
		}
		return;
	}

	runDockerCompose(["-f", composeFile, "down"], { cwd });
	console.log(chalk.green("✅ Development containers stopped."));
}

/**
 * Attach to running container
 */
export async function attachToContainer(options: DevOptions): Promise<void> {
	console.log(chalk.cyan(`\n🔗 Attaching to ${options.service}...\n`));

	const cwd = process.cwd();
	const composeFile = path.join(cwd, options.composeFile);

	if (!fs.existsSync(composeFile)) {
		console.log(chalk.red(`Error: ${options.composeFile} not found.`));
		return;
	}

	spawnDockerCompose(["-f", composeFile, "attach", options.service], {
		cwd,
		stdio: "inherit",
	});
}

/**
 * Open shell in container
 */
export async function openShell(options: DevOptions): Promise<void> {
	console.log(chalk.cyan(`\n🐚 Opening shell in ${options.service}...\n`));

	const cwd = process.cwd();
	const composeFile = path.join(cwd, options.composeFile);

	if (!fs.existsSync(composeFile)) {
		console.log(chalk.red(`Error: ${options.composeFile} not found.`));
		return;
	}

	// Try sh first (Alpine), fall back to bash
	spawnDockerCompose(["-f", composeFile, "exec", options.service, "sh"], {
		cwd,
		stdio: "inherit",
	});
}

/**
 * Show status of development containers
 */
export async function showStatus(options: DevOptions): Promise<void> {
	console.log(chalk.cyan("\n📊 Development Container Status\n"));

	const cwd = process.cwd();
	const composeFile = path.join(cwd, options.composeFile);

	if (!fs.existsSync(composeFile)) {
		// Try default compose
		const defaultCompose = path.join(cwd, "docker-compose.yml");
		if (fs.existsSync(defaultCompose)) {
			runDockerCompose(["-f", defaultCompose, "ps"], { cwd });
		} else {
			console.log(chalk.yellow("No docker-compose file found."));
		}
		return;
	}

	runDockerCompose(["-f", composeFile, "ps"], { cwd });

	// Show resource usage
	console.log(chalk.bold("\nResource Usage:"));
	try {
		// Use double quotes for cross-platform compatibility (Windows + Unix)
		const output = execSync(
			'docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"',
			{
				encoding: "utf-8",
				stdio: ["pipe", "pipe", "pipe"],
			},
		);
		console.log(output);
	} catch {
		console.log(chalk.gray("  Unable to get resource stats"));
	}
}

/**
 * Show container logs
 */
export async function showLogs(options: DevOptions): Promise<void> {
	console.log(chalk.cyan(`\n📜 Logs for ${options.service}\n`));

	const cwd = process.cwd();
	const composeFile = path.join(cwd, options.composeFile);

	if (!fs.existsSync(composeFile)) {
		console.log(chalk.red(`Error: ${options.composeFile} not found.`));
		return;
	}

	const args = ["-f", composeFile, "logs"];

	if (options.follow) {
		args.push("-f");
	}

	args.push("--tail", String(options.tail));
	args.push(options.service);

	spawnDockerCompose(args, { cwd, stdio: "inherit" });
}

/**
 * Check if Docker is running
 */
function isDockerRunning(): boolean {
	try {
		execSync("docker info", { stdio: ["pipe", "pipe", "pipe"] });
		return true;
	} catch {
		return false;
	}
}

/**
 * Run docker-compose command synchronously
 */
function runDockerCompose(
	args: string[],
	options: { cwd: string; env?: NodeJS.ProcessEnv },
): void {
	try {
		// Try docker compose (v2) first
		execSync(`docker compose ${args.join(" ")}`, {
			cwd: options.cwd,
			env: options.env || process.env,
			stdio: "inherit",
		});
	} catch {
		// Fall back to docker-compose (v1)
		try {
			execSync(`docker-compose ${args.join(" ")}`, {
				cwd: options.cwd,
				env: options.env || process.env,
				stdio: "inherit",
			});
		} catch (error) {
			console.log(chalk.red("Error running docker-compose"));
			throw error;
		}
	}
}

/**
 * Spawn docker-compose command (for interactive/streaming)
 */
function spawnDockerCompose(args: string[], options: SpawnOptions): void {
	// Try docker compose (v2) first
	const proc = spawn("docker", ["compose", ...args], {
		...options,
		shell: true,
	});

	proc.on("error", () => {
		// Fall back to docker-compose (v1)
		spawn("docker-compose", args, {
			...options,
			shell: true,
		});
	});
}

/**
 * Print development info
 */
function printDevInfo(options: DevOptions): void {
	console.log(chalk.bold("Development Environment:"));
	console.log(`  🌐 App:      http://localhost:${options.port || 3000}`);
	console.log(`  🔍 Debug:    localhost:${options.debugPort}`);
	console.log(`  📁 Service:  ${options.service}`);
	console.log();
	console.log(chalk.bold("Available Commands:"));
	console.log(
		`  ${chalk.gray("expressots container-dev status")}   Show container status`,
	);
	console.log(
		`  ${chalk.gray("expressots container-dev logs")}     View logs`,
	);
	console.log(
		`  ${chalk.gray("expressots container-dev shell")}    Open shell in container`,
	);
	console.log(
		`  ${chalk.gray("expressots container-dev stop")}     Stop containers`,
	);
	console.log();

	if (options.watch) {
		console.log(
			chalk.green("🔄 Hot reload is enabled - edit files to see changes"),
		);
	}
}
