import chalk from "chalk";
import { exit } from "node:process";
import { printError } from "../../utils/cli-ui";
import {
	isValidPackageName,
	isValidVersion,
} from "../../utils/input-validation";
import { safeSpawn } from "../../utils/safe-spawn";
import {
	detectPackageManager,
	getAddPackageArgs,
	getRemovePackageArgs,
} from "../../utils/package-manager-commands";

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
		// `safeSpawn` (cross-spawn) resolves the Windows `.cmd` shim and
		// applies cmd.exe-aware escaping for every argv entry. Combined
		// with the `isValidPackageName` / `isValidVersion` guards on the
		// caller side, this prevents command injection via the package
		// name or version specifier (which can legitimately contain
		// `>`, `<`, `|`, etc. in a semver range).
		const processRunner = safeSpawn(command, args, {
			cwd: directory,
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
	version?: string | false,
	isDevDependency = false,
): Promise<void> {
	if (!isValidPackageName(packageName)) {
		printError(
			`Invalid package name: ${JSON.stringify(packageName)}`,
			"add-package",
		);
		return;
	}

	// yargs assigns `false` for the version flag when the user omits
	// it (see add/cli.ts). Treat that and "latest" as "no suffix".
	let versionSuffix = "";
	if (typeof version === "string" && version !== "latest") {
		if (!isValidVersion(version)) {
			printError(
				`Invalid version specifier: ${JSON.stringify(version)}`,
				"add-package",
			);
			return;
		}
		versionSuffix = `@${version}`;
	}

	const packageManager = detectPackageManager();

	if (!packageManager) {
		printError("No package manager found in the project", "add-package");
		return;
	}

	const args = getAddPackageArgs(packageManager, { dev: isDevDependency });

	console.log(
		`${isDevDependency ? "Adding devDependency" : "Installing"} ${packageName}...`,
	);
	await execProcess({
		command: packageManager,
		args: [...args, `${packageName}${versionSuffix}`],
		directory: process.cwd(),
	});
}

export async function removeProvider(packageName: string): Promise<void> {
	if (!isValidPackageName(packageName)) {
		printError(
			`Invalid package name: ${JSON.stringify(packageName)}`,
			"remove-package",
		);
		return;
	}

	const packageManager = detectPackageManager();

	if (!packageManager) {
		printError("No package manager found in the project", "remove-package");
		return;
	}

	const args = getRemovePackageArgs(packageManager);

	console.log(`Removing ${packageName}...`);
	await execProcess({
		command: packageManager,
		args: [...args, packageName],
		directory: process.cwd(),
	});
}
