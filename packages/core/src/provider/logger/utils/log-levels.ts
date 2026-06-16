/**
 * Log levels enum with numeric values for comparison.
 * Lower values = more verbose, higher values = less verbose.
 * @public API
 */
export enum LogLevel {
  /** Show all logs (ultra-detailed diagnostic information, function entry/exit) */
  ALL = 0,
  /** Detailed diagnostic information for debugging */
  DEBUG = 1,
  /** General informational messages */
  INFO = 2,
  /** Warning messages for potentially harmful situations */
  WARN = 3,
  /** Error messages for error events */
  ERROR = 4,
  /** Fatal errors that cause the application to abort */
  FATAL = 5,
  /** No logging */
  SILENT = 6,
}

/**
 * String representation of log levels for backward compatibility.
 * @public API
 */
export type LogLevelString =
  | "ALL"
  | "TRACE"
  | "DEBUG"
  | "INFO"
  | "WARN"
  | "ERROR"
  | "FATAL"
  | "SILENT"
  | "NONE";

/**
 * Legacy log level for backward compatibility.
 * Maps to INFO level.
 */
export const LEGACY_LOG_LEVEL_NONE = "NONE";

/**
 * Convert string log level to enum.
 * @param level - String log level
 * @returns LogLevel enum value
 * @public API
 */
export function parseLogLevel(
  level: string | LogLevel | LogLevelString,
): LogLevel {
  if (typeof level === "number") {
    return level;
  }

  const upperLevel = level.toUpperCase();

  // Handle legacy "NONE" level
  if (upperLevel === "NONE") {
    return LogLevel.INFO;
  }

  switch (upperLevel) {
    case "ALL":
    case "TRACE":
      return LogLevel.ALL;
    case "DEBUG":
      return LogLevel.DEBUG;
    case "INFO":
      return LogLevel.INFO;
    case "WARN":
      return LogLevel.WARN;
    case "ERROR":
      return LogLevel.ERROR;
    case "FATAL":
      return LogLevel.FATAL;
    case "SILENT":
      return LogLevel.SILENT;
    default:
      return LogLevel.INFO;
  }
}

/**
 * Get string representation of log level.
 * @param level - LogLevel enum value
 * @returns String representation
 * @public API
 */
export function logLevelToString(level: LogLevel): string {
  switch (level) {
    case LogLevel.ALL:
      return "ALL";
    case LogLevel.DEBUG:
      return "DEBUG";
    case LogLevel.INFO:
      return "INFO";
    case LogLevel.WARN:
      return "WARN";
    case LogLevel.ERROR:
      return "ERROR";
    case LogLevel.FATAL:
      return "FATAL";
    case LogLevel.SILENT:
      return "SILENT";
    default:
      return "INFO";
  }
}

/**
 * Check if a log level should be logged based on configured level.
 * @param messageLevel - The level of the message to log
 * @param configuredLevel - The configured minimum log level
 * @returns True if message should be logged
 * @public API
 */
export function shouldLog(
  messageLevel: LogLevel,
  configuredLevel: LogLevel,
): boolean {
  if (configuredLevel === LogLevel.SILENT) {
    return false;
  }
  return messageLevel >= configuredLevel;
}
