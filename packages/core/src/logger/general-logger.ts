import { format, transports, LoggerOptions, createLogger, Logger } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { IEnv } from "../application";
import { provide } from "inversify-binding-decorators";

enum LogLevel {
    Debug,
    Error,
    Info,
}

@provide(GeneralLogger)
class GeneralLogger {

    private env: IEnv | undefined;
    private logger: Logger;

    constructor(env?: IEnv) {
        this.env = env || undefined;

        this.logger = createLogger(this.createLoggerOptions());
    }

    private createConsoleTransport(): transports.ConsoleTransportInstance {

        const consoleTransport: transports.ConsoleTransportInstance = new transports.Console({
            level: "debug",
            handleExceptions: true,
            handleRejections: true
        });

        return consoleTransport;
    }

    private createRotationalFileTransport(): DailyRotateFile {

        const rotationalFileTransport: DailyRotateFile = new DailyRotateFile({
            level: "error",
            filename: `${this.env?.Log?.FOLDER}/${this.env?.Log.FILE}-%DATE%.log` || "logs/general-%DATE%.log" as string,
            datePattern: "YYYY-MM-DD",
            zippedArchive: true,
            maxSize: "20m",
            maxFiles: "7d",
            handleExceptions: true,
            handleRejections: true,
            silent: false
        });

        return rotationalFileTransport;
    }

    private createLoggerOptions(): LoggerOptions {

        const loggerOptions: LoggerOptions = {
            transports: [
                this.createConsoleTransport(),
                this.createRotationalFileTransport()
            ],
            defaultMeta: { service: "service-unknown" },
            format: format.combine(
                format.splat(),
                format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
                format.label({ label: "core" }),
                format.printf(({ timestamp, level, message, service, label }) => {
                    return `[${timestamp}] [${label}] [${service}] ${level}: ${message}`;
                }),
            )
        };

        return loggerOptions;
    }

    private getPathAndLine(error: Error): string {
        let pathLine: string = "";

        if (error.stack) {
            let callerLine = error.stack.split("\n")[1];
            let index = callerLine.indexOf("at ");
            pathLine = callerLine.substring(index + + 2, callerLine.length);
        }

        return pathLine;
    }

    public log(logLevel: LogLevel, content: Error | string, service?: string) {

        const pathLine: string = this.getPathAndLine(content as Error);
        const logMessageFormat: string = `${(content as Error).message} - (${(content as Error).name}) [file: %s]`;

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
const logger = Log.log;

export { LogLevel, GeneralLogger, logger as log };
