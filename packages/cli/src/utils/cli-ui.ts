import chalk from "chalk";

export function printError(message: string, component: string): void {
	console.error(
		chalk.red(`${message}:`, chalk.bold(chalk.white(`[${component}] ❌`))),
	);
}

export async function printGenerateError(schematic: string, file: string) {
	console.error(
		" ",
		chalk.redBright(`[${schematic}]`.padEnd(14)),
		chalk.bold.white(`${file.split(".")[0]} not created! ❌`),
	);
}

export async function printGenerateSuccess(schematic: string, file: string) {
	console.log(
		" ",
		chalk.greenBright(`[${schematic}]`.padEnd(14)),
		chalk.bold.white(`${file.split(".")[0]} created! ✔️`),
	);
}
