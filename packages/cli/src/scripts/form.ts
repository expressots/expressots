import { ExecSyncOptions, execSync } from "child_process";
import fs from "fs";
import inquirer from "inquirer";
import path from "path";
import { printError, printWarning } from "../utils/cli-ui";

const cwd = process.cwd();
const packageJsonPath = path.join(cwd, "package.json");

interface PackageJson {
	scripts?: Record<string, string>;
}

function readPackageJson(): PackageJson {
	try {
		return JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
	} catch (e) {
		printError(`Error reading package.json`, "scripts-command");
		process.exit(1);
	}
}

function listScripts(packageJson: PackageJson): Record<string, string> {
	const scripts = packageJson.scripts || {};
	if (Object.keys(scripts).length === 0) {
		printWarning("No scripts found in package.json", "scripts-command");
		process.exit(0);
	}
	return scripts;
}

async function promptUserToSelectScripts(
	scripts: Record<string, string>,
): Promise<{ selectedScripts: string[] }> {
	const scriptChoices = Object.keys(scripts).map((key) => ({
		name: `${key}`,
		value: key,
	}));

	let selectionOrder: string[] = [];

	const answers = await inquirer.prompt([
		{
			type: "checkbox",
			name: "selectedScripts",
			message: "Select scripts to run:",
			choices: scriptChoices,
			filter: (selected: string[]) => {
				selectionOrder = selected;
				return selected;
			},
			loop: false,
		},
	]);

	return answers;
}

function executeScripts(
	scripts: Record<string, string>,
	selectedScripts: string[],
	runner: string,
): void {
	selectedScripts.forEach((script) => {
		console.log(`Running ${script}...`);
		try {
			const command = `${runner} run ${script}`;
			const options: ExecSyncOptions = {
				stdio: "inherit",
				env: { ...process.env },
			};

			execSync(command, options);
		} catch (e) {
			printWarning(
				`Command ${script} cancelled or failed - ${e}`,
				"scripts-command",
			);
		}
	});
}

process.stdin.on("keypress", (ch, key) => {
	if (key && key.name === "escape") {
		console.log("Exiting...");
		process.exit(0);
	}
});

export const scriptsForm = async (scriptArgs: string[] = []): Promise<void> => {
	const packageJson = readPackageJson();
	const scripts = listScripts(packageJson);

	const runner = fs.existsSync("package-lock.json")
		? "npm"
		: fs.existsSync("yarn.lock")
			? "yarn"
			: fs.existsSync("pnpm-lock.yaml")
				? "pnpm"
				: null;

	if (!runner) {
		printError(
			"No package manager found! Please ensure you have npm, yarn, or pnpm installed.",
			"scripts-command",
		);
		process.exit(1);
	}

	if (scriptArgs.length > 0) {
		const validScripts = scriptArgs.filter((script) => scripts[script]);
		const invalidScripts = scriptArgs.filter((script) => !scripts[script]);

		if (invalidScripts.length > 0) {
			console.error(
				`Scripts not found in package.json: ${invalidScripts.join(", ")}`,
			);
		}

		if (validScripts.length > 0) {
			executeScripts(scripts, validScripts, runner);
		}
	} else {
		const { selectedScripts } = await promptUserToSelectScripts(scripts);

		if (selectedScripts.length === 0) {
			console.log("No scripts selected.");
			process.exit(0);
		}

		executeScripts(scripts, selectedScripts, runner);
	}
};
