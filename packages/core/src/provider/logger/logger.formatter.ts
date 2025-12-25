import { LogEntry } from "./utils/log-entry";
import { LogLevel, logLevelToString } from "./utils/log-levels";
import { Color, colorCodes } from "../../console/color-codes";
import { Redactor, getGlobalRedactor } from "./logger.redaction";

/**
 * Options for log formatting.
 */
export interface FormatOptions {
  /** Enable redaction of sensitive data */
  redact?: boolean;
  /** Custom redactor instance (uses global if not provided) */
  redactor?: Redactor;
}

/**
 * Format log entry for development (human-readable, colored).
 * @param entry - Log entry to format
 * @param options - Formatting options (redaction, etc.)
 * @returns Formatted string
 * @public API
 */
export function formatDev(entry: LogEntry, options?: FormatOptions): string {
  // Apply redaction if enabled
  const processedEntry = applyRedaction(entry, options);

  const timestamp = formatTimestamp(processedEntry.timestamp);
  const level = logLevelToString(processedEntry.level);
  const levelColor = getLevelColor(processedEntry.level);
  const coloredLevel = colorText(level.padEnd(5, " "), levelColor);
  const coloredContext = processedEntry.context
    ? colorText(`[${processedEntry.context}]`, "green")
    : "";
  const coloredMessage = colorText(processedEntry.message, levelColor);

  let output = `${colorText("[ExpressoTS]", "green")} ${timestamp}`;

  if (processedEntry.pid) {
    output += ` ${colorText(`[PID:${processedEntry.pid}]`, "green")}`;
  }

  output += ` ${coloredLevel} ${coloredContext} ${coloredMessage}\n`;

  // Add structured data if present
  if (processedEntry.data) {
    output += formatData(processedEntry.data, levelColor, 2);
  }

  // Add error details if present
  if (processedEntry.error) {
    output += formatError(processedEntry.error, 2);
  }

  // Add trace information if present
  if (processedEntry.trace) {
    output += formatTrace(processedEntry.trace, 2);
  }

  // Add performance data if present
  if (processedEntry.performance) {
    output += formatPerformance(processedEntry.performance, 2);
  }

  return output;
}

/**
 * Format log entry for production (JSON structured).
 * @param entry - Log entry to format
 * @param options - Formatting options (redaction, etc.)
 * @returns JSON string
 * @public API
 */
export function formatProd(entry: LogEntry, options?: FormatOptions): string {
  // Apply redaction if enabled (especially important for production!)
  const processedEntry = applyRedaction(entry, options);

  const jsonEntry: Record<string, unknown> = {
    timestamp: processedEntry.timestamp.toISOString(),
    level: logLevelToString(processedEntry.level),
    message: processedEntry.message,
  };

  if (processedEntry.context) {
    jsonEntry.context = processedEntry.context;
  }

  if (processedEntry.pid) {
    jsonEntry.pid = processedEntry.pid;
  }

  if (processedEntry.data) {
    jsonEntry.data = processedEntry.data;
  }

  if (processedEntry.error) {
    jsonEntry.error = formatErrorForJson(processedEntry.error);
  }

  if (processedEntry.trace) {
    jsonEntry.trace = processedEntry.trace;
  }

  if (processedEntry.performance) {
    jsonEntry.performance = processedEntry.performance;
  }

  if (processedEntry.metadata) {
    jsonEntry.metadata = processedEntry.metadata;
  }

  return JSON.stringify(jsonEntry);
}

/**
 * Format timestamp for display.
 */
function formatTimestamp(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  };
  return date.toLocaleString(undefined, options).replace(",", "");
}

/**
 * Get color for log level.
 */
function getLevelColor(level: LogLevel): Color {
  switch (level) {
    case LogLevel.TRACE:
      return "white";
    case LogLevel.DEBUG:
      return "blue";
    case LogLevel.INFO:
      return "blue";
    case LogLevel.WARN:
      return "yellow";
    case LogLevel.ERROR:
    case LogLevel.FATAL:
      return "red";
    default:
      return "none";
  }
}

/**
 * Apply color to text.
 */
function colorText(text: string, color: Color): string {
  return `${colorCodes[color]}${text}\x1b[0m`;
}

/**
 * Format structured data with indentation.
 */
function formatData(data: unknown, color: Color, indent: number): string {
  const indentStr = " ".repeat(indent);
  const prefix = `${indentStr}├─ `;

  if (typeof data === "object" && data !== null) {
    if (Array.isArray(data)) {
      return `${prefix}${colorText(`Array(${data.length})`, color)}\n`;
    }

    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 0) {
      return "";
    }

    let output = "";
    entries.forEach(([key, value], index) => {
      const isLast = index === entries.length - 1;
      const connector = isLast ? "└─" : "├─";
      const valueStr = formatValue(value, color);
      output += `${indentStr}${connector} ${key}: ${valueStr}\n`;
    });

    return output;
  }

  return `${prefix}${colorText(String(data), color)}\n`;
}

/**
 * Format a value for display.
 */
function formatValue(value: unknown, color: Color): string {
  if (value === null) {
    return colorText("null", "none");
  }
  if (value === undefined) {
    return colorText("undefined", "none");
  }
  if (typeof value === "string") {
    return colorText(`"${value}"`, color);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return colorText(String(value), color);
  }
  if (typeof value === "object") {
    if (Array.isArray(value)) {
      return colorText(`[${value.length} items]`, color);
    }
    return colorText(`{${Object.keys(value).length} keys}`, color);
  }
  return colorText(String(value), color);
}

/**
 * Format error for display.
 */
function formatError(error: Error | unknown, indent: number): string {
  const indentStr = " ".repeat(indent);
  let output = "";

  if (error instanceof Error) {
    output += `${indentStr}├─ ${colorText("Error:", "red")} ${colorText(error.name, "red")}\n`;
    output += `${indentStr}├─ ${colorText("Message:", "red")} ${colorText(error.message, "red")}\n`;

    if (error.stack) {
      const stackLines = error.stack.split("\n").slice(1); // Skip first line (already shown)
      if (stackLines.length > 0) {
        output += `${indentStr}└─ ${colorText("Stack:", "red")}\n`;
        stackLines.slice(0, 5).forEach((line) => {
          output += `${indentStr}    ${colorText(line.trim(), "none")}\n`;
        });
        if (stackLines.length > 5) {
          output += `${indentStr}    ${colorText(`... and ${stackLines.length - 5} more`, "none")}\n`;
        }
      }
    }
  } else {
    output += `${indentStr}└─ ${colorText(String(error), "red")}\n`;
  }

  return output;
}

/**
 * Format error for JSON output.
 */
function formatErrorForJson(error: Error | unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return {
    message: String(error),
  };
}

/**
 * Format trace information.
 */
function formatTrace(trace: Record<string, unknown>, indent: number): string {
  const indentStr = " ".repeat(indent);
  let output = `${indentStr}├─ ${colorText("Trace:", "blue")}\n`;

  Object.entries(trace).forEach(([key, value], index, entries) => {
    const isLast = index === entries.length - 1;
    const connector = isLast ? "└─" : "├─";
    output += `${indentStr}  ${connector} ${key}: ${colorText(String(value), "blue")}\n`;
  });

  return output;
}

/**
 * Format performance data.
 */
function formatPerformance(
  perf: { duration?: number; memoryDelta?: number; cpuUsage?: number },
  indent: number,
): string {
  const indentStr = " ".repeat(indent);
  let output = `${indentStr}├─ ${colorText("Performance:", "yellow")}\n`;

  if (perf.duration !== undefined) {
    output += `${indentStr}  ├─ Duration: ${colorText(`${perf.duration}ms`, "yellow")}\n`;
  }
  if (perf.memoryDelta !== undefined) {
    const mb = (perf.memoryDelta / 1024 / 1024).toFixed(2);
    output += `${indentStr}  ├─ Memory: ${colorText(`${mb}MB`, "yellow")}\n`;
  }
  if (perf.cpuUsage !== undefined) {
    output += `${indentStr}  └─ CPU: ${colorText(`${perf.cpuUsage}%`, "yellow")}\n`;
  } else if (perf.duration !== undefined || perf.memoryDelta !== undefined) {
    output = output.replace(/├─/g, "└─").replace(/├─/g, "├─");
  }

  return output;
}

/**
 * Apply redaction to a log entry if enabled.
 * @param entry - Log entry to process
 * @param options - Format options with redaction settings
 * @returns Processed entry with sensitive data redacted
 */
function applyRedaction(entry: LogEntry, options?: FormatOptions): LogEntry {
  // If redaction is explicitly disabled, return original entry
  if (options?.redact === false) {
    return entry;
  }

  // Get redactor (custom or global)
  const redactor = options?.redactor ?? getGlobalRedactor();

  // Create a shallow copy and redact relevant fields
  const processedEntry: LogEntry = {
    ...entry,
    message: redactor.redactString(entry.message),
  };

  // Redact data object if present
  if (entry.data) {
    processedEntry.data = redactor.redact(entry.data);
  }

  // Redact metadata if present
  if (entry.metadata) {
    processedEntry.metadata = redactor.redact(entry.metadata);
  }

  // Redact trace if present
  if (entry.trace) {
    processedEntry.trace = redactor.redact(entry.trace);
  }

  return processedEntry;
}
