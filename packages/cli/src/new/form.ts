import inquirer from "inquirer";
import chalk from "chalk";
import degit from "degit";
import { spawn, execSync } from "child_process";
import { Presets, SingleBar } from "cli-progress";
import fs from "node:fs";
import path from "node:path";

async function packageManagerInstall({
	packageManager,
	directory,
	progressBar,
}: {
	packageManager: string;
	directory: string;
	progressBar: SingleBar;
}) {
	return new Promise((resolve, reject) => {
		const isWindows: boolean = process.platform === "win32";
		const command: string = isWindows
			? `${packageManager}.cmd`
			: packageManager;

		const installProcess = spawn(command, ["install"], {
			cwd: directory,
		});

		installProcess.stdout.on("data", (data: Buffer) => {
			progressBar.increment(5, {
				doing: `${data.toString().trim()}`,
			});
		});

		installProcess.on("close", (code) => {
			if (code === 0) {
				resolve("Installation Done!");
			} else {
				reject(new Error(`npm install exited with code ${code}`));
			}
		});
	});
}

async function checkIfPackageManagerExists(packageManager: string) {
	try {
		execSync(`${packageManager} --version`);
		return true;
	} catch (_) {
		throw new Error(`Package manager ${packageManager} is not installed`);
	}
}

// Change the package.json name to the user's project name
function changePackageName({
	directory,
	name,
}: {
	directory: string;
	name: string;
}): void {
	// Get the absolute path of the input directory parameter
	const absDirPath = path.resolve(directory);

	// Load the package.json file
	const packageJsonPath = path.join(absDirPath, "package.json");
	const fileContents = fs.readFileSync(packageJsonPath, "utf-8");
	const packageJson = JSON.parse(fileContents);

	// Change the name
	packageJson.name = name;

	// Save the package.json file
	fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

enum Template {
	"non-opinionated" = "Non-Opinionated :: A simple ExpressoTS project.",
	opinionated = "Opinionated :: A complete ExpressoTS project with an opinionated structure and features.",
}

const enum PackageManager {
	npm,
	yarn,
	pnpm,
}

const projectForm = async (projectName: string, packageManager: PackageManager, template: keyof typeof Template): Promise<void> => {
	let answer: any;
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
				choices: ["npm", "yarn", "pnpm"],
			},
			{
				type: "list",
				name: "template",
				message: "Select a template",
				choices: [
					"Non-Opinionated :: A simple ExpressoTS project.",
					"Opinionated :: A complete ExpressoTS project with an opinionated structure and features.",
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
	// Hashmap of templates and their directories
	const templates: Record<string, unknown> = {
		"Non-Opinionated": "non_opinionated",
		Opinionated: "opinionated",
	};

	if (answer.confirm) {
		// Check if the package manager exists
		await checkIfPackageManagerExists(answer.packageManager).catch((err) => {
			console.log(chalk.red(err.message));
			process.exit(1);
		});

		const progressBar = new SingleBar(
			{
				format:
					"Progress |" + chalk.green("{bar}") + "| {percentage}% || {doing}",
				hideCursor: true,
			},
			Presets.shades_classic,
		);

		progressBar.start(100, 0, {
			doing: "Cloning project",
		});

		const [_, template] = answer.template.match(/(.*) ::/) as Array<string>;

		const emitter = degit(
			`expressots/expressots/templates/${templates[template]}`,
		);

		await emitter.clone(answer.name);

		progressBar.update(50, {
			doing: "Installing dependencies",
		});

		// Run the package manager install in the directory
		await packageManagerInstall({
			packageManager: answer.packageManager,
			directory: answer.name,
			progressBar,
		});

		progressBar.update(90);

		changePackageName({
			directory: answer.name,
			name: answer.name,
		});

		progressBar.update(100);

		progressBar.stop();

		console.log(chalk.green("Project created successfully!"));
		console.log("Run the following commands to start the project:");
		console.log(chalk.bold(`cd ${answer.name}`));
		console.log(chalk.bold(`${answer.packageManager} start`));
	}
};

export { projectForm };
