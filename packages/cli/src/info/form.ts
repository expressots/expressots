import fs from "fs";
import os from "os";
import path from "path";
import { BUNDLE_VERSION } from "../cli";
import { printError, printKeyValue, printSection } from "../utils/cli-ui";

function getInfosFromPackage() {
	try {
		// Get the absolute path of the input directory parameter
		const absDirPath = path.resolve();
		// Load the package.json file
		const packageJsonPath = path.join(absDirPath, "package.json");

		const fileContents = fs.readFileSync(packageJsonPath, "utf-8");
		const packageJson = JSON.parse(fileContents);

		printSection("📦 Project");
		printKeyValue("Name", `${packageJson.name}`);
		printKeyValue("Description", `${packageJson.description}`);
		printKeyValue("Version", `${packageJson.version}`);
		printKeyValue("Author", `${packageJson.author}`);
	} catch (error) {
		printError(
			"No project information available.",
			"package.json not found!",
		);
	}
}

export const infoForm = async (): Promise<void> => {
	getInfosFromPackage();

	printSection("💻 System");
	printKeyValue("OS", `${os.type()} ${os.release()} (${os.arch()})`);
	printKeyValue("Node.js", process.version);
	printKeyValue("CLI", BUNDLE_VERSION);
	console.log("");
};
