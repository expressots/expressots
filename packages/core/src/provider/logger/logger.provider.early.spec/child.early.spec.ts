// Unit tests for: Logger.child() method

import { Logger } from "../logger.provider";
import { LogLevel } from "../utils/log-levels";

describe("Logger.child()", () => {
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

  it("should create child logger with context", () => {
    // Arrange
    logger.withContext("ParentContext");

    // Act
    const childLogger = logger.child("ChildContext");

    // Assert
    expect(childLogger).toBeInstanceOf(Logger);
    expect((childLogger as any).currentContext).toBe("ChildContext");
  });

  it("should inherit config from parent", () => {
    // Arrange
    logger.configure({ level: "WARN" });

    // Act
    const childLogger = logger.child("ChildContext");

    // Assert
    expect(childLogger.getConfig().level).toBe(LogLevel.WARN);
  });

  it("should inherit context object from parent", () => {
    // Arrange
    const parentLogger = logger.withContext({
      className: "ParentClass",
      methodName: "parentMethod",
    });

    // Act
    const childLogger = parentLogger.child("ChildContext");

    // Assert
    expect((childLogger as any).contextObject).toEqual({
      className: "ParentClass",
      methodName: "parentMethod",
      label: "ChildContext",
    });
  });

  it("should inherit autoDetectContext setting", () => {
    // Arrange
    logger.noAutoContext();

    // Act
    const childLogger = logger.child("ChildContext");

    // Assert
    expect((childLogger as any).autoDetectContext).toBe(false);
  });

  it("should log with child context", () => {
    // Arrange
    const childLogger = logger.child("ChildContext");

    // Act
    childLogger.info("Test message");

    // Assert
    expect(mockTransport.log).toHaveBeenCalledWith(
      expect.objectContaining({
        context: "ChildContext",
      }),
    );
  });
});
