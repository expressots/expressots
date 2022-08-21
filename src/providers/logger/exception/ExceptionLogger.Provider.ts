import { Env } from "env";
import { transports, format, LoggerOptions, Logger, createLogger } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

//  Defining specific transports for each level of logging
const consoleTransport = new transports.Console({
    level: "debug",
    handleExceptions: true,
    handleRejections: true,
});

// Defining daily rotational file transport for error logs
const dailyRotateFileTransport: DailyRotateFile = new DailyRotateFile({
    level: "error",
    filename: `${Env.Log.LOG_FOLDER}/${Env.Log.LOG_FILE}-%DATE%.log` as string,
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "20m",
    maxFiles: "7d",
    silent: false,
});

const logOptions: LoggerOptions = {
    transports: [consoleTransport, dailyRotateFileTransport],
    defaultMeta: { service: "service-undefined" },
    format: format.combine(
        format.splat(),
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        format.label({ label: "core-api" }),
        format.printf(({ timestamp, level, message, service, label }) => {
            return `[${timestamp}] [${label}] [${service}] ${level}: ${message}`;
        }),
    ),
};

// Creating the logger
const logger: Logger = createLogger(logOptions);

function GetPathAndLineNumber(error: Error): string {
    let pathLine: string = "";

    if (error.stack) {
        let callerLine = error.stack.split("\n")[1];
        let index = callerLine.indexOf("at ");
        pathLine = callerLine.substring(index + + 2, callerLine.length);
    }

    return pathLine;
}

// Logger Wrapper to be used in the application
const Log = function (error: Error, service?: string) {

    let pathLine: string = GetPathAndLineNumber(error);
    let logMessageFormat: string = `${error.message} - (${error.name}) [file: %s]`;

    if (Env.Log.LOG_LEVEL === "debug") {
        logger.debug(logMessageFormat, pathLine, { service });
    } else {
        logger.error(logMessageFormat, pathLine, { service });
    }
}

export default Log;
