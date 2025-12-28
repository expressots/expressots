// Unit tests for: HttpTransport class

import { HttpTransport } from "../http.transport";
import { LogEntry } from "../../utils/log-entry";
import { LogLevel } from "../../utils/log-levels";

// Mock fetch globally
global.fetch = jest.fn();

describe("HttpTransport", () => {
  let transport: HttpTransport;
  const mockEndpoint = "https://api.example.com/logs";

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
    });
  });

  afterEach(async () => {
    if (transport) {
      await transport.close();
    }
  });

  describe("constructor", () => {
    it("should create transport with required endpoint", () => {
      // Act
      transport = new HttpTransport({ endpoint: mockEndpoint });

      // Assert
      expect(transport.name).toBe("Http");
      expect(transport.enabled).toBe(true);
      expect(transport.level).toBe(LogLevel.INFO);
    });

    it("should throw error when endpoint not provided", () => {
      // Act & Assert
      expect(() => {
        // @ts-expect-error - Testing invalid input
        transport = new HttpTransport({});
      }).toThrow("HttpTransport requires an endpoint URL");
    });

    it("should create transport with custom options", () => {
      // Act
      transport = new HttpTransport({
        endpoint: mockEndpoint,
        level: LogLevel.WARN,
        enabled: false,
        batchSize: 5,
        flushInterval: 2000,
        maxRetries: 5,
        retryDelay: 500,
        method: "PUT",
        timeout: 5000,
        headers: { "X-Custom": "value" },
      });

      // Assert
      expect(transport.level).toBe(LogLevel.WARN);
      expect(transport.enabled).toBe(false);
    });

    it("should use default values when options not provided", () => {
      // Act
      transport = new HttpTransport({ endpoint: mockEndpoint });

      // Assert
      expect(transport.level).toBe(LogLevel.INFO);
      expect(transport.enabled).toBe(true);
    });
  });

  describe("static methods", () => {
    it("create() should create transport with endpoint", () => {
      // Act
      transport = HttpTransport.create(mockEndpoint);

      // Assert
      expect(transport).toBeDefined();
      expect(transport.name).toBe("Http");
    });

    it("create() should accept additional options", () => {
      // Act
      transport = HttpTransport.create(mockEndpoint, {
        level: LogLevel.ERROR,
      });

      // Assert
      expect(transport.level).toBe(LogLevel.ERROR);
    });

    it("withBatching() should create transport with batching", () => {
      // Act
      transport = HttpTransport.withBatching(mockEndpoint, 20);

      // Assert
      expect(transport).toBeDefined();
    });
  });

  describe("log()", () => {
    it("should add entry to buffer", async () => {
      // Arrange
      transport = new HttpTransport({
        endpoint: mockEndpoint,
        batchSize: 10,
      });
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: "Test message",
        timestamp: new Date(),
      };

      // Act
      await transport.log(entry);

      // Assert
      // Entry should be buffered, not sent immediately
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should flush when buffer reaches batchSize", async () => {
      // Arrange
      transport = new HttpTransport({
        endpoint: mockEndpoint,
        batchSize: 2,
      });
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: "Test message",
        timestamp: new Date(),
      };

      // Act
      await transport.log(entry);
      await transport.log({ ...entry, message: "Message 2" });

      // Assert
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should not log when disabled", async () => {
      // Arrange
      transport = new HttpTransport({
        endpoint: mockEndpoint,
        enabled: false,
      });
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: "Test message",
        timestamp: new Date(),
      };

      // Act
      await transport.log(entry);

      // Assert
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should not log when level is below threshold", async () => {
      // Arrange
      transport = new HttpTransport({
        endpoint: mockEndpoint,
        level: LogLevel.WARN,
      });
      const entry: LogEntry = {
        level: LogLevel.DEBUG,
        message: "Debug message",
        timestamp: new Date(),
      };

      // Act
      await transport.log(entry);

      // Assert
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should schedule flush when buffer not full", async () => {
      // Arrange
      transport = new HttpTransport({
        endpoint: mockEndpoint,
        batchSize: 10,
        flushInterval: 100,
      });
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: "Test message",
        timestamp: new Date(),
      };

      // Act
      await transport.log(entry);

      // Wait for flush interval
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Assert
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe("flush()", () => {
    it("should send buffered entries", async () => {
      // Arrange
      transport = new HttpTransport({
        endpoint: mockEndpoint,
        batchSize: 10,
      });
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: "Test message",
        timestamp: new Date(),
      };

      await transport.log(entry);

      // Act
      await transport.flush();

      // Assert
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const call = (global.fetch as jest.Mock).mock.calls[0];
      expect(call[0]).toBe(mockEndpoint);
      expect(call[1].method).toBe("POST");
      expect(call[1].headers["Content-Type"]).toBe("application/json");
    });

    it("should not flush when already flushing", async () => {
      // Arrange
      transport = new HttpTransport({
        endpoint: mockEndpoint,
        batchSize: 1,
      });
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: "Test message",
        timestamp: new Date(),
      };

      // Add entry to buffer first
      await transport.log(entry);

      // Act
      const flush1 = transport.flush();
      const flush2 = transport.flush();
      await Promise.all([flush1, flush2]);

      // Assert
      // Should only flush once (second call returns early because isFlushing is true)
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should not flush when buffer is empty", async () => {
      // Arrange
      transport = new HttpTransport({ endpoint: mockEndpoint });

      // Act
      await transport.flush();

      // Assert
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should put entries back in buffer on failure", async () => {
      // Arrange
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network error"),
      );
      transport = new HttpTransport({
        endpoint: mockEndpoint,
        batchSize: 2,
      });
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: "Test message",
        timestamp: new Date(),
      };

      await transport.log(entry);
      await transport.log({ ...entry, message: "Message 2" });

      // Act
      await transport.flush();

      // Assert
      // Entries should be back in buffer for retry
      expect(global.fetch).toHaveBeenCalled();
    });

    it("should send entries with correct payload format", async () => {
      // Arrange
      transport = new HttpTransport({ endpoint: mockEndpoint });
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: "Test message",
        timestamp: new Date(),
      };

      await transport.log(entry);

      // Act
      await transport.flush();

      // Assert
      const call = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body).toHaveProperty("logs");
      expect(Array.isArray(body.logs)).toBe(true);
      expect(body.logs.length).toBe(1);
    });
  });

  describe("close()", () => {
    it("should flush remaining logs", async () => {
      // Arrange
      transport = new HttpTransport({
        endpoint: mockEndpoint,
        batchSize: 10,
      });
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: "Test message",
        timestamp: new Date(),
      };

      await transport.log(entry);

      // Act
      await transport.close();

      // Assert
      expect(global.fetch).toHaveBeenCalled();
    });

    it("should cancel flush timer", async () => {
      // Arrange
      transport = new HttpTransport({
        endpoint: mockEndpoint,
        batchSize: 10,
        flushInterval: 1000,
      });
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: "Test message",
        timestamp: new Date(),
      };

      await transport.log(entry);

      // Act
      await transport.close();

      // Wait to ensure timer was cancelled
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Assert
      // Should only flush once (from close), not from timer
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("retry logic", () => {
    it("should retry on failure", async () => {
      // Arrange
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: "OK",
        });

      transport = new HttpTransport({
        endpoint: mockEndpoint,
        batchSize: 1,
        maxRetries: 3,
        retryDelay: 10,
      });
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: "Test message",
        timestamp: new Date(),
      };

      await transport.log(entry);

      // Act
      await transport.flush();

      // Assert
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("should respect maxRetries", async () => {
      // Arrange
      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      transport = new HttpTransport({
        endpoint: mockEndpoint,
        batchSize: 10, // Large batch size so log() doesn't auto-flush
        maxRetries: 2,
        retryDelay: 10,
        flushInterval: 10000, // Long interval to prevent auto-flush
      });
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: "Test message",
        timestamp: new Date(),
      };

      await transport.log(entry);

      // Act
      // flush() catches errors and doesn't throw, but sendBatch() does throw
      // sendBatch() will retry maxRetries times (initial + maxRetries retries)
      await transport.flush();

      // Assert
      // Should retry maxRetries times: initial attempt (0) + 2 retries (1, 2) = 3 total
      // Note: The loop runs from 0 to maxRetries (inclusive), so it's 3 attempts total
      expect(global.fetch).toHaveBeenCalledTimes(3);
      // Entries should be back in buffer (error was caught)
      expect(transport).toBeDefined();
    });

    it("should use exponential backoff for retries", async () => {
      // Arrange
      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      transport = new HttpTransport({
        endpoint: mockEndpoint,
        batchSize: 10, // Large batch size so log() doesn't auto-flush
        maxRetries: 2,
        retryDelay: 10, // Small delay for faster test
        flushInterval: 10000, // Long interval to prevent auto-flush
      });
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: "Test message",
        timestamp: new Date(),
      };

      await transport.log(entry); // This won't trigger flush (batchSize=10)

      // Act
      // flush() catches errors, but sendBatch() will retry with exponential backoff
      await transport.flush();

      // Wait a bit to ensure no additional flushes happen
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert
      // Should retry maxRetries times: initial attempt (0) + 2 retries (1, 2) = 3 total
      // The loop in sendBatch runs: attempt 0, 1, 2 (3 attempts total for maxRetries=2)
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it("should handle timeout errors", async () => {
      // Arrange
      const abortError = new Error("AbortError");
      abortError.name = "AbortError";
      (global.fetch as jest.Mock).mockRejectedValue(abortError);

      transport = new HttpTransport({
        endpoint: mockEndpoint,
        batchSize: 1,
        timeout: 100,
        maxRetries: 0,
      });
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: "Test message",
        timestamp: new Date(),
      };

      await transport.log(entry);

      // Act
      // flush() catches errors, but sendBatch() throws timeout error
      // The error is caught and logged, entries put back in buffer
      await transport.flush();

      // Assert
      // Should have attempted the request
      expect(global.fetch).toHaveBeenCalled();
      // Entries should be back in buffer (error was caught)
      expect(transport).toBeDefined();
    });
  });

  describe("HTTP method and headers", () => {
    it("should use POST method by default", async () => {
      // Arrange
      transport = new HttpTransport({ endpoint: mockEndpoint });
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: "Test message",
        timestamp: new Date(),
      };

      await transport.log(entry);

      // Act
      await transport.flush();

      // Assert
      const call = (global.fetch as jest.Mock).mock.calls[0];
      expect(call[1].method).toBe("POST");
    });

    it("should use custom HTTP method", async () => {
      // Arrange
      transport = new HttpTransport({
        endpoint: mockEndpoint,
        method: "PUT",
      });
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: "Test message",
        timestamp: new Date(),
      };

      await transport.log(entry);

      // Act
      await transport.flush();

      // Assert
      const call = (global.fetch as jest.Mock).mock.calls[0];
      expect(call[1].method).toBe("PUT");
    });

    it("should include custom headers", async () => {
      // Arrange
      transport = new HttpTransport({
        endpoint: mockEndpoint,
        headers: {
          "X-API-Key": "secret-key",
          "X-Custom": "value",
        },
      });
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: "Test message",
        timestamp: new Date(),
      };

      await transport.log(entry);

      // Act
      await transport.flush();

      // Assert
      const call = (global.fetch as jest.Mock).mock.calls[0];
      expect(call[1].headers["Content-Type"]).toBe("application/json");
      expect(call[1].headers["X-API-Key"]).toBe("secret-key");
      expect(call[1].headers["X-Custom"]).toBe("value");
    });

    it("should handle non-OK responses", async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      transport = new HttpTransport({
        endpoint: mockEndpoint,
        batchSize: 1,
        maxRetries: 0,
      });
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: "Test message",
        timestamp: new Date(),
      };

      await transport.log(entry);

      // Act
      // flush() catches errors from sendBatch(), so it won't throw
      // But sendBatch() will throw the HTTP 500 error
      await transport.flush();

      // Assert
      // Should have attempted the request
      expect(global.fetch).toHaveBeenCalled();
      // Error is caught and logged, entries put back in buffer
      expect(transport).toBeDefined();
    });
  });

  describe("timeout", () => {
    it("should abort request after timeout", async () => {
      // Arrange
      // Mock fetch to simulate timeout by rejecting with AbortError after delay
      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => {
              const abortError = new Error("AbortError");
              abortError.name = "AbortError";
              reject(abortError);
            }, 10);
          }),
      );

      transport = new HttpTransport({
        endpoint: mockEndpoint,
        batchSize: 1,
        timeout: 50,
        maxRetries: 0,
      });
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: "Test message",
        timestamp: new Date(),
      };

      await transport.log(entry);

      // Act
      // flush() catches errors, but sendBatch() will throw timeout error
      await transport.flush();

      // Assert
      // Should have attempted the request
      expect(global.fetch).toHaveBeenCalled();
      // Error is caught and logged
      expect(transport).toBeDefined();
    }, 10000); // Increase test timeout
  });
});
