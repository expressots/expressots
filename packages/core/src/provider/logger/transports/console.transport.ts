import { ILogTransport } from "./transport.interface";
import { LogEntry } from "../utils/log-entry";
import { LogLevel, shouldLog } from "../utils/log-levels";
import { formatDev, formatProd, FormatOptions } from "../logger.formatter";
import { Redactor } from "../logger.redaction";

/**
 * Console transport for logging to stdout/stderr.
 * @public API
 */
export class ConsoleTransport implements ILogTransport {
  readonly name = "Console";
  level: LogLevel; // Mutable to allow dynamic level updates
  enabled: boolean;
  private readonly structured: boolean;
  private readonly colors: boolean;
  private readonly pretty: boolean;
  private readonly redact: boolean;
  private readonly redactor?: Redactor;

  /**
   * Create a console transport.
   * @param options - Transport options
   */
  constructor(options?: {
    level?: LogLevel;
    enabled?: boolean;
    structured?: boolean;
    colors?: boolean;
    pretty?: boolean;
    /** Enable automatic sensitive data redaction (default: true for production) */
    redact?: boolean;
    /** Custom redactor instance */
    redactor?: Redactor;
  }) {
    this.level = options?.level ?? LogLevel.DEBUG;
    this.enabled = options?.enabled ?? true;
    this.structured =
      options?.structured ?? process.env.NODE_ENV === "production";
    this.colors = options?.colors ?? process.env.NODE_ENV !== "production";
    this.pretty = options?.pretty ?? process.env.NODE_ENV !== "production";
    // Enable redaction by default in production
    this.redact = options?.redact ?? process.env.NODE_ENV === "production";
    this.redactor = options?.redactor;
  }

  /**
   * Create a console transport optimized for development.
   * @param redact - Enable redaction (default: false for development)
   * @returns ConsoleTransport configured for development
   * @public API
   */
  static forDevelopment(redact: boolean = false): ConsoleTransport {
    return new ConsoleTransport({
      level: LogLevel.DEBUG,
      structured: false,
      colors: true,
      pretty: true,
      redact, // Usually disabled in development for easier debugging
    });
  }

  /**
   * Create a console transport optimized for production.
   * @param redact - Enable redaction (default: true for production)
   * @returns ConsoleTransport configured for production
   * @public API
   */
  static forProduction(redact: boolean = true): ConsoleTransport {
    return new ConsoleTransport({
      level: LogLevel.INFO,
      structured: true,
      colors: false,
      pretty: false,
      redact, // Always redact in production for security
    });
  }

  log(entry: LogEntry): void {
    if (!this.enabled || !shouldLog(entry.level, this.level)) {
      return;
    }

    // Build format options with redaction settings
    const formatOptions: FormatOptions = {
      redact: this.redact,
      redactor: this.redactor,
    };

    const formatted = this.structured
      ? formatProd(entry, formatOptions)
      : formatDev(entry, formatOptions);

    // Use process.stdout/stderr directly to allow runtime interception
    const stream =
      entry.level >= LogLevel.ERROR ? process.stderr : process.stdout;

    stream.write(formatted);
  }

  flush(): Promise<void> {
    // Console doesn't need flushing
    return Promise.resolve();
  }
}
