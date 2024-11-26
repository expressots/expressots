import chalk from "chalk";
import { Presets, SingleBar } from "cli-progress";
import degit from "degit";
import inquirer from "inquirer";
import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { BUNDLE_VERSION } from "../cli";
import { centerText } from "../utils/center-text";
import { changePackageName } from "../utils/change-package-info";
import { printError } from "../utils/cli-ui";

async function packageManagerInstall({
	packageManager,
	directory,
	progressBar,
}: {
	packageManager: string;
	directory: string;
	progressBar: SingleBar;
}) {
	const command: string =
		process.platform === "win32" ? `${packageManager}.cmd` : packageManager;

	const args = ["install", "--silent"];
	if (packageManager === "yarn") {
		args.push("--ignore-engines");
		args.splice(args.indexOf("--prefer-offline"), 1);
	}
	return new Promise((resolve, reject) => {
		const installProcess = spawn(command, args, {
			cwd: directory,
			shell: true,
			timeout: 600000,
		});

		// Simulate incremental progress
		let progress = 0;
		const interval = setInterval(() => {
			if (progress < 90) {
				progress += 5;
				progressBar.update(progress);
			}
		}, 1000);

		// Handle stdout for meaningful output or progress feedback
		installProcess.stdout?.on("data", (data: Buffer) => {
			const output = data.toString().trim();

			// Remove all data from || to the end of the line
			const cleanedOutput = output.replace(/\|\|.*$/g, "");

			// Match and handle npm-specific progress
			const npmProgressMatch = cleanedOutput.match(
				/\[(\d+)\/(\d+)\] (?:npm )?([\w\s]+)\.{3}/,
			);

			if (npmProgressMatch) {
				const [, current, total, task] = npmProgressMatch;
				progress = Math.round(
					(parseInt(current) / parseInt(total)) * 100,
				);
				progressBar.update(progress, { doing: task });
			} else {
				// Update "task" without changing the progress
				progressBar.update(progress, { doing: cleanedOutput });
			}
		});

		// Handle errors
		installProcess.on("error", (error) => {
			clearInterval(interval); // Stop interval on error
			progressBar.stop();
			reject(new Error(`Failed to start subprocess: ${error.message}`));
		});

		// Finalize progress on close
		installProcess.on("close", (code) => {
			clearInterval(interval); // Stop interval when the process ends
			if (code === 0) {
				progressBar.update(100, { doing: "Complete!" }); // Finalize progress
				progressBar.stop();
				resolve("Installation Done!");
			} else {
				progressBar.stop();
				reject(
					new Error(
						`${packageManager} install exited with code ${code}`,
					),
				);
			}
		});
	});
}

async function checkIfPackageManagerExists(packageManager: string) {
	try {
		execSync(`${packageManager} --version`);
		return true;
	} catch (error) {
		printError("Package manager not found!", packageManager);
		process.exit(1);
	}
}

function renameEnvFile(directory: string): void {
	try {
		const envExamplePath = path.join(directory, ".env.example");
		const envPath = path.join(directory, ".env");

		if (!fs.existsSync(envExamplePath)) {
			throw new Error(`File not found: ${envExamplePath}`);
		}

		fs.renameSync(envExamplePath, envPath);
	} catch (error: any) {
		printError("Error renaming .env.example file", ".env.example to .env");
		process.exit(1);
	}
}

enum Template {
	nonopinionated = "Non-Opinionated :: Start with a clean slate and build your project from scratch.",
	opinionated = "Opinionated :: Automatically scaffolds resources into a preset project structure. (Recommended)",
	micro = "Micro :: A minimalistic template for building micro api's.",
}

const enum PackageManager {
	npm = "npm",
	yarn = "yarn",
	pnpm = "pnpm",
	bun = "bun",
}

type TemplateKeys = keyof typeof Template;

type ProjectFormArgs = [PackageManager, TemplateKeys, string];

const projectForm = async (
	projectName: string,
	args: ProjectFormArgs,
): Promise<void> => {
	let answer: {
		name: string;
		packageManager: string;
		template: Template;
		confirm: boolean;
	};

	const [packageManager, template, directory] = args;

	if (packageManager && template) {
		answer = {
			name: projectName,
			packageManager: packageManager,
			template: Template[template],
			confirm: true,
		};
	} else {
		answer = await inquirer.prompt([
			{
				type: "input",
				name: "name",
				message: "Project name",
				default: projectName,
				transformer: (input: string) => {
					return chalk.yellow(chalk.bold(input));
				},
			},
			{
				type: "list",
				name: "packageManager",
				message: "Package manager",
				choices: ["npm", "yarn", "pnpm", "bun"],
			},
			{
				type: "list",
				name: "template",
				message: "Select a template",
				choices: [
					`Opinionated :: Automatically scaffolds resources into a preset project structure. (${chalk.yellow(
						"Recommended",
					)})`,
					"NonOpinionated :: Allows users to choose where to scaffold resources, offering flexible project organization.",
					"Micro :: A minimalistic template for building micro api's.",
				],
			},
			{
				type: "confirm",
				name: "confirm",
				message: "Do you want to create this project?",
				default: true,
			},
		]);
	}

	if (directory) {
		if (!fs.existsSync(path.join(directory, answer.name))) {
			answer.name = path.join(directory, answer.name);
		} else {
			printError("Directory already exists", directory);
			process.exit(1);
		}
	}

	// Hashmap of templates and their directories
	const templates: Record<string, unknown> = {
		NonOpinionated: "non_opinionated",
		Opinionated: "opinionated",
		Micro: "micro",
	};

	if (answer.confirm) {
		// Check if package manager is bun and OS is Windows
		if (answer.packageManager === "bun" && process.platform === "win32") {
			printError(
				"bun is not supported on Windows. Please use",
				"npm, yarn or pnpm",
			);
			process.exit(1);
		}

		await checkIfPackageManagerExists(answer.packageManager);
		console.log("\n");
		const progressBar = new SingleBar(
			{
				format:
					"Progress |" +
					chalk.green("{bar}") +
					"| {percentage}% || {doing}",
				hideCursor: true,
			},
			Presets.rect,
		);

		progressBar.start(100, 0, {
			doing: "Cloning project",
		});

		const [_, template] = answer.template.match(/(.*) ::/) as Array<string>;

		const repo: string = `expressots/templates/${templates[template]}#${BUNDLE_VERSION}`;

		try {
			const emitter = degit(
				`expressots/templates/${templates[template]}`,
			);

			await emitter.clone(answer.name);
		} catch (err: any) {
			console.log("\n");
			printError(
				"Project already exists or Folder is not empty",
				answer.name,
			);
			process.exit(1);
		}

		progressBar.update(50, {
			doing: "Installing dependencies",
		});

		await packageManagerInstall({
			packageManager: answer.packageManager,
			directory: answer.name,
			progressBar,
		});

		progressBar.update(90);

		changePackageName({
			directory: answer.name,
			name: projectName,
		});

		progressBar.update(100);

		progressBar.stop();

		console.log("\n");
		console.log(
			"🐎 Project",
			chalk.green(answer.name),
			"created successfully!",
		);
		console.log("🤙 Run the following commands to start the project:\n");

		console.log(chalk.bold.gray(`$ cd ${answer.name}`));
		switch (answer.packageManager) {
			case "npm":
				console.log(chalk.bold.gray("$ npm run dev"));
				break;
			case "yarn":
				console.log(chalk.bold.gray("$ yarn dev"));
				break;
			case "pnpm":
				console.log(chalk.bold.gray("$ pnpm run dev"));
				break;
			case "bun":
				console.log(chalk.bold.gray("$ bun dev"));
				break;
		}

		console.log("\n");
		console.log(chalk.bold.green(centerText("Happy coding!")));
		console.log(
			chalk.bold.gray(
				centerText(
					"Please consider donating to support the project.\n",
				),
			),
		);
		console.log(
			chalk.bold.white(
				centerText(
					"💖 Sponsor: https://github.com/sponsors/expressots",
				),
			),
		);
		console.log("\n");
	}
};

export { projectForm };
