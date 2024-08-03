import chalk from "chalk";
import { spawn } from "node:child_process";
import fs from "node:fs";
import { exit } from "node:process";
import { printError } from "../../utils/cli-ui";

export const addExternalProvider = async (
	provider: string,
	version: string,
): Promise<void> => {
	await installProvider(provider, version);
};

async function installProvider(provider: string, version: string) {
	const packageManager = fs.existsSync(
		"package-lock.json" || "yarn.lock" || "pnpm-lock.yaml",
	)
		? "npm"
		: fs.existsSync("yarn.lock")
			? "yarn"
			: fs.existsSync("pnpm-lock.yaml")
				? "pnpm"
				: null;

	if (packageManager) {
		console.log(`Installing ${provider} provider ...`);
		const currentVersion = version === "latest" ? "" : `@${version}`;
		await execProcess({
			commandArg: packageManager,
			args: ["add", `${provider}${currentVersion}`, "--prefer-offline"],
			directory: process.cwd(),
		});
	} else {
		printError(
			"No package manager found in the project",
			"install-provider",
		);
		return;
	}
}

async function execProcess({
	commandArg,
	args,
	directory,
}: {
	commandArg: string;
	args: string[];
	directory: string;
}) {
	return new Promise((resolve, reject) => {
		const isWindows: boolean = process.platform === "win32";
		const command: string = isWindows ? `${commandArg}.cmd` : commandArg;

		const installProcess = spawn(command, args, {
			cwd: directory,
			shell: true,
		});

		console.log(
			chalk.bold.blue(`Executing: ${commandArg} ${args.join(" ")}`),
		);
		console.log(
			chalk.yellow("-------------------------------------------------"),
		);

		installProcess.stdout.on("data", (data) => {
			console.log(chalk.green(data.toString().trim())); // Display regular messages in green
		});

		installProcess.stderr.on("data", (data) => {
			console.error(chalk.red(data.toString().trim())); // Display error messages in red
		});

		installProcess.on("close", (code) => {
			if (code === 0) {
				console.log(
					chalk.bold.green(
						"-------------------------------------------------",
					),
				);
				console.log(chalk.bold.green("Installation Done!\n"));
				resolve("Installation Done!");
			} else {
				console.error(
					chalk.bold.red("---------------------------------------"),
				);
				console.error(
					chalk.bold.red(
						`Command ${command} ${args.join(
							" ",
						)} exited with code ${code}`,
					),
				);
				reject(
					new Error(
						`Command ${command} ${args.join(
							" ",
						)} exited with code ${code}`,
					),
				);
				exit(1);
			}
		});
	});
}
