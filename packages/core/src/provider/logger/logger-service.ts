import { provide } from "inversify-binding-decorators";

/**
 * Represents the different logging levels.
 */
type LogLevel = "INFO" | "WARN" | "ERROR" | "NONE";

/**
 * Represents the supported text colors.
 */
type Color = "red" | "green" | "yellow" | "blue" | "white" | "black" | "none";

/**
 * Describes the color style with text and background color.
 */
type ColorStyle = {
  textColor: Color;
  bgColor: Color;
}

/**
 * ANSI escape color codes mapping for different text colors.
 */
const colorCodes: Record<Color, string> = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  white: "\x1b[37m",
  black: "\x1b[30m",
  none: "\x1b[0m",
};

/**
 * ANSI escape color codes mapping for different background colors.
 */
const bgColorCodes: Record<Color, string> = {
  red: "\x1b[41m",
  green: "\x1b[42m",
  yellow: "\x1b[43m",
  blue: "\x1b[44m",
  white: "\x1b[47m",
  black: "\x1b[40m",
  none: "\x1b[0m",
};

/**
 * Log styles mapped to different log levels.
 */
const logStyles: Record<LogLevel, ColorStyle> = {
  INFO: { textColor: "blue", bgColor: "none" },
  WARN: { textColor: "yellow", bgColor: "none" },
  ERROR: { textColor: "red", bgColor: "none" },
  NONE: { textColor: "none", bgColor: "none" },
};

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
@provide(Logger)
class Logger {
  private pid: number;

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
  protected formatMessage(logLevel: LogLevel = "NONE", message: string, module?: string): string {
    const localDate = new Date();
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    };

    const timestamp = colorText(localDate.toLocaleString(undefined, options).replace(",", ""), "white");

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

    const formattedLogLevel = colorText(logLevel.padEnd(5, ' '), logColor);
    
    if (logLevel === "NONE") {
      return `${colorText('[ExpressoTS]', "none")} ${timestamp} ${colorText('[PID:' + this.pid + ']', "none")} ${formattedLogLevel} [${colorText(module || '', "none")}] ${colorText(message, logColor)}`;  
    }
    
    return `${colorText('[ExpressoTS]', "green")} ${timestamp} ${colorText('[PID:' + this.pid + ']', "green")} ${formattedLogLevel} [${colorText(module || '', "green")}] ${colorText(message, logColor)}`;
  }

  /**
   * Logs a generic message.
   *
   * @param message - The message to log.
   * @param module - Optional module name.
   */
  public msg(message: string, module?: string): void {
    console.log(this.formatMessage("NONE", message, module));
  }

  /**
   * Logs an informational message.
   *
   * @param message - The message to log.
   * @param module - Optional module name.
   */
  public info(message: string, module?: string): void {
    console.log(this.formatMessage("INFO", message, module));
  }

  /**
   * Logs a warning message.
   *
   * @param message - The message to log.
   * @param module - Optional module name.
   */
  public warn(message: string, module?: string): void {
    console.log(this.formatMessage("WARN", message, module));
  }

  /**
   * Logs an error message.
   *
   * @param message - The message to log.
   * @param module - Optional module name.
   */
  public error(message: string, module?: string): void {
    console.log(this.formatMessage("ERROR", message, module));
  }
}

export { Logger, LogLevel };
