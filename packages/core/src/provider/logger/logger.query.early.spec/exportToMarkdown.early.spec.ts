// Unit tests for: exportToMarkdown function

import { exportToMarkdown } from "../logger.query";
import { LogEntry } from "../utils/log-entry";
import { LogLevel } from "../utils/log-levels";

describe("exportToMarkdown", () => {
  let entries: Array<LogEntry>;

  beforeEach(() => {
    entries = [
      {
        level: LogLevel.INFO,
        message: "Info message",
        context: "Context1",
        timestamp: new Date("2024-01-01T00:00:00Z"),
        data: { key: "value" },
      },
      {
        level: LogLevel.WARN,
        message: "Warn message",
        context: "Context2",
        timestamp: new Date("2024-01-01T00:00:01Z"),
        error: new Error("Test error"),
      },
      {
        level: LogLevel.ERROR,
        message: "Error message",
        timestamp: new Date("2024-01-01T00:00:02Z"),
        trace: { file: "test.ts", line: 10 },
        performance: {
          duration: 100,
          memoryDelta: 1024,
          cpuUsage: 5.5,
        },
      },
    ];
  });

  it("should export with default options", () => {
    // Act
    const markdown = exportToMarkdown(entries);

    // Assert
    expect(markdown).toContain("# Log Export");
    expect(markdown).toContain("Info message");
    expect(markdown).toContain("Warn message");
    expect(markdown).toContain("Error message");
  });

  it("should export with custom title", () => {
    // Act
    const markdown = exportToMarkdown(entries, { title: "Custom Title" });

    // Assert
    expect(markdown).toContain("# Custom Title");
  });

  it("should include stats when includeStats is true", () => {
    // Act
    const markdown = exportToMarkdown(entries, { includeStats: true });

    // Assert
    expect(markdown).toContain("## Statistics");
    expect(markdown).toContain("Total");
  });

  it("should not include stats when includeStats is false", () => {
    // Act
    const markdown = exportToMarkdown(entries, { includeStats: false });

    // Assert
    expect(markdown).not.toContain("## Statistics");
  });

  it("should group by level", () => {
    // Act
    const markdown = exportToMarkdown(entries, { groupBy: "level" });

    // Assert
    expect(markdown).toContain("## INFO");
    expect(markdown).toContain("## WARN");
    expect(markdown).toContain("## ERROR");
  });

  it("should group by context", () => {
    // Act
    const markdown = exportToMarkdown(entries, { groupBy: "context" });

    // Assert
    expect(markdown).toContain("## Context1");
    expect(markdown).toContain("## Context2");
  });

  it("should not group when groupBy is none", () => {
    // Act
    const markdown = exportToMarkdown(entries, { groupBy: "none" });

    // Assert
    // Check for group headers (## followed by newline), not entry formats (###)
    expect(markdown).not.toMatch(/^## INFO$/m);
    expect(markdown).not.toMatch(/^## Context1$/m);
    // Verify entries still use ### format (3 hashes)
    expect(markdown).toContain("### INFO");
  });

  it("should format entry with data", () => {
    // Act
    const markdown = exportToMarkdown([entries[0]]);

    // Assert
    expect(markdown).toContain("**Data**:");
    expect(markdown).toContain("key");
    expect(markdown).toContain("value");
  });

  it("should format entry with error", () => {
    // Act
    const markdown = exportToMarkdown([entries[1]]);

    // Assert
    expect(markdown).toContain("**Error**:");
    expect(markdown).toContain("Test error");
  });

  it("should format entry with trace", () => {
    // Act
    const markdown = exportToMarkdown([entries[2]]);

    // Assert
    expect(markdown).toContain("**Trace**:");
    expect(markdown).toContain("test.ts");
  });

  it("should format entry with performance", () => {
    // Act
    const markdown = exportToMarkdown([entries[2]]);

    // Assert
    expect(markdown).toContain("**Performance**:");
    expect(markdown).toContain("Duration");
    expect(markdown).toContain("Memory Delta");
    expect(markdown).toContain("CPU Usage");
  });

  it("should handle entry without context", () => {
    // Arrange
    const entryWithoutContext = {
      ...entries[0],
      context: undefined,
    };

    // Act
    const markdown = exportToMarkdown([entryWithoutContext]);

    // Assert
    expect(markdown).toBeDefined();
    expect(markdown).toContain("Info message");
  });

  it("should handle entry with string error", () => {
    // Arrange
    const entryWithStringError = {
      ...entries[1],
      error: "String error",
    };

    // Act
    const markdown = exportToMarkdown([entryWithStringError]);

    // Assert
    expect(markdown).toContain("String error");
  });

  it("should handle empty entries array", () => {
    // Act
    const markdown = exportToMarkdown([]);

    // Assert
    expect(markdown).toContain("# Log Export");
    expect(markdown).not.toContain("###");
  });
});

