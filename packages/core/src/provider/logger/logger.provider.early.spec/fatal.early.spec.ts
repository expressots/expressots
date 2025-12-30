// Unit tests for: Logger.fatal() method

import { Logger } from "../logger.provider";
import { LogLevel } from "../utils/log-levels";

describe("Logger.fatal()", () => {
  let logger: Logger;
  let mockTransport: any;

  beforeEach(() => {
    logger = new Logger();
    mockTransport = {
      name: "test-transport",
      enabled: true,
      level: LogLevel.FATAL,
      log: jest.fn().mockResolvedValue(undefined),
    };
    logger.configure({ transports: [mockTransport] });
  });

  it("should log fatal message", () => {
    // Arrange
    const message = "Fatal error occurred";

    // Act
    logger.fatal(message);

    // Assert
    expect(mockTransport.log).toHaveBeenCalledWith(
      expect.objectContaining({
        level: LogLevel.FATAL,
        message,
      }),
    );
  });

  it("should log fatal message with error", () => {
    // Arrange
    const message = "Fatal error occurred";
    const error = new Error("Something went wrong");

    // Act
    logger.fatal(message, error);

    // Assert
    expect(mockTransport.log).toHaveBeenCalledWith(
      expect.objectContaining({
        level: LogLevel.FATAL,
        message,
        error,
      }),
    );
  });

  it("should log fatal message with unknown error", () => {
    // Arrange
    const message = "Fatal error occurred";
    const error = "String error";

    // Act
    logger.fatal(message, error);

    // Assert
    expect(mockTransport.log).toHaveBeenCalledWith(
      expect.objectContaining({
        level: LogLevel.FATAL,
        message,
        error,
      }),
    );
  });
});


