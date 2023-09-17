import chalk from "chalk";

export function printError(message: string, component: string): void {
	console.error(
		chalk.red(`\n\n😞 ${message}:`, chalk.white(`[${component}]`)),
	);
}
