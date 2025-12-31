import { colorCodes, Color } from "../console/color-codes";

// ANSI escape codes for text formatting
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

// Regex to strip ANSI escape codes
// eslint-disable-next-line no-control-regex
const ANSI_STRIP_REGEX = /\x1b\[[0-9;]*m/g;

// Box configuration - matches ExpressoTS banner width
const BOX_WIDTH = 90;
const CONTENT_WIDTH = BOX_WIDTH - 4; // Account for "║ " and " ║"

/**
 * Strip ANSI escape codes to get visible text.
 */
function stripAnsi(text: string): string {
  return text.replace(ANSI_STRIP_REGEX, "");
}

/**
 * Get the visible length of a string (excluding ANSI codes).
 * Accounts for emojis which display as 2 characters wide in terminals.
 */
function visibleLength(text: string): number {
  const stripped = stripAnsi(text);
  let len = 0;

  // Iterate using Array.from to properly handle surrogate pairs
  for (const char of Array.from(stripped)) {
    const code = char.codePointAt(0) || 0;
    // Emojis typically display as 2 characters wide in terminals
    // These ranges cover most common emojis
    if (code >= 0x1f000) {
      // Emoji range starts at U+1F000
      len += 2;
    } else {
      len += 1;
    }
  }
  return len;
}

/**
 * Color text helper.
 */
function colorText(text: string, color: Color, bold = false): string {
  const boldCode = bold ? BOLD : "";
  return `${boldCode}${colorCodes[color]}${text}${RESET}`;
}

/**
 * Write to stdout directly.
 */
function writeStdout(text: string): void {
  process.stdout.write(text);
}

/**
 * Write a boxed line with proper padding.
 */
function writeBoxLine(content: string): void {
  const visLen = visibleLength(content);
  const padding = Math.max(0, CONTENT_WIDTH - visLen);
  writeStdout(
    colorText("║", "red") +
      " " +
      content +
      " ".repeat(padding) +
      " " +
      colorText("║", "red") +
      "\n",
  );
}

/**
 * Write a horizontal border line.
 */
function writeBorder(type: "top" | "middle" | "bottom" | "divider"): void {
  const chars = {
    top: { left: "╔", right: "╗", fill: "═" },
    middle: { left: "╠", right: "╣", fill: "═" },
    bottom: { left: "╚", right: "╝", fill: "═" },
    divider: { left: "╟", right: "╢", fill: "─" },
  };
  const { left, right, fill } = chars[type];
  writeStdout(
    colorText(`${left}${fill.repeat(BOX_WIDTH - 2)}${right}`, "red") + "\n",
  );
}

/**
 * Truncate text to fit within max width, adding ellipsis if needed.
 */
function truncateText(text: string, maxWidth: number): string {
  if (text.length <= maxWidth) {
    return text;
  }
  return text.substring(0, maxWidth - 3) + "...";
}

/**
 * Parse stack frame information.
 */
interface StackFrame {
  isExternal: boolean;
  functionName: string;
  filePath: string;
  lineNumber: string;
  columnNumber: string;
  shortPath: string;
}

/**
 * Parse a stack frame line into structured data.
 */
function parseStackFrame(line: string): StackFrame | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("at")) return null;

  const isExternal = trimmed.includes("node_modules");

  // Match: at FunctionName (filepath:line:col) or at filepath:line:col
  const matchWithFunc = trimmed.match(/at\s+(.+?)\s+\((.+):(\d+):(\d+)\)/);
  const matchWithoutFunc = trimmed.match(/at\s+(.+):(\d+):(\d+)/);

  let functionName = "";
  let filePath = "";
  let lineNumber = "";
  let columnNumber = "";

  if (matchWithFunc) {
    functionName = matchWithFunc[1];
    filePath = matchWithFunc[2];
    lineNumber = matchWithFunc[3];
    columnNumber = matchWithFunc[4];
  } else if (matchWithoutFunc) {
    functionName = "<anonymous>";
    filePath = matchWithoutFunc[1];
    lineNumber = matchWithoutFunc[2];
    columnNumber = matchWithoutFunc[3];
  } else {
    return null;
  }

  // Create short path (last 2 segments or from src/)
  const pathParts = filePath.split(/[/\\]/);
  let shortPath = filePath;
  const srcIndex = pathParts.findIndex((p) => p === "src");
  if (srcIndex !== -1) {
    shortPath = pathParts.slice(srcIndex).join("/");
  } else if (pathParts.length > 2) {
    shortPath = ".../" + pathParts.slice(-2).join("/");
  }

  return {
    isExternal,
    functionName,
    filePath,
    lineNumber,
    columnNumber,
    shortPath,
  };
}

/**
 * Beautify stack trace with professional ExpressoTS styling.
 *
 * @layer public
 * @audience application-developers
 * @concept error-visualization
 *
 * @summary
 * Formats error stack traces with visual clarity for development debugging.
 * Separates application code from external libraries and highlights the error origin.
 *
 * @param stack - Raw stack trace string
 * @returns Empty string (output is written directly to stdout)
 *
 * @public API
 */
export function beautifyStackTrace(stack: string): string {
  if (!stack) return "";

  const lines = stack.split("\n");
  const errorMessage = lines.shift()?.trim() || "Unknown Error";

  // Parse all stack frames
  const frames: Array<StackFrame> = [];
  for (const line of lines) {
    const frame = parseStackFrame(line);
    if (frame) {
      frames.push(frame);
    }
  }

  if (frames.length === 0) {
    writeStdout(colorText(`\n[ERROR] ${errorMessage}`, "red", true) + "\n");
    return "";
  }

  // Separate application and external frames
  const appFrames = frames.filter((f) => !f.isExternal);
  const extFrames = frames.filter((f) => f.isExternal);

  // Draw the error box
  writeStdout("\n");
  writeBorder("top");

  // Header - centered title (using ASCII for consistent width)
  const headerText = "[!] RUNTIME ERROR";
  const headerPadding = Math.floor((CONTENT_WIDTH - headerText.length) / 2);
  writeBoxLine(
    " ".repeat(headerPadding) +
      colorText(headerText, "red", true) +
      " ".repeat(CONTENT_WIDTH - headerPadding - headerText.length),
  );

  writeBorder("middle");

  // Error message - truncate if too long
  const truncatedMessage = truncateText(errorMessage, CONTENT_WIDTH);
  writeBoxLine(colorText(truncatedMessage, "white", true));

  writeBorder("middle");

  // Error origin (first application frame)
  const origin = appFrames[0] || frames[0];
  writeBoxLine(colorText("[>] Origin:", "yellow", true));
  writeBoxLine(
    "    " +
      colorText(truncateText(origin.functionName, CONTENT_WIDTH - 4), "cyan"),
  );

  // File path - truncate and wrap if needed
  const originLocation = `${origin.filePath}:${origin.lineNumber}:${origin.columnNumber}`;
  const truncatedLocation = truncateText(originLocation, CONTENT_WIDTH - 8);
  writeBoxLine("    -> " + colorText(truncatedLocation, "white"));

  writeBorder("middle");

  // Application Stack Frames
  if (appFrames.length > 0) {
    writeBoxLine(
      colorText(
        `[+] Application Stack (${appFrames.length} frames):`,
        "green",
        true,
      ),
    );

    const maxAppFrames = Math.min(appFrames.length, 5);
    for (let i = 0; i < maxAppFrames; i++) {
      const frame = appFrames[i];
      const connector =
        i === maxAppFrames - 1 && appFrames.length <= 5 ? "`-" : "|-";
      const frameNum = String(i + 1).padStart(2, " ");
      const funcName = truncateText(frame.functionName, CONTENT_WIDTH - 16);

      writeBoxLine(
        `    ${connector} ` +
          colorText(`#${frameNum}`, "blue") +
          " " +
          colorText(funcName, "cyan"),
      );

      // Location line (shortened path)
      const locText = truncateText(
        `${frame.shortPath}:${frame.lineNumber}`,
        CONTENT_WIDTH - 10,
      );
      writeBoxLine(`       ${DIM}${locText}${RESET}`);
    }

    if (appFrames.length > 5) {
      const remaining = appFrames.length - 5;
      writeBoxLine(`    \`- ${colorText(`... +${remaining} more`, "white")}`);
    }
  }

  // External Library Frames (collapsed summary)
  if (extFrames.length > 0) {
    writeBorder("divider");
    writeBoxLine(
      colorText(`[~] External Libraries (${extFrames.length} frames):`, "blue"),
    );

    // Show first 3 external frames in compact form
    const maxExtFrames = Math.min(extFrames.length, 3);
    for (let i = 0; i < maxExtFrames; i++) {
      const frame = extFrames[i];
      const connector =
        i === maxExtFrames - 1 && extFrames.length <= 3 ? "`-" : "|-";

      // Extract package name from node_modules path
      const nodeModulesMatch = frame.filePath.match(
        /node_modules[/\\](@[^/\\]+[/\\][^/\\]+|[^/\\]+)/,
      );
      const packageName = nodeModulesMatch
        ? nodeModulesMatch[1].replace(/\\/g, "/")
        : "external";

      const funcName = truncateText(frame.functionName, 30);
      const pkgName = truncateText(packageName, 25);
      writeBoxLine(
        `    ${connector} ` +
          colorText(funcName, "white") +
          ` ${DIM}(${pkgName})${RESET}`,
      );
    }

    if (extFrames.length > 3) {
      const remaining = extFrames.length - 3;
      writeBoxLine(`    \`- ${colorText(`... +${remaining} more`, "white")}`);
    }
  }

  // Footer with timestamp
  writeBorder("middle");
  const timestamp = new Date().toISOString();
  writeBoxLine(colorText(`[*] ${timestamp}`, "yellow"));
  writeBorder("bottom");
  writeStdout("\n");

  return "";
}
