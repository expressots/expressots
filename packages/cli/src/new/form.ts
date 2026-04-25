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
		// Start from 50% (where we left off) and go up to 88% max
		// This leaves room for the actual completion and final steps
		// On Windows, npm can be slow, so we continue updating to show activity
		let progress = 50;
		let lastProgressUpdate = Date.now();
		const interval = setInterval(() => {
			const now = Date.now();
			// If we haven't received real progress updates in a while, continue incrementing
			// This prevents the progress bar from appearing stuck on slow Windows systems
			if (progress < 88) {
				// Increment slower as we approach the limit to avoid hitting it too quickly
				const increment = progress < 70 ? 3 : 1;
				progress = Math.min(progress + increment, 88);
				progressBar.update(progress, {
					doing: "Installing dependencies...",
				});
			} else if (now - lastProgressUpdate > 3000) {
				// Even at max, update the "doing" text to show it's still working
				progressBar.update(progress, {
					doing: "Installing dependencies...",
				});
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
				// Map npm progress (0-100%) to our range (50-90%)
				const npmProgress = (parseInt(current) / parseInt(total)) * 100;
				progress = Math.round(50 + npmProgress * 0.4); // 50% + (0-100% * 0.4) = 50-90%
				lastProgressUpdate = Date.now();
				progressBar.update(progress, { doing: task });
			} else if (cleanedOutput) {
				lastProgressUpdate = Date.now();
				progressBar.update(progress, { doing: cleanedOutput });
			}
		});

		// On Windows, npm may output progress to stderr
		installProcess.stderr?.on("data", (data: Buffer) => {
			const output = data.toString().trim();
			const cleanedOutput = output.replace(/\|\|.*$/g, "");
			const npmProgressMatch = cleanedOutput.match(
				/\[(\d+)\/(\d+)\] (?:npm )?([\w\s]+)\.{3}/,
			);

			if (npmProgressMatch) {
				const [, current, total, task] = npmProgressMatch;
				// Map npm progress (0-100%) to our range (50-90%)
				const npmProgress = (parseInt(current) / parseInt(total)) * 100;
				progress = Math.round(50 + npmProgress * 0.4); // 50% + (0-100% * 0.4) = 50-90%
				lastProgressUpdate = Date.now();
				progressBar.update(progress, { doing: task });
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
				// Update to 90% to leave room for final steps (package name change)
				progressBar.update(90, { doing: "Dependencies installed" });
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

/**
 * Middleware presets for Application template
 */
enum MiddlewarePreset {
	api = "API :: REST API with security, compression, and auto-logging. (Recommended)",
	web = "Web :: Full web app with cookies and session support.",
	graphql = "GraphQL :: Optimized for GraphQL APIs.",
	microservice = "Microservice :: Minimal setup for microservices.",
	minimal = "Minimal :: Just request parsing, customize everything yourself.",
}

type TemplateKeys = keyof typeof Template;
type MiddlewarePresetKeys = keyof typeof MiddlewarePreset;
type ProjectFormArgs = [
	PackageManager,
	TemplateKeys,
	string,
	MiddlewarePresetKeys,
];

/**
 * Template folder mapping
 */
const TEMPLATE_FOLDERS: Record<string, string> = {
	Application: "application",
	Micro: "micro",
};

/**
 * Middleware preset mapping to code
 */
const PRESET_CODE: Record<string, string> = {
	API: `this.Middleware.applyPreset("api");`,
	Web: `this.Middleware.applyPreset("web");`,
	GraphQL: `this.Middleware.applyPreset("graphql");`,
	Microservice: `this.Middleware.applyPreset("microservice");`,
	Minimal: `this.Middleware.parse();`,
};

/**
 * Apply the selected middleware preset to the generated app.ts
 */
function applyMiddlewarePreset(directory: string, preset: string): void {
	const appTsPath = path.join(directory, "src", "app.ts");

	if (!fs.existsSync(appTsPath)) {
		return;
	}

	// Extract preset name from selection (e.g., "API :: ..." -> "API")
	const presetMatch = preset.match(/^(\w+) ::/);
	const presetName = presetMatch ? presetMatch[1] : "API";

	const presetCode = PRESET_CODE[presetName] || PRESET_CODE["API"];

	let content = fs.readFileSync(appTsPath, "utf-8");

	// Replace the placeholder with the preset code
	content = content.replace(
		/\/\/ __MIDDLEWARE_PRESET_PLACEHOLDER__/,
		presetCode,
	);

	fs.writeFileSync(appTsPath, content, "utf-8");
}

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
		preset?: MiddlewarePreset;
		confirm: boolean;
	};

	const [packageManager, template, directory, preset] = args;

	if (packageManager && template) {
		answer = {
			name: projectName,
			packageManager: packageManager,
			template: Template[template],
			preset: preset ? MiddlewarePreset[preset] : undefined,
			confirm: true,
		};
	} else {
		const baseAnswers = await inquirer.prompt([
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
		]);

		// Only show preset selection for Application template
		let presetAnswer: { preset?: MiddlewarePreset } = {};
		if (baseAnswers.template.startsWith("Application")) {
			presetAnswer = await inquirer.prompt([
				{
					type: "list",
					name: "preset",
					message: "Select a middleware preset",
					choices: [
						`API :: REST API with security, compression, and auto-logging. (${chalk.yellow(
							"Recommended",
						)})`,
						"Web :: Full web app with cookies and session support.",
						"GraphQL :: Optimized for GraphQL APIs.",
						"Microservice :: Minimal setup for microservices.",
						"Minimal :: Just request parsing, customize everything yourself.",
					],
				},
			]);
		}

		const confirmAnswer = await inquirer.prompt([
			{
				type: "confirm",
				name: "confirm",
				message: "Do you want to create this project?",
				default: true,
			},
		]);

		answer = {
			...baseAnswers,
			...presetAnswer,
			...confirmAnswer,
		};
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
				// Pinned to the v4.0.0 GA tag of the templates repo so a
				// CLI shipped at v4.0.0 keeps working even if `main` moves.
				const repo: string = `expressots/templates/${templateFolder}#v4.0.0`;
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

		// Progress should already be at 90% from packageManagerInstall
		// Only update if we skipped installation
		if (!SKIP_INSTALL_FOR_TESTING) {
			progressBar.update(90, { doing: "Finalizing project" });
		}

		// Apply middleware preset for Application template
		if (answer.preset && templateFolder === "application") {
			applyMiddlewarePreset(answer.name, answer.preset);
		}

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
