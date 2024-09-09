import { stdout } from "process";
import chalk from "chalk";

/**
 * Logger utility for dotenv
 */
export enum LogLevel {
  Info = "info",
  Warn = "warn",
  Debug = "debug",
}

/**
 * Log a message
 * @param message - The message to log
 * @param logLevel - The log level. Defaults to LogLevel.Info
 */
export function log(message: string, logLevel: LogLevel = LogLevel.Info): void {
  switch (logLevel) {
    case LogLevel.Info:
      stdout.write(`[ExpressoTS][INFO] ${message}\n`);
      break;
    case LogLevel.Warn:
      stdout.write(`[ExpressoTS][WARN] ${message}\n`);
      break;
    case LogLevel.Debug:
      stdout.write(`[ExpressoTS][DEBUG] ${message}\n`);
      break;
  }
}

export function printError(message: string, component: string): void {
  console.error(chalk.red(`${message}:`, chalk.bold(chalk.white(`[${component}] ❌`))));
}

export function printSuccess(message: string, component: string): void {
  stdout.write(chalk.green(`${message}:`, chalk.bold(chalk.white(`[${component}] ✔️\n`))));
}

export function printWarning(message: string, component?: string): void {
  if (component === undefined) {
    stdout.write(chalk.yellow(`${message} ⚠️\n`));
    return;
  }
  stdout.write(chalk.yellow(`${message}:`, chalk.bold(chalk.white(`[${component}] ⚠️\n`))));
}

export async function printGenerateError(schematic: string, file: string): Promise<void> {
  console.error(
    " ",
    chalk.redBright(`[${schematic}]`.padEnd(14)),
    chalk.bold.white(`${file.split(".")[0]} not created! ❌`),
  );
}

export async function printGenerateSuccess(schematic: string, file: string): Promise<void> {
  console.log(
    " ",
    chalk.greenBright(`[${schematic}]`.padEnd(14)),
    chalk.bold.white(`${file.split(".")[0]} created! ✔️`),
  );
}
