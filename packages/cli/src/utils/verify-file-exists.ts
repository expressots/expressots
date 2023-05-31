import inquirer from 'inquirer';
import fs from 'node:fs';
import { printError } from './cli-ui';

async function verifyIfFileExists(path: string) {
	const fileExists = fs.existsSync(path);

	if (fileExists) {
		const answer = await inquirer.prompt([
			{
				type: "confirm",
				name: "confirm",
				message: "File with this path already exists. Do you want to create it anyway?",
				default: true,
			},
		]);

		const fileName = path.split('/').pop();
		if (!answer.confirm) {
			printError('File not created!', fileName);
			process.exit(1);
		}
	}
}

export { verifyIfFileExists };
