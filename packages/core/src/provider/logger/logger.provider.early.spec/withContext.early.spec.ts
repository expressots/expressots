// Unit tests for: Logger.withContext() method

import { Logger } from "../logger.provider";
import { LogLevel } from "../utils/log-levels";

describe("Logger.withContext()", () => {
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

  it("should set string context", () => {
    // Act
    const contextLogger = logger.withContext("TestContext");

    // Assert
    expect((contextLogger as any).currentContext).toBe("TestContext");
    expect((contextLogger as any).contextObject).toEqual({
      label: "TestContext",
    });
  });

  it("should set object context", () => {
    // Arrange
    const context = { className: "TestClass", methodName: "testMethod" };

    // Act
    const contextLogger = logger.withContext(context);

    // Assert
    expect((contextLogger as any).contextObject).toEqual(context);
    expect((contextLogger as any).currentContext).toBe("TestClass");
  });

  it("should merge context objects", () => {
    // Arrange
    const parentLogger = logger.withContext({ className: "ParentClass" });

    // Act
    const contextLogger = parentLogger.withContext({
      methodName: "testMethod",
    });

    // Assert
    expect((contextLogger as any).contextObject).toEqual({
      className: "ParentClass",
      methodName: "testMethod",
    });
  });

  it("should use label as context when className not present", () => {
    // Arrange
    const context = { label: "TestLabel", methodName: "testMethod" };

    // Act
    const contextLogger = logger.withContext(context);

    // Assert
    expect((contextLogger as any).currentContext).toBe("TestLabel");
  });

  it("should inherit config and transports", () => {
    // Arrange
    logger.configure({ level: "WARN" });

    // Act
    const contextLogger = logger.withContext("TestContext");

    // Assert
    expect(contextLogger.getConfig().level).toBe(LogLevel.WARN);
    expect((contextLogger as any).transports).toBe((logger as any).transports);
  });

  it("should log with context", () => {
    // Arrange
    const contextLogger = logger.withContext("TestContext");

    // Act
    contextLogger.info("Test message");

    // Assert
    expect(mockTransport.log).toHaveBeenCalledWith(
      expect.objectContaining({
        context: "TestContext",
      }),
    );
  });
});
