import { provide } from "inversify-binding-decorators";
import {
  createLogger,
  format,
  Logger,
  LoggerOptions,
  transports,
} from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

/**
 * LogLevel enumeration defines the available log levels.
 */
enum LogLevel {
  Debug,
  Error,
  Info,
}

/**
 * GeneralLogger class is a utility class to manage logging within the application.
 */
@provide(GeneralLogger)
class GeneralLogger {
  private logger: Logger;

  constructor() {
    this.logger = createLogger(this.createLoggerOptions());
  }

  /**
   * Creates a console transport for logging.
   * @returns {transports.ConsoleTransportInstance} A Winston console transport instance.
   */
  private createConsoleTransport(): transports.ConsoleTransportInstance {
    const consoleTransport: transports.ConsoleTransportInstance =
      new transports.Console({
        level:
          (process.env.ENVIRONMENT !== "Development" && "debug") || "debug",
        handleExceptions: false,
        handleRejections: true,
      });

    return consoleTransport;
  }

  /**
   * Creates a rotational file transport for logging.
   * @returns {DailyRotateFile} A Winston daily rotate file transport instance.
   */
  private createRotationalFileTransport(): DailyRotateFile {
    const rotationalFileTransport: DailyRotateFile = new DailyRotateFile({
      level: "error",
      filename: "logs/general-%DATE%.log", //`${this?.env?.Log?.FOLDER}/${this?.env?.Log?.FILE}-%DATE%.log` : "logs/general-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "7d",
      silent: false,
    });

    return rotationalFileTransport;
  }

  /**
   * Creates a logger options object for Winston.
   * @returns {LoggerOptions} A Winston logger options object.
   */
  private createLoggerOptions(): LoggerOptions {
    const loggerOptions: LoggerOptions = {
      transports: [
        this.createConsoleTransport(),
        this.createRotationalFileTransport(),
      ],
      defaultMeta: { service: "service-unknown" },
      format: format.combine(
        format.splat(),
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        format.label({ label: "core-api" }),
        format.printf(({ timestamp, level, message, service, label }) => {
          return `[${timestamp}] [${label}] [${service}] ${level}: ${message}`;
        }),
      ),
    };

    return loggerOptions;
  }

  /**
   * Retrieves the path and line number of the error.
   * @param error - An Error object containing error details.
   * @returns {string} A string containing the path and line number of the error.
   */
  private getPathAndLine(error: Error): string {
    let pathLine: string = "";

    if (error.stack) {
      let callerLine = error.stack.split("\n")[1];
      let index = callerLine.indexOf("at ");
      pathLine = callerLine.substring(index + +2, callerLine.length);
    }

    return pathLine;
  }

  /**
   * Logs a message or error with the specified log level and service.
   * @param logLevel - The log level to use (Debug, Error, or Info).
   * @param content - The message or Error object to log.
   * @param service - The service name (optional) associated with the log.
   */
  public log(logLevel: LogLevel, content: Error | string, service?: string) {
    let pathLine: string = "";
    let logMessageFormat: string = "";

    if (typeof content === "object") {
      pathLine = this.getPathAndLine(content as Error);
      logMessageFormat = `${(content as Error).message} - (${
        (content as Error).name
      }) [file: %s]`;
    } else {
      logMessageFormat = content as string;
    }

    switch (logLevel) {
      case LogLevel.Debug:
        console.log(logMessageFormat, pathLine, { service });
        break;
      case LogLevel.Error:
        this.logger.error(logMessageFormat, pathLine, { service });
        break;
      case LogLevel.Info:
        this.logger.info(content as string, { service });
        break;
    }
  }
}

const Log: GeneralLogger = new GeneralLogger();
const log = Log.log.bind(Log);

export { LogLevel, GeneralLogger, log };
