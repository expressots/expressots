import chalk from "chalk";
import path from "path";
import fs from "fs";
import os from "os";
import { printError } from "../utils/cli-ui";
import { exec } from "child_process";
import util from "util";

const execPromisified = util.promisify(exec);

async function getCLIVersion(): Promise<string> {
	try {
		const { stdout } = await execPromisified("npm list -g @expressots/cli");
		const version = stdout;
		const versionRegex = /@expressots\/cli@(\d+\.\d+\.\d+)/;
		const versionMatch: string = version.match(versionRegex)?.[1];
		return versionMatch;
	} catch (error) {
		printError(
			"CLI version not available.",
			"Unable to get the CLI version.",
		);
	}
	return "";
}

function getInfosFromPackage() {
	try {
		// Get the absolute path of the input directory parameter
		const absDirPath = path.resolve();
		// Load the package.json file
		const packageJsonPath = path.join(absDirPath, "package.json");

		const fileContents = fs.readFileSync(packageJsonPath, "utf-8");
		const packageJson = JSON.parse(fileContents);

		console.log(chalk.green("ExpressoTS Project:"));
		console.log(chalk.white(`\tName: ${packageJson.name}`));
		console.log(chalk.white(`\tDescription: ${packageJson.description}`));
		console.log(chalk.white(`\tVersion: ${packageJson.version}`));
		console.log(chalk.white(`\tAuthor: ${packageJson.author}`));

		//getCLIVersion();
	} catch (error) {
		printError(
			"No project information available.",
			"package.json not found!",
		);
	}
}

const infoForm = (): void => {
	const cliVersion = "1.6.0"; //await getCLIVersion();
	getInfosFromPackage();

	console.log(chalk.green("System information:"));
	console.log(chalk.white(`\tOS Version: ${os.version()}`));
	console.log(chalk.white(`\tNodeJS version: ${process.version}`));

	console.log(chalk.green("CLI Version:"));
	console.log(chalk.white(`\tCurrent version: v${cliVersion}`));
};

export { infoForm };
