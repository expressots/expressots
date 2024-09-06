import { injectable } from "../../di/inversify";
import { Color, colorCodes } from "../../common/color-codes";
import { IProvider } from "../provider-manager";

/**
 * Represents the different logging levels.
 */
type LogLevel = "INFO" | "WARN" | "ERROR" | "NONE";

/**
 * Applies a specified color to a text string.
 *
 * @param text - The text to be colored.
 * @param color - The color to be applied.
 * @returns The colored text.
 */
function colorText(text: string, color: Color): string {
  return `${colorCodes[color]}${text}\x1b[0m`;
}

/**
 * Class that provides logging functionality with colorized text.
 */
@injectable()
class Logger implements IProvider {
  private pid: number;

  name: string = "Logger";
  version: string = "0.0.1";
  author: string = "Richard Zampieri";
  repo: string = "internal";

  constructor() {
    this.pid = process.pid;
  }

  /**
   * Formats the log message with color, timestamps, and log levels.
   *
   * @param logLevel - The level of the log (e.g. INFO, WARN).
   * @param message - The main log message.
   * @param module - Optional module name.
   * @returns The formatted log message.
   */
  protected formatMessage(
    logLevel: LogLevel = "NONE",
    message: string,
    module?: string,
  ): string {
    const localDate = new Date();
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    };

    const timestamp = colorText(
      localDate.toLocaleString(undefined, options).replace(",", ""),
      "white",
    );

    let logColor: Color;
    switch (logLevel) {
      case "INFO":
        logColor = "blue";
        break;
      case "WARN":
        logColor = "yellow";
        break;
      case "ERROR":
        logColor = "red";
        break;
      default:
        logColor = "none";
        break;
    }

    const formattedLogLevel = colorText(logLevel.padEnd(5, " "), logColor);

    if (logLevel === "NONE") {
      return `${colorText("[ExpressoTS]", "none")} ${timestamp} ${colorText(
        "[PID:" + this.pid + "]",
        "none",
      )} ${formattedLogLevel} [${colorText(module || "", "none")}] ${colorText(
        message,
        logColor,
      )}\n`;
    }

    return `${colorText("[ExpressoTS]", "green")} ${timestamp} ${colorText(
      "[PID:" + this.pid + "]",
      "green",
    )} ${formattedLogLevel} [${colorText(module || "", "green")}] ${colorText(
      message,
      logColor,
    )}\n`;
  }

  /**
   * Logs a generic message.
   *
   * @param message - The message to log.
   * @param module - Optional module name.
   */
  public msg(message: string, module?: string): void {
    process.stdout.write(this.formatMessage("NONE", message, module));
  }

  /**
   * Logs an informational message.
   *
   * @param message - The message to log.
   * @param module - Optional module name.
   */
  public info(message: string, module?: string): void {
    process.stdout.write(this.formatMessage("INFO", message, module));
  }

  /**
   * Logs a warning message.
   *
   * @param message - The message to log.
   * @param module - Optional module name.
   */
  public warn(message: string, module?: string): void {
    process.stdout.write(this.formatMessage("WARN", message, module));
  }

  /**
   * Logs an error message.
   *
   * @param message - The message to log.
   * @param module - Optional module name.
   */
  public error(message: string, module?: string): void {
    process.stderr.write(this.formatMessage("ERROR", message, module));
  }
}

export { Logger, LogLevel };
