// Unit tests for: logger.formatter

import {
  formatDev,
  formatProd,
  formatGroupedDev,
  formatGroupedProd,
} from "../logger.formatter";
import { LogEntry } from "../utils/log-entry";
import { LogLevel } from "../utils/log-levels";
import { GroupedLogEntry } from "../logger.grouping";
import { RequestFlow, FlowStep, FlowStepType } from "../logger.flow";
import { Redactor } from "../logger.redaction";

describe("logger.formatter", () => {
  const baseEntry: LogEntry = {
    timestamp: new Date("2024-01-15T10:30:00Z"),
    level: LogLevel.INFO,
    message: "Test message",
  };

  describe("formatDev()", () => {
    it("should format basic log entry", () => {
      // Act
      const result = formatDev(baseEntry);

      // Assert
      expect(result).toContain("[ExpressoTS]");
      expect(result).toContain("Test message");
      expect(result).toContain("INFO");
    });

    it("should include context when present", () => {
      // Arrange
      const entry = { ...baseEntry, context: "TestContext" };

      // Act
      const result = formatDev(entry);

      // Assert
      expect(result).toContain("[TestContext]");
    });

    it("should include PID when present", () => {
      // Arrange
      const entry = { ...baseEntry, pid: 12345 };

      // Act
      const result = formatDev(entry);

      // Assert
      expect(result).toContain("[PID:12345]");
    });

    it("should format data object", () => {
      // Arrange
      const entry = {
        ...baseEntry,
        data: { key1: "value1", key2: 42 },
      };

      // Act
      const result = formatDev(entry);

      // Assert
      expect(result).toContain("key1");
      expect(result).toContain("value1");
      expect(result).toContain("key2");
      expect(result).toContain("42");
    });

    it("should format array data", () => {
      // Arrange
      const entry = { ...baseEntry, data: [1, 2, 3] };

      // Act
      const result = formatDev(entry);

      // Assert
      expect(result).toContain("Array(3)");
    });

    it("should format error with stack trace", () => {
      // Arrange
      const error = new Error("Test error");
      error.stack = "Error: Test error\n    at test.js:1:1\n    at test.js:2:2";
      const entry = { ...baseEntry, error };

      // Act
      const result = formatDev(entry);

      // Assert
      expect(result).toContain("Error:");
      expect(result).toContain("Test error");
      expect(result).toContain("at test.js");
    });

    it("should format non-Error error objects", () => {
      // Arrange
      const entry = { ...baseEntry, error: "String error" };

      // Act
      const result = formatDev(entry);

      // Assert
      expect(result).toContain("String error");
    });

    it("should format trace information", () => {
      // Arrange
      const entry = {
        ...baseEntry,
        trace: { requestId: "req-123", userId: "user-456" },
      };

      // Act
      const result = formatDev(entry);

      // Assert
      expect(result).toContain("Trace:");
      expect(result).toContain("requestId");
      expect(result).toContain("req-123");
    });

    it("should format performance data", () => {
      // Arrange
      const entry = {
        ...baseEntry,
        performance: { duration: 150, memoryDelta: 1024 * 1024 },
      };

      // Act
      const result = formatDev(entry);

      // Assert
      expect(result).toContain("Performance:");
      expect(result).toContain("Duration");
      expect(result).toContain("Memory");
      expect(result).toContain("└─ Memory");
    });

    it("should mark the last performance metric with a tree terminator when cpu is absent", () => {
      const entry = {
        ...baseEntry,
        performance: { duration: 150 },
      };

      const result = formatDev(entry);

      expect(result).toContain("└─ Duration");
    });

    it("should include cpu usage as the final performance metric", () => {
      const entry = {
        ...baseEntry,
        performance: { duration: 150, memoryDelta: 1024, cpuUsage: 12.5 },
      };

      const result = formatDev(entry);

      expect(result).toContain("└─ CPU");
    });

    it("should format flow visualization", () => {
      // Arrange
      const now = performance.now();
      const flow: RequestFlow = {
        method: "GET",
        path: "/test",
        requestId: "req-123",
        startTime: now,
        endTime: now + 100,
        steps: [],
        totalDuration: 100,
        memoryDelta: 0,
      };
      const entry = { ...baseEntry, flow };

      // Act
      const result = formatDev(entry);

      // Assert
      expect(result).toContain("Request Flow Visualization");
      expect(result).toContain("GET /test");
    });

    it("should apply redaction when enabled", () => {
      // Arrange
      const mockRedactor = {
        redactString: jest.fn((str: string) => str.replace("password", "***")),
        redact: jest.fn((data: unknown) => data),
      } as Partial<Redactor> as Redactor;
      const entry = {
        ...baseEntry,
        message: "User password is secret",
      };

      // Act
      const result = formatDev(entry, { redact: true, redactor: mockRedactor });

      // Assert
      expect(mockRedactor.redactString).toHaveBeenCalled();
      expect(result).toContain("***");
    });

    it("should not apply redaction when disabled", () => {
      // Arrange
      const mockRedactor = {
        redactString: jest.fn(),
        redact: jest.fn(),
      } as Partial<Redactor> as Redactor;
      const entry = {
        ...baseEntry,
        message: "User password is secret",
      };

      // Act
      formatDev(entry, { redact: false, redactor: mockRedactor });

      // Assert
      expect(mockRedactor.redactString).not.toHaveBeenCalled();
    });

    it("should format different log levels with correct colors", () => {
      // Act
      const infoResult = formatDev({ ...baseEntry, level: LogLevel.INFO });
      const warnResult = formatDev({ ...baseEntry, level: LogLevel.WARN });
      const errorResult = formatDev({ ...baseEntry, level: LogLevel.ERROR });

      // Assert
      expect(infoResult).toContain("INFO");
      expect(warnResult).toContain("WARN");
      expect(errorResult).toContain("ERROR");
    });
  });

  describe("formatProd()", () => {
    it("should format basic log entry as JSON", () => {
      // Act
      const result = formatProd(baseEntry);
      const parsed = JSON.parse(result);

      // Assert
      expect(parsed.timestamp).toBe(baseEntry.timestamp.toISOString());
      expect(parsed.level).toBe("INFO");
      expect(parsed.message).toBe("Test message");
    });

    it("should include context in JSON", () => {
      // Arrange
      const entry = { ...baseEntry, context: "TestContext" };

      // Act
      const result = formatProd(entry);
      const parsed = JSON.parse(result);

      // Assert
      expect(parsed.context).toBe("TestContext");
    });

    it("should include PID in JSON", () => {
      // Arrange
      const entry = { ...baseEntry, pid: 12345 };

      // Act
      const result = formatProd(entry);
      const parsed = JSON.parse(result);

      // Assert
      expect(parsed.pid).toBe(12345);
    });

    it("should include data in JSON", () => {
      // Arrange
      const entry = { ...baseEntry, data: { key: "value" } };

      // Act
      const result = formatProd(entry);
      const parsed = JSON.parse(result);

      // Assert
      expect(parsed.data).toEqual({ key: "value" });
    });

    it("should format error in JSON", () => {
      // Arrange
      const error = new Error("Test error");
      error.stack = "Error: Test error\n    at test.js:1:1";
      const entry = { ...baseEntry, error };

      // Act
      const result = formatProd(entry);
      const parsed = JSON.parse(result);

      // Assert
      expect(parsed.error).toEqual({
        name: "Error",
        message: "Test error",
        stack: error.stack,
      });
    });

    it("should format non-Error error in JSON", () => {
      // Arrange
      const entry = { ...baseEntry, error: "String error" };

      // Act
      const result = formatProd(entry);
      const parsed = JSON.parse(result);

      // Assert
      expect(parsed.error).toEqual({ message: "String error" });
    });

    it("should include trace in JSON", () => {
      // Arrange
      const entry = {
        ...baseEntry,
        trace: { requestId: "req-123" },
      };

      // Act
      const result = formatProd(entry);
      const parsed = JSON.parse(result);

      // Assert
      expect(parsed.trace).toEqual({ requestId: "req-123" });
    });

    it("should include performance in JSON", () => {
      // Arrange
      const entry = {
        ...baseEntry,
        performance: { duration: 150 },
      };

      // Act
      const result = formatProd(entry);
      const parsed = JSON.parse(result);

      // Assert
      expect(parsed.performance).toEqual({ duration: 150 });
    });

    it("should include flow in JSON", () => {
      // Arrange
      const now = performance.now();
      const flow: RequestFlow = {
        method: "GET",
        path: "/test",
        requestId: "req-123",
        startTime: now,
        endTime: now + 100,
        steps: [],
        totalDuration: 100,
        memoryDelta: 0,
      };
      const entry = { ...baseEntry, flow };

      // Act
      const result = formatProd(entry);
      const parsed = JSON.parse(result);

      // Assert
      expect(parsed.flow).toBeDefined();
      expect(parsed.flow.method).toBe("GET");
    });

    it("should include metadata in JSON", () => {
      // Arrange
      const entry = {
        ...baseEntry,
        metadata: { customKey: "customValue" },
      };

      // Act
      const result = formatProd(entry);
      const parsed = JSON.parse(result);

      // Assert
      expect(parsed.metadata).toEqual({ customKey: "customValue" });
    });

    it("should apply redaction in production", () => {
      // Arrange
      const mockRedactor = {
        redactString: jest.fn((str: string) => str.replace("secret", "***")),
        redact: jest.fn((data: unknown) => data),
      } as Partial<Redactor> as Redactor;
      const entry = {
        ...baseEntry,
        message: "This is a secret message",
      };

      // Act
      const result = formatProd(entry, {
        redact: true,
        redactor: mockRedactor,
      });
      const parsed = JSON.parse(result);

      // Assert
      expect(mockRedactor.redactString).toHaveBeenCalled();
      expect(parsed.message).toContain("***");
    });
  });

  describe("formatGroupedDev()", () => {
    it("should format grouped log entry", () => {
      // Arrange
      const groupedEntry: GroupedLogEntry = {
        representative: baseEntry,
        entries: [baseEntry],
        count: 1,
        firstOccurrence: baseEntry.timestamp,
        lastOccurrence: baseEntry.timestamp,
        groupKey: "test-message",
      };

      // Act
      const result = formatGroupedDev(groupedEntry);

      // Assert
      expect(result).toContain("[GROUPED");
      expect(result).toContain("Test message");
      expect(result).toContain("First:");
      expect(result).toContain("Last:");
      expect(result).toContain("Count:");
    });

    it("should show count in grouped message", () => {
      // Arrange
      const entries = [
        { ...baseEntry, timestamp: new Date("2024-01-15T10:30:00Z") },
        { ...baseEntry, timestamp: new Date("2024-01-15T10:31:00Z") },
        { ...baseEntry, timestamp: new Date("2024-01-15T10:32:00Z") },
      ];
      const groupedEntry: GroupedLogEntry = {
        representative: entries[0],
        entries,
        count: 3,
        firstOccurrence: entries[0].timestamp,
        lastOccurrence: entries[2].timestamp,
        groupKey: "test-message",
      };

      // Act
      const result = formatGroupedDev(groupedEntry);

      // Assert
      expect(result).toContain("×3");
      expect(result).toContain("3 occurrences");
    });

    it("should show sample entries when multiple entries", () => {
      // Arrange
      const entries = [
        { ...baseEntry, timestamp: new Date("2024-01-15T10:30:00Z") },
        { ...baseEntry, timestamp: new Date("2024-01-15T10:31:00Z") },
        { ...baseEntry, timestamp: new Date("2024-01-15T10:32:00Z") },
      ];
      const groupedEntry: GroupedLogEntry = {
        representative: entries[0],
        entries,
        count: 3,
        firstOccurrence: entries[0].timestamp,
        lastOccurrence: entries[2].timestamp,
        groupKey: "test-message",
      };

      // Act
      const result = formatGroupedDev(groupedEntry);

      // Assert
      expect(result).toContain("Sample entries");
    });

    it("should format time range", () => {
      // Arrange
      const first = new Date("2024-01-15T10:30:00Z");
      const last = new Date("2024-01-15T10:30:05Z");
      const groupedEntry: GroupedLogEntry = {
        representative: baseEntry,
        entries: [baseEntry],
        count: 1,
        firstOccurrence: first,
        lastOccurrence: last,
        groupKey: "test-message",
      };

      // Act
      const result = formatGroupedDev(groupedEntry);

      // Assert
      // 5000ms = 5 seconds, formatted as "5.0s"
      expect(result).toContain("5.0s");
    });
  });

  describe("formatGroupedProd()", () => {
    it("should format grouped log entry as JSON", () => {
      // Arrange
      const groupedEntry: GroupedLogEntry = {
        representative: baseEntry,
        entries: [baseEntry],
        count: 5,
        firstOccurrence: baseEntry.timestamp,
        lastOccurrence: baseEntry.timestamp,
        groupKey: "test-message",
      };

      // Act
      const result = formatGroupedProd(groupedEntry);
      const parsed = JSON.parse(result);

      // Assert
      expect(parsed.grouped).toBe(true);
      expect(parsed.count).toBe(5);
      expect(parsed.firstOccurrence).toBe(baseEntry.timestamp.toISOString());
      expect(parsed.lastOccurrence).toBe(baseEntry.timestamp.toISOString());
    });

    it("should include sample entries in JSON", () => {
      // Arrange
      const entries = [
        { ...baseEntry, timestamp: new Date("2024-01-15T10:30:00Z") },
        { ...baseEntry, timestamp: new Date("2024-01-15T10:31:00Z") },
        { ...baseEntry, timestamp: new Date("2024-01-15T10:32:00Z") },
      ];
      const groupedEntry: GroupedLogEntry = {
        representative: entries[0],
        entries,
        count: 3,
        firstOccurrence: entries[0].timestamp,
        lastOccurrence: entries[2].timestamp,
        groupKey: "test-message",
      };

      // Act
      const result = formatGroupedProd(groupedEntry);
      const parsed = JSON.parse(result);

      // Assert
      expect(parsed.sampleEntries).toBeDefined();
      expect(parsed.sampleEntries.length).toBeGreaterThan(0);
    });

    it("should include time range in JSON", () => {
      // Arrange
      const first = new Date("2024-01-15T10:30:00Z");
      const last = new Date("2024-01-15T10:30:02Z");
      const groupedEntry: GroupedLogEntry = {
        representative: baseEntry,
        entries: [baseEntry],
        count: 1,
        firstOccurrence: first,
        lastOccurrence: last,
        groupKey: "test-message",
      };

      // Act
      const result = formatGroupedProd(groupedEntry);
      const parsed = JSON.parse(result);

      // Assert
      expect(parsed.timeRange).toBeDefined();
      // 2000ms = 2 seconds, formatted as "2.0s"
      expect(parsed.timeRange).toContain("s");
    });
  });

  describe("formatFlow()", () => {
    it("should format flow with steps", () => {
      // Arrange
      const now = performance.now();
      const step: FlowStep = {
        type: "middleware" as FlowStepType,
        name: "AuthMiddleware",
        duration: 10.5,
        status: "success",
        startTime: now,
        endTime: now + 10.5,
      };
      const flow: RequestFlow = {
        method: "GET",
        path: "/api/users",
        requestId: "req-123",
        startTime: now,
        endTime: now + 100,
        steps: [step],
        totalDuration: 100,
        memoryDelta: 1024 * 1024,
      };
      const entry = { ...baseEntry, flow };

      // Act
      const result = formatDev(entry);

      // Assert
      expect(result).toContain("Request Flow Visualization");
      expect(result).toContain("GET /api/users");
      expect(result).toContain("req-123");
      expect(result).toContain("Total Duration");
    });

    it("should format flow without steps", () => {
      // Arrange
      const now = performance.now();
      const flow: RequestFlow = {
        method: "POST",
        path: "/api/login",
        requestId: "req-456",
        startTime: now,
        endTime: now + 50,
        steps: [],
        totalDuration: 50,
        memoryDelta: 0,
      };
      const entry = { ...baseEntry, flow };

      // Act
      const result = formatDev(entry);

      // Assert
      expect(result).toContain("No steps tracked");
    });

    it("should format flow with status code", () => {
      // Arrange
      const now = performance.now();
      const flow: RequestFlow = {
        method: "GET",
        path: "/api/users",
        requestId: "req-123",
        startTime: now,
        endTime: now + 100,
        steps: [],
        totalDuration: 100,
        memoryDelta: 0,
        statusCode: 200,
      };
      const entry = { ...baseEntry, flow };

      // Act
      const result = formatDev(entry);

      // Assert
      expect(result).toContain("Status Code");
      expect(result).toContain("200");
    });

    it("should format flow with error", () => {
      // Arrange
      const now = performance.now();
      const error = new Error("Request failed");
      const flow: RequestFlow = {
        method: "GET",
        path: "/api/users",
        requestId: "req-123",
        startTime: now,
        endTime: now + 100,
        steps: [],
        totalDuration: 100,
        memoryDelta: 0,
        error,
      };
      const entry = { ...baseEntry, flow };

      // Act
      const result = formatDev(entry);

      // Assert
      expect(result).toContain("Error:");
      expect(result).toContain("Request failed");
    });

    it("should format nested flow steps", () => {
      // Arrange
      const now = performance.now();
      const childStep: FlowStep = {
        type: "guard" as FlowStepType,
        name: "AuthGuard",
        duration: 5,
        status: "success",
        startTime: now + 10,
        endTime: now + 15,
      };
      const parentStep: FlowStep = {
        type: "controller" as FlowStepType,
        name: "UserController",
        duration: 20,
        status: "success",
        startTime: now,
        endTime: now + 20,
        children: [childStep],
      };
      const flow: RequestFlow = {
        method: "GET",
        path: "/api/users",
        requestId: "req-123",
        startTime: now,
        endTime: now + 100,
        steps: [parentStep],
        totalDuration: 100,
        memoryDelta: 0,
      };
      const entry = { ...baseEntry, flow };

      // Act
      const result = formatDev(entry);

      // Assert
      expect(result).toContain("UserController");
      expect(result).toContain("AuthGuard");
    });
  });

  describe("edge cases", () => {
    it("should handle empty data object", () => {
      // Arrange
      const entry = { ...baseEntry, data: {} };

      // Act
      const result = formatDev(entry);

      // Assert
      expect(result).toBeDefined();
    });

    it("should handle null values in data", () => {
      // Arrange
      const entry = { ...baseEntry, data: { key: null } };

      // Act
      const result = formatDev(entry);

      // Assert
      expect(result).toContain("null");
    });

    it("should handle undefined values in data", () => {
      // Arrange
      const entry = { ...baseEntry, data: { key: undefined } };

      // Act
      const result = formatDev(entry);

      // Assert
      expect(result).toContain("undefined");
    });

    it("should handle error without stack", () => {
      // Arrange
      const error = new Error("Test error");
      delete (error as any).stack;
      const entry = { ...baseEntry, error };

      // Act
      const result = formatDev(entry);

      // Assert
      expect(result).toContain("Test error");
    });

    it("should truncate long error messages in flow", () => {
      // Arrange
      const now = performance.now();
      const longMessage = "A".repeat(100);
      const error = new Error(longMessage);
      const flow: RequestFlow = {
        method: "GET",
        path: "/test",
        requestId: "req-123",
        startTime: now,
        endTime: now + 100,
        steps: [],
        totalDuration: 100,
        memoryDelta: 0,
        error,
      };
      const entry = { ...baseEntry, flow };

      // Act
      const result = formatDev(entry);

      // Assert
      // Error message should be truncated (maxErrorLength = boxWidth - 8 = 65 - 8 = 57 chars)
      // So a 100-char message should be truncated and end with "..."
      expect(result).toContain("Error:");
      // The truncated error message should be shorter than the original
      // Remove ANSI codes for checking
      const plainResult = result.replace(/\x1b\[[0-9;]*m/g, "");
      const errorMatch = plainResult.match(/Error:\s+(.+?)(?:\s+║|$)/);
      if (errorMatch) {
        const displayedError = errorMatch[1];
        // Should be truncated (either ends with "..." or is <= 57 chars)
        expect(displayedError.length).toBeLessThan(longMessage.length);
        if (displayedError.length >= 54) {
          // If close to max length, should end with "..."
          expect(displayedError).toContain("...");
        }
      }
    });
  });
});
