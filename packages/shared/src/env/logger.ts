import { stdout } from "process";

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
