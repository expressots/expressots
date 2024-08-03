import chalk from "chalk";
import path from "path";
import fs from "fs";
import os from "os";
import { printError, printSuccess } from "../utils/cli-ui";
import axios from "axios";

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
	} catch (error) {
		printError(
			"No project information available.",
			"package.json not found!",
		);
	}
}

export const infoForm = (): void => {
	getInfosFromPackage();

	console.log(chalk.green("System information:"));
	console.log(chalk.white(`\tOS Version: ${os.version()}`));
	console.log(chalk.white(`\tNodeJS version: ${process.version}`));
	currentCLIVersion();
};

async function currentCLIVersion(): Promise<void> {
	try {
		const response = await axios.get(
			"https://api.github.com/repos/expressots/expressots-cli/releases",
		);
		const latestRelease = `v${response.data[0].tag_name}`;
		printSuccess("CLI version:", latestRelease);
	} catch (error: Error | any) {
		printError("Error:", error.message);
	}
}
