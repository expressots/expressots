import { LogEntry } from "./utils/log-entry";
import { LogLevel, logLevelToString } from "./utils/log-levels";
import { Color, colorCodes } from "../../console/color-codes";
import { Redactor, getGlobalRedactor } from "./logger.redaction";
import { GroupedLogEntry } from "./logger.grouping";
import { RequestFlow, FlowStep, FlowStepType } from "./logger.flow";

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

  // Add flow visualization if present
  if (processedEntry.flow) {
    output += formatFlow(processedEntry.flow, 2);
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

  if (processedEntry.flow) {
    jsonEntry.flow = processedEntry.flow;
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

/**
 * Format a grouped log entry for development output.
 * @param groupedEntry - Grouped log entry
 * @param options - Formatting options
 * @returns Formatted string
 * @public API
 */
export function formatGroupedDev(
  groupedEntry: GroupedLogEntry,
  options?: FormatOptions,
): string {
  const entry = groupedEntry.representative;
  const processedEntry = applyRedaction(entry, options);

  const timestamp = formatTimestamp(processedEntry.timestamp);
  const level = logLevelToString(processedEntry.level);
  const levelColor = getLevelColor(processedEntry.level);
  const coloredLevel = colorText(level.padEnd(5, " "), levelColor);
  const coloredContext = processedEntry.context
    ? colorText(`[${processedEntry.context}]`, "green")
    : "";

  // Format time range
  const timeRange = formatTimeRange(
    groupedEntry.firstOccurrence,
    groupedEntry.lastOccurrence,
  );

  // Format grouped message
  const groupedMessage = colorText(
    `[GROUPED ×${groupedEntry.count}] ${processedEntry.message}`,
    levelColor,
  );
  const timeRangeText = colorText(`(${timeRange})`, "yellow");

  let output = `${colorText("[ExpressoTS]", "green")} ${timestamp}`;

  if (processedEntry.pid) {
    output += ` ${colorText(`[PID:${processedEntry.pid}]`, "green")}`;
  }

  output += ` ${coloredLevel} ${coloredContext} ${groupedMessage} ${timeRangeText}\n`;

  // Show first occurrence details
  output += `  ├─ First: ${formatTimestamp(groupedEntry.firstOccurrence)}\n`;
  output += `  ├─ Last: ${formatTimestamp(groupedEntry.lastOccurrence)}\n`;
  output += `  └─ Count: ${colorText(`${groupedEntry.count} occurrences`, "yellow")}\n`;

  // Optionally show sample entries (first, middle, last)
  if (groupedEntry.entries.length > 1) {
    const sampleIndices = [
      0,
      Math.floor(groupedEntry.entries.length / 2),
      groupedEntry.entries.length - 1,
    ].filter((idx, i, arr) => arr.indexOf(idx) === i); // Unique indices

    if (sampleIndices.length > 1) {
      output += `  └─ Sample entries:\n`;
      for (const idx of sampleIndices) {
        const sample = groupedEntry.entries[idx];
        const sampleTime = formatTimestamp(sample.timestamp);
        output += `     ${idx === 0 ? "├" : idx === sampleIndices[sampleIndices.length - 1] ? "└" : "├"}─ [${sampleTime}] ${sample.message}\n`;
      }
    }
  }

  return output;
}

/**
 * Format a grouped log entry for production (JSON).
 * @param groupedEntry - Grouped log entry
 * @param options - Formatting options
 * @returns JSON string
 * @public API
 */
export function formatGroupedProd(
  groupedEntry: GroupedLogEntry,
  options?: FormatOptions,
): string {
  const entry = groupedEntry.representative;
  const processedEntry = applyRedaction(entry, options);

  const jsonEntry: Record<string, unknown> = {
    timestamp: processedEntry.timestamp.toISOString(),
    level: logLevelToString(processedEntry.level),
    message: processedEntry.message,
    grouped: true,
    count: groupedEntry.count,
    firstOccurrence: groupedEntry.firstOccurrence.toISOString(),
    lastOccurrence: groupedEntry.lastOccurrence.toISOString(),
    timeRange: formatTimeRange(
      groupedEntry.firstOccurrence,
      groupedEntry.lastOccurrence,
    ),
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

  // Include sample entries
  if (groupedEntry.entries.length > 0) {
    const sampleIndices = [
      0,
      Math.floor(groupedEntry.entries.length / 2),
      groupedEntry.entries.length - 1,
    ].filter((idx, i, arr) => arr.indexOf(idx) === i);

    jsonEntry.sampleEntries = sampleIndices.map((idx) => ({
      timestamp: groupedEntry.entries[idx].timestamp.toISOString(),
      message: groupedEntry.entries[idx].message,
    }));
  }

  return JSON.stringify(jsonEntry);
}

/**
 * Format time range between two dates.
 * @param start - Start date
 * @param end - End date
 * @returns Formatted time range string
 */
function formatTimeRange(start: Date, end: Date): string {
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 1000) {
    return `${diffMs}ms`;
  }
  if (diffMs < 60000) {
    return `${(diffMs / 1000).toFixed(1)}s`;
  }
  return `${(diffMs / 60000).toFixed(1)}m`;
}

/**
 * Format request flow visualization for development (ASCII tree).
 * @param flow - Request flow data
 * @param indent - Indentation level
 * @returns Formatted ASCII visualization string
 */
function formatFlow(flow: RequestFlow, indent: number): string {
  const indentStr = " ".repeat(indent);
  const boxWidth = 55;
  const title = "Request Flow Visualization";

  let output = `\n${indentStr}${colorText("╔" + "═".repeat(boxWidth) + "╗", "blue")}\n`;

  // Title - center aligned
  const titlePlainLength = title.length;
  const titlePadding = Math.max(
    0,
    Math.floor((boxWidth - titlePlainLength) / 2),
  );
  const titleRightPadding = boxWidth - titlePlainLength - titlePadding;
  output += `${indentStr}${colorText("║", "blue")}${" ".repeat(titlePadding)}${colorText(title, "blue")}${" ".repeat(titleRightPadding)}${colorText("║", "blue")}\n`;
  output += `${indentStr}${colorText("╠" + "═".repeat(boxWidth) + "╣", "blue")}\n`;

  // Request info - left aligned
  const methodPath = `${flow.method} ${flow.path}`;
  const methodPathPlainLength = methodPath.length;
  const methodPathPadding = boxWidth - methodPathPlainLength - 1;
  output += `${indentStr}${colorText("║", "blue")} ${colorText(methodPath, "white")}${" ".repeat(methodPathPadding)}${colorText("║", "blue")}\n`;

  const requestIdText = `Request ID: `;
  const requestIdValue = flow.requestId;
  const requestIdPlainLength = requestIdText.length + requestIdValue.length;
  const requestIdPadding = boxWidth - requestIdPlainLength - 1;
  output += `${indentStr}${colorText("║", "blue")} ${requestIdText}${colorText(requestIdValue, "yellow")}${" ".repeat(requestIdPadding)}${colorText("║", "blue")}\n`;
  output += `${indentStr}${colorText("╠" + "═".repeat(boxWidth) + "╣", "blue")}\n`;

  // Flow steps - render inside box
  if (flow.steps.length === 0) {
    const noStepsMsg = "No steps tracked";
    const noStepsPlainLength = noStepsMsg.length;
    const noStepsPadding = Math.max(
      0,
      Math.floor((boxWidth - noStepsPlainLength) / 2),
    );
    const noStepsRightPadding = boxWidth - noStepsPlainLength - noStepsPadding;
    output += `${indentStr}${colorText("║", "blue")}${" ".repeat(noStepsPadding)}${colorText(noStepsMsg, "yellow")}${" ".repeat(noStepsRightPadding)}${colorText("║", "blue")}\n`;
  } else {
    // Render steps as tree structure inside box
    flow.steps.forEach((step, index) => {
      const isLast = index === flow.steps.length - 1;
      const stepOutput = formatFlowStep(step, 0, isLast);
      // Split into lines and wrap each line in box borders
      const stepLines = stepOutput
        .split("\n")
        .filter((line) => line.trim().length > 0);
      stepLines.forEach((line) => {
        // Remove ANSI codes for length calculation, but keep them in the output
        // eslint-disable-next-line no-control-regex
        const plainLine = line.replace(/\x1b\[[0-9;]*m/g, "");
        const padding = Math.max(0, boxWidth - plainLine.length - 1);
        output += `${indentStr}${colorText("║", "blue")} ${line}${" ".repeat(padding)}${colorText("║", "blue")}\n`;
      });
    });
  }

  // Summary
  output += `${indentStr}${colorText("╠" + "═".repeat(boxWidth) + "╣", "blue")}\n`;

  // Total Duration - left aligned
  const durationValue = `${flow.totalDuration.toFixed(2)}ms`;
  const durationText = "Total Duration: ";
  const durationPlainLength = durationText.length + durationValue.length;
  const durationPadding = boxWidth - durationPlainLength - 1;
  output += `${indentStr}${colorText("║", "blue")} ${durationText}${colorText(durationValue, "yellow")}${" ".repeat(durationPadding)}${colorText("║", "blue")}\n`;

  if (flow.statusCode !== undefined) {
    const statusColor =
      flow.statusCode >= 400
        ? "red"
        : flow.statusCode >= 300
          ? "yellow"
          : "green";
    const statusCodeStr = String(flow.statusCode);
    const statusText = "Status Code: ";
    const statusPlainLength = statusText.length + statusCodeStr.length;
    const statusPadding = boxWidth - statusPlainLength - 1;
    output += `${indentStr}${colorText("║", "blue")} ${statusText}${colorText(statusCodeStr, statusColor)}${" ".repeat(statusPadding)}${colorText("║", "blue")}\n`;
  }

  if (flow.memoryDelta !== 0) {
    const memoryMB = (flow.memoryDelta / 1024 / 1024).toFixed(2);
    const memoryMBNum = parseFloat(memoryMB);
    const memoryColor = flow.memoryDelta > 0 ? "yellow" : "green";
    const memoryValue = `${memoryMBNum > 0 ? "+" : ""}${memoryMB}MB`;
    const memoryText = "Memory Delta: ";
    const memoryPlainLength = memoryText.length + memoryValue.length;
    const memoryPadding = boxWidth - memoryPlainLength - 1;
    output += `${indentStr}${colorText("║", "blue")} ${memoryText}${colorText(memoryValue, memoryColor)}${" ".repeat(memoryPadding)}${colorText("║", "blue")}\n`;
  }

  if (flow.error) {
    const maxErrorLength = boxWidth - 8; // "Error: " = 7 chars + 1 space
    const errorMsg =
      flow.error.message.length > maxErrorLength
        ? flow.error.message.substring(0, maxErrorLength - 3) + "..."
        : flow.error.message;
    const errorText = "Error: ";
    const errorPlainLength = errorText.length + errorMsg.length;
    const errorPadding = boxWidth - errorPlainLength - 1;
    output += `${indentStr}${colorText("║", "blue")} ${errorText}${colorText(errorMsg, "red")}${" ".repeat(errorPadding)}${colorText("║", "blue")}\n`;
  }

  output += `${indentStr}${colorText("╚" + "═".repeat(boxWidth) + "╝", "blue")}\n`;

  return output;
}

/**
 * Format a single flow step with tree visualization.
 * @param step - Flow step to format
 * @param indent - Indentation level
 * @param isLast - Whether this is the last sibling
 * @returns Formatted step string
 */
function formatFlowStep(
  step: FlowStep,
  indent: number,
  isLast: boolean,
): string {
  const indentStr = " ".repeat(indent);
  const stepIcon = getStepIcon(step.type);
  const statusIcon = getStatusIcon(step.status);
  const stepColor = getStepColor(step.type);
  const statusColor = getStatusColor(step.status);

  // Main step line
  const connector = isLast ? "└─" : "├─";
  const stepName = colorText(step.name, stepColor);
  const duration = colorText(`${step.duration.toFixed(2)}ms`, "yellow");
  const status = colorText(statusIcon, statusColor);

  let output = `${indentStr}${connector} ${status} ${stepIcon} ${stepName} ${duration}\n`;

  // Filter and add metadata if present (exclude error stack traces and verbose data)
  if (step.metadata && Object.keys(step.metadata).length > 0) {
    const filteredMetadata = Object.entries(step.metadata).filter(([key]) => {
      // Skip error objects (they contain stack traces)
      if (key === "error") {
        return false;
      }
      // Skip stack traces
      if (key === "stack") {
        return false;
      }
      return true;
    });

    if (filteredMetadata.length > 0) {
      filteredMetadata.forEach(([key, value], index) => {
        const isLastMeta =
          index === filteredMetadata.length - 1 &&
          (!step.children || step.children.length === 0);
        const metaConnector = isLastMeta ? "└─" : "├─";
        const metaPrefix = isLast ? "  " : "│";
        let valueStr: string;
        if (typeof value === "object" && value !== null) {
          // For arrays, show content if it's guardNames or similar
          if (Array.isArray(value)) {
            if (key === "guardNames") {
              valueStr = value.join(", ");
            } else {
              valueStr = `[${value.length} items]`;
            }
          } else {
            // For objects, show key count or skip if too complex
            const obj = value as Record<string, unknown>;
            if (Object.keys(obj).length > 3) {
              valueStr = `{${Object.keys(obj).length} keys}`;
            } else {
              // Show simple object as key:value pairs
              valueStr = Object.entries(obj)
                .map(([k, v]) => `${k}:${String(v).substring(0, 10)}`)
                .join(", ");
            }
          }
        } else {
          valueStr = String(value);
        }
        // Truncate long values
        if (valueStr.length > 45) {
          valueStr = valueStr.substring(0, 42) + "...";
        }
        output += `${indentStr}${metaPrefix} ${metaConnector} ${key}: ${colorText(valueStr, "none")}\n`;
      });
    }
  }

  // Add nested children (only if trackNested is enabled)
  if (step.children && step.children.length > 0) {
    step.children.forEach((child, index) => {
      const isLastChild = index === step.children!.length - 1;
      output += formatFlowStep(child, indent + 2, isLastChild);
    });
  }

  return output;
}

/**
 * Get icon for step type.
 */
function getStepIcon(type: FlowStepType): string {
  switch (type) {
    case "middleware":
      return "⚙";
    case "guard":
      return "🛡";
    case "validation":
      return "✓";
    case "controller":
      return "🎮";
    case "use-case":
      return "💼";
    case "exception-filter":
      return "⚠";
    case "response":
      return "📤";
    default:
      return "•";
  }
}

/**
 * Get icon for step status.
 */
function getStatusIcon(status: "success" | "failure" | "skipped"): string {
  switch (status) {
    case "success":
      return "✓";
    case "failure":
      return "✗";
    case "skipped":
      return "⊘";
    default:
      return "•";
  }
}

/**
 * Get color for step type.
 */
function getStepColor(type: FlowStepType): Color {
  switch (type) {
    case "middleware":
      return "blue";
    case "guard":
      return "yellow";
    case "validation":
      return "green";
    case "controller":
      return "blue";
    case "use-case":
      return "blue";
    case "exception-filter":
      return "red";
    case "response":
      return "green";
    default:
      return "none";
  }
}

/**
 * Get color for step status.
 */
function getStatusColor(status: "success" | "failure" | "skipped"): Color {
  switch (status) {
    case "success":
      return "green";
    case "failure":
      return "red";
    case "skipped":
      return "yellow";
    default:
      return "none";
  }
}
