import chalk from "chalk";
import { spawn } from "node:child_process";
import fs from "node:fs";
import { exit } from "node:process";
import { printError } from "../../utils/cli-ui";

type PackageManagerConfig = {
	install: string;
	addDev: string;
	remove: string;
};

type PackageManager = {
	npm: PackageManagerConfig;
	yarn: PackageManagerConfig;
	pnpm: PackageManagerConfig;
};

const PACKAGE_MANAGERS: PackageManager = {
	npm: {
		install: "install",
		addDev: "install --save-dev",
		remove: "uninstall",
	},
	yarn: {
		install: "add",
		addDev: "add --dev",
		remove: "remove",
	},
	pnpm: {
		install: "add",
		addDev: "add --save-dev",
		remove: "remove",
	},
};

function detectPackageManager(): string | null {
	const lockFiles = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml"];
	const managers = Object.keys(PACKAGE_MANAGERS);

	for (let i = 0; i < lockFiles.length; i++) {
		if (fs.existsSync(lockFiles[i])) {
			return managers[i];
		}
	}
	return null;
}

async function execProcess({
	command,
	args,
	directory,
}: {
	command: string;
	args: string[];
	directory: string;
}): Promise<void> {
	return new Promise((resolve, reject) => {
		const isWindows = process.platform === "win32";
		const execCommand = isWindows ? `${command}.cmd` : command;

		const processRunner = spawn(execCommand, args, {
			cwd: directory,
			shell: true,
		});

		console.log(chalk.bold.blue(`Executing: ${command} ${args.join(" ")}`));
		console.log(
			chalk.yellow("-------------------------------------------------"),
		);

		processRunner.stdout.on("data", (data) => {
			console.log(chalk.green(data.toString().trim()));
		});

		processRunner.stderr.on("data", (data) => {
			console.error(chalk.red(data.toString().trim()));
		});

		processRunner.on("close", (code) => {
			if (code === 0) {
				console.log(
					chalk.bold.green("Operation completed successfully!\n"),
				);
				resolve();
			} else {
				console.error(
					chalk.bold.red(`Command failed with exit code ${code}`),
				);
				reject(new Error(`Command failed with exit code ${code}`));
				exit(1);
			}
		});
	});
}

export async function addProvider(
	packageName: string,
	version?: string,
	isDevDependency = false,
): Promise<void> {
	const packageManager = detectPackageManager();

	if (!packageManager) {
		printError("No package manager found in the project", "add-package");
		return;
	}

	const pkgManagerConfig: PackageManagerConfig =
		PACKAGE_MANAGERS[packageManager as keyof PackageManager];

	const command = isDevDependency
		? pkgManagerConfig.addDev
		: pkgManagerConfig.install;
	const versionSuffix = version && version !== "latest" ? `@${version}` : "";

	console.log(
		`${isDevDependency ? "Adding devDependency" : "Installing"} ${packageName}...`,
	);
	await execProcess({
		command: packageManager,
		args: [...command.split(" "), `${packageName}${versionSuffix}`],
		directory: process.cwd(),
	});
}

export async function removeProvider(packageName: string): Promise<void> {
	const packageManager = detectPackageManager();

	if (!packageManager) {
		printError("No package manager found in the project", "remove-package");
		return;
	}

	const command =
		PACKAGE_MANAGERS[packageManager as keyof PackageManager].remove;

	console.log(`Removing ${packageName}...`);
	await execProcess({
		command: packageManager,
		args: [...command.split(" "), packageName],
		directory: process.cwd(),
	});
}
