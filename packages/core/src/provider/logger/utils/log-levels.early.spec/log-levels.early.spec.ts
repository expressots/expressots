// Unit tests for: log-levels.ts

import {
  LogLevel,
  parseLogLevel,
  logLevelToString,
  shouldLog,
  type LogLevelString,
} from "../log-levels";

describe("LogLevel", () => {
  describe("parseLogLevel", () => {
    it("should return number as-is", () => {
      expect(parseLogLevel(LogLevel.INFO)).toBe(LogLevel.INFO);
      expect(parseLogLevel(LogLevel.ERROR)).toBe(LogLevel.ERROR);
    });

    it("should parse ALL string", () => {
      expect(parseLogLevel("ALL")).toBe(LogLevel.ALL);
      expect(parseLogLevel("all")).toBe(LogLevel.ALL);
      expect(parseLogLevel("All")).toBe(LogLevel.ALL);
    });

    it("should parse TRACE string as alias for ALL", () => {
      expect(parseLogLevel("TRACE")).toBe(LogLevel.ALL);
      expect(parseLogLevel("trace")).toBe(LogLevel.ALL);
      expect(parseLogLevel("Trace")).toBe(LogLevel.ALL);
    });

    it("should parse DEBUG string", () => {
      expect(parseLogLevel("DEBUG")).toBe(LogLevel.DEBUG);
      expect(parseLogLevel("debug")).toBe(LogLevel.DEBUG);
    });

    it("should parse INFO string", () => {
      expect(parseLogLevel("INFO")).toBe(LogLevel.INFO);
      expect(parseLogLevel("info")).toBe(LogLevel.INFO);
    });

    it("should parse WARN string", () => {
      expect(parseLogLevel("WARN")).toBe(LogLevel.WARN);
      expect(parseLogLevel("warn")).toBe(LogLevel.WARN);
    });

    it("should parse ERROR string", () => {
      expect(parseLogLevel("ERROR")).toBe(LogLevel.ERROR);
      expect(parseLogLevel("error")).toBe(LogLevel.ERROR);
    });

    it("should parse FATAL string", () => {
      expect(parseLogLevel("FATAL")).toBe(LogLevel.FATAL);
      expect(parseLogLevel("fatal")).toBe(LogLevel.FATAL);
    });

    it("should parse SILENT string", () => {
      expect(parseLogLevel("SILENT")).toBe(LogLevel.SILENT);
      expect(parseLogLevel("silent")).toBe(LogLevel.SILENT);
    });

    it("should handle legacy NONE level", () => {
      expect(parseLogLevel("NONE")).toBe(LogLevel.INFO);
      expect(parseLogLevel("none")).toBe(LogLevel.INFO);
    });

    it("should default to INFO for unknown levels", () => {
      expect(parseLogLevel("UNKNOWN")).toBe(LogLevel.INFO);
      expect(parseLogLevel("invalid")).toBe(LogLevel.INFO);
      expect(parseLogLevel("")).toBe(LogLevel.INFO);
    });
  });

  describe("logLevelToString", () => {
    it("should convert ALL to string", () => {
      expect(logLevelToString(LogLevel.ALL)).toBe("ALL");
    });

    it("should convert DEBUG to string", () => {
      expect(logLevelToString(LogLevel.DEBUG)).toBe("DEBUG");
    });

    it("should convert INFO to string", () => {
      expect(logLevelToString(LogLevel.INFO)).toBe("INFO");
    });

    it("should convert WARN to string", () => {
      expect(logLevelToString(LogLevel.WARN)).toBe("WARN");
    });

    it("should convert ERROR to string", () => {
      expect(logLevelToString(LogLevel.ERROR)).toBe("ERROR");
    });

    it("should convert FATAL to string", () => {
      expect(logLevelToString(LogLevel.FATAL)).toBe("FATAL");
    });

    it("should convert SILENT to string", () => {
      expect(logLevelToString(LogLevel.SILENT)).toBe("SILENT");
    });

    it("should default to INFO for unknown level", () => {
      expect(logLevelToString(999 as LogLevel)).toBe("INFO");
      expect(logLevelToString(-1 as LogLevel)).toBe("INFO");
    });
  });

  describe("shouldLog", () => {
    it("should return false when configured level is SILENT", () => {
      expect(shouldLog(LogLevel.ALL, LogLevel.SILENT)).toBe(false);
      expect(shouldLog(LogLevel.INFO, LogLevel.SILENT)).toBe(false);
      expect(shouldLog(LogLevel.ERROR, LogLevel.SILENT)).toBe(false);
    });

    it("should log when message level >= configured level", () => {
      expect(shouldLog(LogLevel.INFO, LogLevel.INFO)).toBe(true);
      expect(shouldLog(LogLevel.WARN, LogLevel.INFO)).toBe(true);
      expect(shouldLog(LogLevel.ERROR, LogLevel.INFO)).toBe(true);
    });

    it("should not log when message level < configured level", () => {
      expect(shouldLog(LogLevel.DEBUG, LogLevel.INFO)).toBe(false);
      expect(shouldLog(LogLevel.ALL, LogLevel.INFO)).toBe(false);
    });

    it("should handle all level combinations", () => {
      // ALL level - logs everything except SILENT
      expect(shouldLog(LogLevel.ALL, LogLevel.ALL)).toBe(true);
      expect(shouldLog(LogLevel.DEBUG, LogLevel.ALL)).toBe(true);
      expect(shouldLog(LogLevel.INFO, LogLevel.ALL)).toBe(true);
      expect(shouldLog(LogLevel.WARN, LogLevel.ALL)).toBe(true);
      expect(shouldLog(LogLevel.ERROR, LogLevel.ALL)).toBe(true);
      expect(shouldLog(LogLevel.FATAL, LogLevel.ALL)).toBe(true);

      // DEBUG level
      expect(shouldLog(LogLevel.ALL, LogLevel.DEBUG)).toBe(false);
      expect(shouldLog(LogLevel.DEBUG, LogLevel.DEBUG)).toBe(true);
      expect(shouldLog(LogLevel.INFO, LogLevel.DEBUG)).toBe(true);

      // WARN level
      expect(shouldLog(LogLevel.INFO, LogLevel.WARN)).toBe(false);
      expect(shouldLog(LogLevel.WARN, LogLevel.WARN)).toBe(true);
      expect(shouldLog(LogLevel.ERROR, LogLevel.WARN)).toBe(true);

      // ERROR level
      expect(shouldLog(LogLevel.WARN, LogLevel.ERROR)).toBe(false);
      expect(shouldLog(LogLevel.ERROR, LogLevel.ERROR)).toBe(true);
      expect(shouldLog(LogLevel.FATAL, LogLevel.ERROR)).toBe(true);

      // FATAL level
      expect(shouldLog(LogLevel.ERROR, LogLevel.FATAL)).toBe(false);
      expect(shouldLog(LogLevel.FATAL, LogLevel.FATAL)).toBe(true);
    });
  });
});
