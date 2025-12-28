// Unit tests for: Logger log() method - transport error handling

import { Logger } from "../logger.provider";
import { LogLevel } from "../utils/log-levels";

describe("Logger log() - transport error handling", () => {
  let logger: Logger;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new Logger();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("should handle synchronous transport errors", () => {
    // Arrange
    const mockTransport = {
      name: "failing-transport",
      enabled: true,
      level: LogLevel.DEBUG,
      log: jest.fn().mockImplementation(() => {
        throw new Error("Transport error");
      }),
    };
    logger.configure({ transports: [mockTransport] });

    // Act
    logger.info("Test message");

    // Assert
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[Logger] Transport failing-transport failed:",
      expect.any(Error),
    );
  });

  it("should handle asynchronous transport errors", async () => {
    // Arrange
    const mockTransport = {
      name: "failing-async-transport",
      enabled: true,
      level: LogLevel.DEBUG,
      log: jest.fn().mockRejectedValue(new Error("Async transport error")),
    };
    logger.configure({ transports: [mockTransport] });

    // Act
    logger.info("Test message");

    // Wait for promise rejection
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Assert
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[Logger] Transport failing-async-transport failed:",
      expect.any(Error),
    );
  });

  it("should continue logging to other transports when one fails", () => {
    // Arrange
    const failingTransport = {
      name: "failing-transport",
      enabled: true,
      level: LogLevel.DEBUG,
      log: jest.fn().mockImplementation(() => {
        throw new Error("Transport error");
      }),
    };
    const workingTransport = {
      name: "working-transport",
      enabled: true,
      level: LogLevel.DEBUG,
      log: jest.fn().mockResolvedValue(undefined),
    };
    logger.configure({ transports: [failingTransport, workingTransport] });

    // Act
    logger.info("Test message");

    // Assert
    expect(workingTransport.log).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});

