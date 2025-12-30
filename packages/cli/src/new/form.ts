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

/**
 * Install dependencies using the selected package manager
 */
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
			const cleanedOutput = output.replace(/\|\|.*$/g, "");
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
				progressBar.update(progress, { doing: cleanedOutput });
			}
		});

		installProcess.on("error", (error) => {
			clearInterval(interval);
			progressBar.stop();
			reject(new Error(`Failed to start subprocess: ${error.message}`));
		});

		installProcess.on("close", (code) => {
			clearInterval(interval);
			if (code === 0) {
				progressBar.update(100, { doing: "Complete!" });
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

/**
 * Check if the package manager is installed
 */
async function checkIfPackageManagerExists(packageManager: string) {
	try {
		execSync(`${packageManager} --version`);
		return true;
	} catch (error) {
		printError("Package manager not found!", packageManager);
		process.exit(1);
	}
}

/**
 * Copy directory recursively (for local template testing)
 */
function copyDirectorySync(src: string, dest: string): void {
	if (!fs.existsSync(dest)) {
		fs.mkdirSync(dest, { recursive: true });
	}

	const entries = fs.readdirSync(src, { withFileTypes: true });

	for (const entry of entries) {
		const srcPath = path.join(src, entry.name);
		const destPath = path.join(dest, entry.name);

		// Skip node_modules and dist directories
		if (entry.name === "node_modules" || entry.name === "dist") {
			continue;
		}

		if (entry.isDirectory()) {
			copyDirectorySync(srcPath, destPath);
		} else {
			fs.copyFileSync(srcPath, destPath);
		}
	}
}

/**
 * Template definitions for v4.0
 */
enum Template {
	application = "Application :: Full-featured ExpressoTS application. (Recommended)",
	micro = "Micro :: A minimalistic template for building micro APIs and serverless functions.",
}

const enum PackageManager {
	npm = "npm",
	yarn = "yarn",
	pnpm = "pnpm",
	bun = "bun",
}

type TemplateKeys = keyof typeof Template;
type ProjectFormArgs = [PackageManager, TemplateKeys, string];

/**
 * Template folder mapping
 */
const TEMPLATE_FOLDERS: Record<string, string> = {
	Application: "application",
	Micro: "micro",
};

/**
 * Enable local template mode for testing
 * Set to true to use local templates instead of GitHub
 */
const USE_LOCAL_TEMPLATES = false;

/**
 * Skip npm install for testing (useful when templates have unpublished dependencies)
 * Set to true when testing with unpublished package versions
 */
const SKIP_INSTALL_FOR_TESTING = false;

/**
 * Local templates path (relative to CLI installation)
 * For development: points to the templates folder in the monorepo
 * For production: this will be replaced with the actual path
 */
const LOCAL_TEMPLATES_PATH = path.resolve(__dirname, "../../../templates");

/**
 * Main project creation form
 */
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
				choices: [
					"npm",
					"yarn",
					"pnpm",
					...(process.platform !== "win32" ? ["bun"] : []),
				],
			},
			{
				type: "list",
				name: "template",
				message: "Select a template",
				choices: [
					`Application :: Full-featured ExpressoTS application. (${chalk.yellow(
						"Recommended",
					)})`,
					"Micro :: A minimalistic template for building micro APIs and serverless functions.",
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
			doing: "Creating project",
		});

		// Extract template name from selection
		const [_, templateName] = answer.template.match(
			/(.*) ::/,
		) as Array<string>;
		const templateFolder = TEMPLATE_FOLDERS[templateName];

		try {
			if (USE_LOCAL_TEMPLATES) {
				// LOCAL TEMPLATE MODE (for testing)
				const localTemplatePath = path.join(
					LOCAL_TEMPLATES_PATH,
					templateFolder,
				);

				if (!fs.existsSync(localTemplatePath)) {
					progressBar.stop();
					printError(
						`Local template not found at: ${localTemplatePath}`,
						"Please check your templates folder",
					);
					process.exit(1);
				}

				// Create target directory
				fs.mkdirSync(answer.name, { recursive: true });

				// Copy template files
				copyDirectorySync(localTemplatePath, answer.name);

				progressBar.update(30, { doing: "Template copied" });
			} else {
				// GITHUB MODE (production)
				// Download latest from feature/v4.0 branch
				const repo: string = `expressots/templates/${templateFolder}#feature/v4.0`;
				const emitter = degit(repo);
				await emitter.clone(answer.name);
				progressBar.update(30, { doing: "Template cloned" });
			}
		} catch (err: any) {
			console.log("\n");
			printError(
				"Project already exists or Folder is not empty",
				answer.name,
			);
			process.exit(1);
		}

		if (SKIP_INSTALL_FOR_TESTING) {
			progressBar.update(90, {
				doing: "Skipping install (testing mode)",
			});
		} else {
			progressBar.update(50, {
				doing: "Installing dependencies",
			});

			await packageManagerInstall({
				packageManager: answer.packageManager,
				directory: answer.name,
				progressBar,
			});
		}

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
