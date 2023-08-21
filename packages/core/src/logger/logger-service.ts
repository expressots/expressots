import { provide } from "inversify-binding-decorators";

type LogLevel = "INFO" | "WARN" | "ERROR" | "NONE";
type Color = "red" | "green" | "yellow" | "blue" | "white" | "black" | "none";

type ColorStyle = {
  textColor: Color;
  bgColor: Color;
}

const colorCodes: Record<Color, string> = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  white: "\x1b[37m",
  black: "\x1b[30m",
  none: "\x1b[0m",
};

const bgColorCodes: Record<Color, string> = {
  red: "\x1b[41m",
  green: "\x1b[42m",
  yellow: "\x1b[43m",
  blue: "\x1b[44m",
  white: "\x1b[47m",
  black: "\x1b[40m",
  none: "\x1b[0m",
};

const logStyles: Record<LogLevel, ColorStyle> = {
  INFO: { textColor: "blue", bgColor: "none" },
  WARN: { textColor: "yellow", bgColor: "none" },
  ERROR: { textColor: "red", bgColor: "none" },
  NONE: { textColor: "none", bgColor: "none" },
};

function colorText(text: string, color: Color): string {
  return `${colorCodes[color]}${text}\x1b[0m`;
}

@provide(Logger)
class Logger {
  private pid: number;

  constructor() {
    this.pid = process.pid;
  }

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

  public msg(message: string, module?: string): void {
    console.log(this.formatMessage("NONE", message, module));
  }

  public info(message: string, module?: string): void {
    console.log(this.formatMessage("INFO", message, module));
  }

  public warn(message: string, module?: string): void {
    console.log(this.formatMessage("WARN", message, module));
  }

  public error(message: string, module?: string): void {
    console.log(this.formatMessage("ERROR", message, module));
  }
}

const log: Logger = new Logger();

export { Logger, LogLevel, log };
