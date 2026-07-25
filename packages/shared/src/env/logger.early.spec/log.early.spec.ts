// Unit tests for: log

import { stdout } from "process";
import { log, LogLevel } from "../logger";

describe("log() log method", () => {
  let writeSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock stdout.write to capture output
    writeSpy = jest.spyOn(stdout, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    // Restore the original implementation
    writeSpy.mockRestore();
  });

  it("should log an info message with the default log level", () => {
    // Test the default log level (Info)
    const message = "This is an info message";
    log(message);

    expect(writeSpy).toHaveBeenCalledWith(`[ExpressoTS][INFO] ${message}\n`);
  });

  it("should log an info message when log level is explicitly set to Info", () => {
    // Test explicit Info log level
    const message = "This is an info message";
    log(message, LogLevel.Info);

    expect(writeSpy).toHaveBeenCalledWith(`[ExpressoTS][INFO] ${message}\n`);
  });

  it("should log a warning message when log level is set to Warn", () => {
    // Test Warn log level
    const message = "This is a warning message";
    log(message, LogLevel.Warn);

    expect(writeSpy).toHaveBeenCalledWith(`[ExpressoTS][WARN] ${message}\n`);
  });

  it("should log a debug message when log level is set to Debug", () => {
    // Test Debug log level
    const message = "This is a debug message";
    log(message, LogLevel.Debug);

    expect(writeSpy).toHaveBeenCalledWith(`[ExpressoTS][DEBUG] ${message}\n`);
  });

  it("should handle an empty message correctly", () => {
    // Test logging an empty message
    const message = "";
    log(message, LogLevel.Info);

    expect(writeSpy).toHaveBeenCalledWith(`[ExpressoTS][INFO] ${message}\n`);
  });

  it("should handle a very long message correctly", () => {
    // Test logging a very long message
    const message = "a".repeat(1000);
    log(message, LogLevel.Info);

    expect(writeSpy).toHaveBeenCalledWith(`[ExpressoTS][INFO] ${message}\n`);
  });
});

// End of unit tests for: log
