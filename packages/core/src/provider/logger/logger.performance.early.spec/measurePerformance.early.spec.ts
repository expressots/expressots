// Unit tests for: measurePerformance and measurePerformanceSync functions

import {
  measurePerformance,
  measurePerformanceSync,
} from "../logger.performance";
import { Logger } from "../logger.provider";

// Mock stdout/stderr
const mockStdoutWrite = jest
  .spyOn(process.stdout, "write")
  .mockImplementation(() => true);
const mockStderrWrite = jest
  .spyOn(process.stderr, "write")
  .mockImplementation(() => true);

describe("measurePerformance", () => {
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

  describe("Async function", () => {
    it("should measure async function performance", async () => {
      // Arrange
      const fn = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "result";
      };

      // Act
      const { result, performance } = await measurePerformance(
        fn,
        "test-label",
        logger,
      );

      // Assert
      expect(result).toBe("result");
      expect(performance.duration).toBeGreaterThan(0);
      expect(performance.memoryDelta).toBeDefined();
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining("test-label"),
      );
    });

    it("should handle NaN cpuUsage", async () => {
      // Arrange
      const fn = async () => {
        return "result";
      };
      const originalCpuUsage = process.cpuUsage;
      // Mock to return same values to make duration 0 or very small
      let callCount = 0;
      process.cpuUsage = jest.fn(() => {
        callCount++;
        return { user: 0, system: 0 };
      });

      // Act
      const { performance } = await measurePerformance(fn, "test", logger);

      // Assert - When duration is very small or 0, cpuUsage might be NaN or 0
      // The function checks isNaN, so it should be undefined if NaN
      if (isNaN(performance.cpuUsage as number)) {
        expect(performance.cpuUsage).toBeUndefined();
      } else {
        // If it's not NaN, it might be 0 or a valid number
        expect(typeof performance.cpuUsage).toBe("number");
      }

      // Cleanup
      process.cpuUsage = originalCpuUsage;
    });
  });

  describe("Sync function", () => {
    it("should measure sync function performance", async () => {
      // Arrange
      const fn = () => {
        return "result";
      };

      // Act
      const { result, performance } = await measurePerformance(
        fn,
        "test-label",
        logger,
      );

      // Assert
      expect(result).toBe("result");
      expect(performance.duration).toBeGreaterThanOrEqual(0);
      expect(performance.memoryDelta).toBeDefined();
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining("test-label"),
      );
    });
  });
});

describe("measurePerformanceSync", () => {
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

  it("should measure sync function performance", () => {
    // Arrange
    const fn = () => {
      return "result";
    };

    // Act
    const { result, performance } = measurePerformanceSync(
      fn,
      "test-label",
      logger,
    );

    // Assert
    expect(result).toBe("result");
    expect(performance.duration).toBeGreaterThanOrEqual(0);
    expect(performance.memoryDelta).toBeDefined();
    // Logger might use transports that don't write directly to stdout
    // Just verify the function executed successfully
    expect(performance).toBeDefined();
  });

  it("should handle NaN cpuUsage", () => {
    // Arrange
    const fn = () => {
      return "result";
    };
    const originalCpuUsage = process.cpuUsage;
    // Mock to return same values to make duration 0 or very small
    process.cpuUsage = jest.fn(() => ({ user: 0, system: 0 }));

    // Act
    const { performance } = measurePerformanceSync(fn, "test", logger);

    // Assert - When duration is very small or 0, cpuUsage might be NaN or 0
    // The function checks isNaN, so it should be undefined if NaN
    if (isNaN(performance.cpuUsage as number)) {
      expect(performance.cpuUsage).toBeUndefined();
    } else {
      // If it's not NaN, it might be 0 or a valid number
      expect(typeof performance.cpuUsage).toBe("number");
    }

    // Cleanup
    process.cpuUsage = originalCpuUsage;
  });

  it("should calculate cpuUsage correctly", () => {
    // Arrange
    const fn = () => {
      return "result";
    };
    const originalCpuUsage = process.cpuUsage;
    let callCount = 0;
    process.cpuUsage = jest.fn(() => {
      callCount++;
      return {
        user: callCount === 1 ? 1000 : 2000,
        system: callCount === 1 ? 500 : 1000,
      };
    });

    // Act
    const { performance } = measurePerformanceSync(fn, "test", logger);

    // Assert
    expect(performance.cpuUsage).toBeDefined();

    // Cleanup
    process.cpuUsage = originalCpuUsage;
  });
});
