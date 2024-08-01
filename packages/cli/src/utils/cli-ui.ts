import chalk from "chalk";
import { stdout } from "process";

export function printError(message: string, component: string): void {
	console.error(
		chalk.red(`${message}:`, chalk.bold(chalk.white(`[${component}] ❌`))),
	);
}

export function printWarning(message: string, component?: string): void {
	if (component === undefined) {
		stdout.write(chalk.yellow(`${message} ⚠️\n`));
		return;
	}
	stdout.write(
		chalk.yellow(
			`${message}:`,
			chalk.bold(chalk.white(`[${component}] ⚠️\n`)),
		),
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
