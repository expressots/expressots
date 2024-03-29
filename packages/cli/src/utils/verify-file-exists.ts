import inquirer from "inquirer";
import fs from "node:fs";
import { printError, printGenerateError } from "./cli-ui";

async function verifyIfFileExists(path: string, schematic?: string) {
	const fileExists = fs.existsSync(path);
	const fileName = path.split("/").pop();

	if (fileExists) {
		const answer = await inquirer.prompt([
			{
				type: "confirm",
				name: "confirm",
				message: `File [${fileName}] exists. Overwrite?`,
				default: true,
			},
		]);
		if (!answer.confirm) {
			schematic
				? printGenerateError(schematic, fileName)
				: printError("File not created!", fileName);
			process.exit(1);
		}
	}
}

export { verifyIfFileExists };
