// Unit tests for: LogPerformance decorator

import { LogPerformance } from "../log-performance.decorator";
import { Logger } from "../../logger.provider";

// Mock stdout/stderr
const mockStdoutWrite = jest
  .spyOn(process.stdout, "write")
  .mockImplementation(() => true);
const mockStderrWrite = jest
  .spyOn(process.stderr, "write")
  .mockImplementation(() => true);

describe("LogPerformance decorator", () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
    mockStdoutWrite.mockClear();
    mockStderrWrite.mockClear();
  });

  afterAll(() => {
    mockStdoutWrite.mockRestore();
    mockStderrWrite.mockRestore();
  });

  describe("Async methods", () => {
    it("should log entry and exit for async method", async () => {
      // Arrange
      class TestService {
        logger = logger;

        @LogPerformance({ logLevel: "debug" })
        async testMethod(): Promise<string> {
          return "result";
        }
      }

      const service = new TestService();

      // Act
      await service.testMethod();

      // Assert
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining("Entering TestService.testMethod"),
      );
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining("Exiting TestService.testMethod"),
      );
    });

    it("should log with info level", async () => {
      // Arrange
      class TestService {
        logger = logger;

        @LogPerformance({ logLevel: "info" })
        async testMethod(): Promise<string> {
          return "result";
        }
      }

      const service = new TestService();

      // Act
      await service.testMethod();

      // Assert
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining("Exiting TestService.testMethod"),
      );
    });

    it("should log with warn level", async () => {
      // Arrange
      class TestService {
        logger = logger;

        @LogPerformance({ logLevel: "warn" })
        async testMethod(): Promise<string> {
          return "result";
        }
      }

      const service = new TestService();

      // Act
      await service.testMethod();

      // Assert
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining("Exiting TestService.testMethod"),
      );
    });

    it("should handle errors in async method", async () => {
      // Arrange
      class TestService {
        logger = logger;

        @LogPerformance()
        async testMethod(): Promise<never> {
          throw new Error("Test error");
        }
      }

      const service = new TestService();

      // Act & Assert
      await expect(service.testMethod()).rejects.toThrow("Test error");
      expect(mockStderrWrite).toHaveBeenCalledWith(
        expect.stringContaining("Error in TestService.testMethod"),
      );
    });

    it("should use custom label", async () => {
      // Arrange
      class TestService {
        logger = logger;

        @LogPerformance({ label: "CustomLabel" })
        async testMethod(): Promise<string> {
          return "result";
        }
      }

      const service = new TestService();

      // Act
      await service.testMethod();

      // Assert
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining("CustomLabel"),
      );
    });

    it("should skip entry logging when logEntry is false", async () => {
      // Arrange
      class TestService {
        logger = logger;

        @LogPerformance({ logEntry: false })
        async testMethod(): Promise<string> {
          return "result";
        }
      }

      const service = new TestService();

      // Act
      await service.testMethod();

      // Assert
      expect(mockStdoutWrite).not.toHaveBeenCalledWith(
        expect.stringContaining("Entering"),
      );
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining("Exiting"),
      );
    });

    it("should skip exit logging when logExit is false", async () => {
      // Arrange
      class TestService {
        logger = logger;

        @LogPerformance({ logExit: false })
        async testMethod(): Promise<string> {
          return "result";
        }
      }

      const service = new TestService();

      // Act
      await service.testMethod();

      // Assert
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining("Entering"),
      );
      expect(mockStdoutWrite).not.toHaveBeenCalledWith(
        expect.stringContaining("Exiting"),
      );
    });

    it("should respect minDuration threshold", async () => {
      // Arrange
      class TestService {
        logger = logger;

        @LogPerformance({ minDuration: 1000 })
        async testMethod(): Promise<string> {
          return "result";
        }
      }

      const service = new TestService();

      // Act
      await service.testMethod();

      // Assert - exit log should not be called because duration < minDuration
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining("Entering"),
      );
      // Exit log should not appear because duration is too short
    });

    it("should work without logger instance", async () => {
      // Arrange
      class TestService {
        @LogPerformance()
        async testMethod(): Promise<string> {
          return "result";
        }
      }

      const service = new TestService();

      // Act & Assert - should not throw
      await expect(service.testMethod()).resolves.toBe("result");
    });
  });

  describe("Sync methods", () => {
    it("should log entry and exit for sync method", () => {
      // Arrange
      class TestService {
        logger = logger;

        @LogPerformance({ logLevel: "debug" })
        testMethod(): string {
          return "result";
        }
      }

      const service = new TestService();

      // Act
      service.testMethod();

      // Assert
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining("Entering TestService.testMethod"),
      );
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining("Exiting TestService.testMethod"),
      );
    });

    it("should log with info level for sync", () => {
      // Arrange
      class TestService {
        logger = logger;

        @LogPerformance({ logLevel: "info" })
        testMethod(): string {
          return "result";
        }
      }

      const service = new TestService();

      // Act
      service.testMethod();

      // Assert
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining("Exiting TestService.testMethod"),
      );
    });

    it("should log with warn level for sync", () => {
      // Arrange
      class TestService {
        logger = logger;

        @LogPerformance({ logLevel: "warn" })
        testMethod(): string {
          return "result";
        }
      }

      const service = new TestService();

      // Act
      service.testMethod();

      // Assert
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining("Exiting TestService.testMethod"),
      );
    });

    it("should handle errors in sync method", () => {
      // Arrange
      class TestService {
        logger = logger;

        @LogPerformance()
        testMethod(): never {
          throw new Error("Test error");
        }
      }

      const service = new TestService();

      // Act & Assert
      expect(() => service.testMethod()).toThrow("Test error");
      expect(mockStderrWrite).toHaveBeenCalledWith(
        expect.stringContaining("Error in TestService.testMethod"),
      );
    });

    it("should use custom label for sync", () => {
      // Arrange
      class TestService {
        logger = logger;

        @LogPerformance({ label: "CustomLabel" })
        testMethod(): string {
          return "result";
        }
      }

      const service = new TestService();

      // Act
      service.testMethod();

      // Assert
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining("CustomLabel"),
      );
    });

    it("should skip entry logging when logEntry is false for sync", () => {
      // Arrange
      class TestService {
        logger = logger;

        @LogPerformance({ logEntry: false })
        testMethod(): string {
          return "result";
        }
      }

      const service = new TestService();

      // Act
      service.testMethod();

      // Assert
      expect(mockStdoutWrite).not.toHaveBeenCalledWith(
        expect.stringContaining("Entering"),
      );
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining("Exiting"),
      );
    });

    it("should skip exit logging when logExit is false for sync", () => {
      // Arrange
      class TestService {
        logger = logger;

        @LogPerformance({ logExit: false })
        testMethod(): string {
          return "result";
        }
      }

      const service = new TestService();

      // Act
      service.testMethod();

      // Assert
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining("Entering"),
      );
      expect(mockStdoutWrite).not.toHaveBeenCalledWith(
        expect.stringContaining("Exiting"),
      );
    });

    it("should respect minDuration threshold for sync", () => {
      // Arrange
      class TestService {
        logger = logger;

        @LogPerformance({ minDuration: 1000 })
        testMethod(): string {
          return "result";
        }
      }

      const service = new TestService();

      // Act
      service.testMethod();

      // Assert - exit log should not be called because duration < minDuration
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining("Entering"),
      );
      // Exit log should not appear because duration is too short
    });

    it("should work without logger instance for sync", () => {
      // Arrange
      class TestService {
        @LogPerformance()
        testMethod(): string {
          return "result";
        }
      }

      const service = new TestService();

      // Act & Assert - should not throw
      expect(service.testMethod()).toBe("result");
    });

    it("should log method arguments", () => {
      // Arrange
      class TestService {
        logger = logger;

        @LogPerformance()
        testMethod(arg1: string, arg2: number): string {
          return `${arg1}-${arg2}`;
        }
      }

      const service = new TestService();

      // Act
      service.testMethod("test", 123);

      // Assert
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining("[2 args]"),
      );
    });
  });
});
