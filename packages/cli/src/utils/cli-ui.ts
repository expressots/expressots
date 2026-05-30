import chalk from "chalk";
import { stdout } from "process";

/**
 * Format timestamp for display (matches core logger format)
 */
function formatTimestamp(): string {
	const date = new Date();
	const options: Intl.DateTimeFormatOptions = {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	};
	return date.toLocaleString(undefined, options).replace(",", "");
}

/**
 * Log levels matching core logger
 */
type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

/**
 * Color a string based on log level
 */
function colorByLevel(level: LogLevel, text: string): string {
	switch (level) {
		case "INFO":
			return chalk.green(text);
		case "WARN":
			return chalk.yellow(text);
		case "ERROR":
			return chalk.red(text);
		case "DEBUG":
			return chalk.blue(text);
		default:
			return chalk.white(text);
	}
}

/**
 * Core log function matching ExpressoTS core logger format
 * Format: [ExpressoTS] timestamp LEVEL [context] message
 */
function log(
	level: LogLevel,
	context: string,
	message: string,
	icon?: string,
): void {
	const timestamp = formatTimestamp();
	const levelStr = colorByLevel(level, level.padEnd(5, " "));
	const contextStr = chalk.green(`[${context}]`);
	const messageStr = colorByLevel(level, message);
	const iconStr = icon ? ` ${icon}` : "";

	const output = `${chalk.green("[ExpressoTS]")} ${timestamp} ${levelStr} ${contextStr} ${messageStr}${iconStr}\n`;

	if (level === "ERROR") {
		process.stderr.write(output);
	} else {
		stdout.write(output);
	}
}

/**
 * Print error message (matches core logger ERROR format)
 */
export function printError(message: string, context: string): void {
	log("ERROR", context, message, "❌");
}

/**
 * Print success message (matches core logger INFO format)
 */
export function printSuccess(message: string, context: string): void {
	log("INFO", context, message, "✔️");
}

/**
 * Print warning message (matches core logger WARN format)
 */
export function printWarning(message: string, context?: string): void {
	log("WARN", context || "cli", message, "⚠️");
}

/**
 * Print info message (matches core logger INFO format)
 */
export function printInfo(message: string, context: string): void {
	log("INFO", context, message);
}

/**
 * Print debug message (matches core logger DEBUG format)
 */
export function printDebug(message: string, context: string): void {
	log("DEBUG", context, message);
}

/**
 * Print generate error (simplified format for scaffolding)
 */
export async function printGenerateError(
	schematic: string,
	file: string,
): Promise<void> {
	log("ERROR", schematic, `${file.split(".")[0]} not created!`, "❌");
}

/**
 * Print generate success (simplified format for scaffolding)
 */
export async function printGenerateSuccess(
	schematic: string,
	file: string,
): Promise<void> {
	log("INFO", schematic, `${file.split(".")[0]} created!`, "✔️");
}

/**
 * Print a section title. Intended for interactive/listing output (e.g.
 * `templates list`, `costs compare`) where the structured logger format
 * (`[ExpressoTS] timestamp LEVEL`) would be noisy. Leading newline keeps
 * sections visually separated.
 */
export function printSection(title: string): void {
	stdout.write(`\n${chalk.bold.cyan(title)}\n`);
}

/**
 * Print an indented bullet point under a section.
 */
export function printBullet(text: string): void {
	stdout.write(`  ${chalk.gray("-")} ${text}\n`);
}

/**
 * Print a dim horizontal divider sized to the terminal width (capped).
 */
export function printDivider(): void {
	const cols =
		typeof process.stdout.columns === "number" && process.stdout.columns > 0
			? process.stdout.columns
			: 80;
	const width = Math.min(Math.max(cols, 20), 80);
	stdout.write(`${chalk.dim("\u2500".repeat(width))}\n`);
}

/**
 * Print an aligned key/value pair (e.g. `Source:  remote`).
 */
export function printKeyValue(key: string, value: string, padding = 12): void {
	stdout.write(`  ${chalk.bold(`${key}:`.padEnd(padding))} ${value}\n`);
}

/**
 * Print the ExpressoTS CLI header
 */
export function printHeader(version?: string): void {
	const title = version
		? `🐎 ExpressoTS CLI v${version}`
		: "🐎 ExpressoTS CLI";
	stdout.write(`\n${chalk.bold.green(title)}\n\n`);
}
