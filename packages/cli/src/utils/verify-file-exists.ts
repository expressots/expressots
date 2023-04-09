import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'node:fs';

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

		if (!answer.confirm) {
			console.log(chalk.green('> File not created!'))

			process.exit(1);
		}
	}
}

export { verifyIfFileExists };
