// Unit tests for: Logger performance measurement methods

import { Logger } from "../logger.provider";
import { LogLevel } from "../utils/log-levels";

describe("Logger performance methods", () => {
  let logger: Logger;
  let mockTransport: any;

  beforeEach(() => {
    logger = new Logger();
    mockTransport = {
      name: "test-transport",
      enabled: true,
      level: LogLevel.DEBUG,
      log: jest.fn().mockResolvedValue(undefined),
    };
    logger.configure({ transports: [mockTransport] });
  });

  describe("startTimer()", () => {
    it("should create a timer", () => {
      // Act
      const timer = logger.startTimer("test-timer");

      // Assert
      expect(timer).toBeDefined();
      expect(timer).toHaveProperty("end");
      expect(timer).toHaveProperty("cancel");
    });

    it("should create timer with custom log level", () => {
      // Act
      const timer = logger.startTimer("test-timer", "info");

      // Assert
      expect(timer).toBeDefined();
    });
  });

  describe("metrics()", () => {
    it("should create metrics collector", () => {
      // Act
      const metrics = logger.metrics();

      // Assert
      expect(metrics).toBeDefined();
      expect(metrics).toHaveProperty("start");
      expect(metrics).toHaveProperty("end");
      expect(metrics).toHaveProperty("summary");
    });
  });

  describe("measure()", () => {
    it("should measure async function", async () => {
      // Arrange
      const fn = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "result";
      };

      // Act
      const { result, performance } = await logger.measure(fn, "test-measure");

      // Assert
      expect(result).toBe("result");
      expect(performance).toBeDefined();
      expect(performance).toHaveProperty("duration");
      expect(performance).toHaveProperty("memoryDelta");
    });

    it("should measure sync function", async () => {
      // Arrange
      const fn = () => "result";

      // Act
      const { result, performance } = await logger.measure(fn, "test-measure");

      // Assert
      expect(result).toBe("result");
      expect(performance).toBeDefined();
    });
  });

  describe("measureSync()", () => {
    it("should measure synchronous function", () => {
      // Arrange
      const fn = () => "result";

      // Act
      const { result, performance } = logger.measureSync(fn, "test-measure");

      // Assert
      expect(result).toBe("result");
      expect(performance).toBeDefined();
      expect(performance).toHaveProperty("duration");
      expect(performance).toHaveProperty("memoryDelta");
    });
  });
});
