import inquirer from "inquirer";
import chalk from "chalk";
import degit from "degit";
import { spawn } from "child_process";
import { Presets, SingleBar } from "cli-progress";
// import chalkAnimation from 'chalk-animation';

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
		const installProcess = spawn(packageManager, ["install"], {
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

const projectForm = async (projectName: string): Promise<void> => {
	const answer = await inquirer.prompt([
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
			type: "confirm",
			name: "confirm",
			message: "Do you want to create this project?",
			default: true,
		},
	]);

	if (answer.confirm) {
		const progressBar = new SingleBar(
			{
				format:
					"Progress |" + chalk.green("{bar}") + "| {percentage}% || {doing}",
				hideCursor: true,
			},
			Presets.shades_classic
		);

		progressBar.start(100, 0, {
			doing: "Cloning project",
		});

		const emitter = degit("expressots/expressots/project-demo");
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

		progressBar.update(100);
		progressBar.stop();

		console.log(chalk.green("Project created successfully!"));
		console.log("Run the following commands to start the project:");
		console.log(chalk.bold(`cd ${answer.name}`));
		console.log(chalk.bold(`${answer.packageManager} start`));
	}
};

export { projectForm };
