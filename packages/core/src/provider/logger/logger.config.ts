import { LogLevel, LogLevelString } from "./utils/log-levels.js";
import { ILogTransport } from "./transports/transport.interface.js";
import { RedactionConfig } from "./logger.redaction.js";
import { GroupingConfig } from "./logger.grouping.js";
import { FlowConfig } from "./logger.flow.js";
import { SuggestionsConfig } from "./logger.suggestions.js";
import { HealthConfig } from "./logger.health.js";
import { QueryConfig } from "./logger.query.js";

/**
 * Filter configuration for log filtering.
 * @public API
 */
export interface FilterConfig {
  /** Include only these contexts (empty = all) */
  include?: Array<string>;
  /** Exclude these contexts */
  exclude?: Array<string>;
  /** Minimum request duration to log (in ms) */
  minDuration?: number;
}

/**
 * Logger configuration interface.
 * @public API
 */
export interface LoggerConfig {
  /** Minimum log level to output */
  level: LogLevel | LogLevelString;
  /** Log transports to use */
  transports: Array<ILogTransport>;
  /** Filter configuration */
  filters?: FilterConfig;
  /** Enable structured logging (JSON in production) */
  structured?: boolean;
  /** Enable colors in output (default: true in dev, false in prod) */
  colors?: boolean;
  /** Pretty print output (default: true in dev, false in prod) */
  pretty?: boolean;
  /** Redaction configuration for sensitive data */
  redaction?: Partial<RedactionConfig>;
  /** Log grouping configuration for noise reduction */
  grouping?: Partial<GroupingConfig>;
  /** Flow tracking configuration for request visualization */
  flow?: Partial<FlowConfig>;
  /** Error suggestions configuration */
  suggestions?: Partial<SuggestionsConfig>;
  /** Health monitoring configuration */
  health?: Partial<HealthConfig>;
  /** Log query and export configuration */
  query?: Partial<QueryConfig>;
}

/**
 * Default logger configuration.
 * @public API
 */
export function getDefaultLoggerConfig(): LoggerConfig {
  const isDevelopment = process.env.NODE_ENV !== "production";

  return {
    level: isDevelopment ? LogLevel.DEBUG : LogLevel.INFO,
    transports: [], // Will be populated with ConsoleTransport by default
    filters: {},
    structured: !isDevelopment, // JSON in production, pretty in dev
    colors: isDevelopment,
    pretty: isDevelopment,
    redaction: {
      enabled: !isDevelopment, // Redact in production, not in development by default
    },
  };
}
