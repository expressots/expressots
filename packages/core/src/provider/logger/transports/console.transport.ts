import { ILogTransport } from "./transport.interface.js";
import { LogEntry } from "../utils/log-entry.js";
import { LogLevel, shouldLog } from "../utils/log-levels.js";
import { formatDev, formatProd, FormatOptions } from "../logger.formatter.js";
import { Redactor } from "../logger.redaction.js";

/**
 * Decide whether ANSI color codes should be emitted by default.
 *
 * Order of precedence (industry standard, matches chalk / supports-color):
 *   1. `NO_COLOR` env var (any non-empty value)              → never colors
 *   2. `FORCE_COLOR` env var (any non-"0"/"false" value)     → always colors
 *   3. Process running in production                          → never colors
 *   4. Stdout is a TTY                                        → colors
 *   5. Otherwise (pipes, redirects, cloud log capture)       → no colors
 *
 * This means cloud platforms like Azure App Service, AWS CloudWatch,
 * Heroku, Docker, Kubernetes, etc. — which all capture stdout into a
 * non-TTY pipe — receive plain text by default, without users having
 * to configure anything.
 */
function detectColorsDefault(): boolean {
  const noColor = process.env.NO_COLOR;
  if (noColor !== undefined && noColor !== "") return false;

  const forceColor = process.env.FORCE_COLOR;
  if (
    forceColor !== undefined &&
    forceColor !== "0" &&
    forceColor !== "false"
  ) {
    return true;
  }

  if (process.env.NODE_ENV === "production") return false;

  return Boolean(process.stdout && process.stdout.isTTY);
}

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
    this.colors = options?.colors ?? detectColorsDefault();
    this.pretty = options?.pretty ?? process.env.NODE_ENV !== "production";
    // Enable redaction by default in production
    this.redact = options?.redact ?? process.env.NODE_ENV === "production";
    this.redactor = options?.redactor;
  }

  /**
   * Create a console transport optimized for development.
   *
   * Colors are auto-detected: they're emitted when stdout is a TTY
   * (your terminal) and disabled when stdout is piped or captured by
   * a cloud log collector (Azure App Service, AWS CloudWatch, Heroku,
   * Docker, Kubernetes, etc.). Respects the standard `NO_COLOR` and
   * `FORCE_COLOR` environment variables.
   *
   * @param redact - Enable redaction (default: false for development)
   * @returns ConsoleTransport configured for development
   * @public API
   */
  static forDevelopment(redact: boolean = false): ConsoleTransport {
    return new ConsoleTransport({
      level: LogLevel.DEBUG,
      structured: false,
      // Omit `colors` so the constructor's auto-detect kicks in.
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

    // Build format options with redaction + color settings. The color
    // flag is honoured by `formatDev` / `formatGroupedDev`; `formatProd`
    // (structured JSON) never emits color regardless.
    const formatOptions: FormatOptions = {
      redact: this.redact,
      redactor: this.redactor,
      colors: this.colors,
    };

    const formatted = this.structured
      ? formatProd(entry, formatOptions)
      : formatDev(entry, formatOptions);

    // Strip trailing newline since console.* methods append their own.
    const msg = formatted.endsWith("\n") ? formatted.slice(0, -1) : formatted;

    // Route through console methods so Studio's LogCapture (which
    // intercepts console.*) can forward these entries to the Live Logs UI.
    // The level mapping mirrors the level chips Studio renders so messages
    // land under the expected filter. We pass a single pre-formatted string
    // so util.format never tries to interpret stray "%s"/"%d" tokens in
    // user-supplied messages.
    switch (entry.level) {
      case LogLevel.DEBUG:
      case LogLevel.ALL:
        console.debug(msg);
        break;
      case LogLevel.INFO:
        console.info(msg);
        break;
      case LogLevel.WARN:
        console.warn(msg);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(msg);
        break;
      default:
        console.log(msg);
        break;
    }
  }

  flush(): Promise<void> {
    // Console doesn't need flushing
    return Promise.resolve();
  }
}
