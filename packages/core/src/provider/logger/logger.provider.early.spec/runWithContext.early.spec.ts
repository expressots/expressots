// Unit tests for: Logger.runWithContext() method

import { Logger } from "../logger.provider";
import { LogLevel } from "../utils/log-levels";
import { ContextManager } from "../logger.context";

describe("Logger.runWithContext()", () => {
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

  it("should run synchronous function with context", () => {
    // Arrange
    const context = { requestId: "req-123" };
    let capturedContext: any = null;

    // Act
    logger.runWithContext(context, () => {
      capturedContext = ContextManager.getCurrentContext();
      logger.info("Test message");
    });

    // Assert
    expect(capturedContext).toEqual(
      expect.objectContaining({
        requestId: "req-123",
      }),
    );
    expect(mockTransport.log).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          requestId: "req-123",
        }),
      }),
    );
  });

  it("should run async function with context", async () => {
    // Arrange
    const context = { requestId: "req-456" };
    let capturedContext: any = null;

    // Act
    await logger.runWithContext(context, async () => {
      await Promise.resolve();
      capturedContext = ContextManager.getCurrentContext();
      logger.info("Test message");
    });

    // Assert
    expect(capturedContext).toEqual(
      expect.objectContaining({
        requestId: "req-456",
      }),
    );
  });

  it("should return result from function", () => {
    // Arrange
    const context = { requestId: "req-789" };

    // Act
    const result = logger.runWithContext(context, () => {
      return "test-result";
    });

    // Assert
    expect(result).toBe("test-result");
  });

  it("should return promise result from async function", async () => {
    // Arrange
    const context = { requestId: "req-999" };

    // Act
    const result = await logger.runWithContext(context, async () => {
      return Promise.resolve("async-result");
    });

    // Assert
    expect(result).toBe("async-result");
  });

  it("should merge with existing context", () => {
    // Arrange
    const contextLogger = logger.withContext({ className: "TestClass" });
    const context = { requestId: "req-111" };

    // Act
    contextLogger.runWithContext(context, () => {
      const capturedContext = ContextManager.getCurrentContext();
      expect(capturedContext).toEqual(
        expect.objectContaining({
          className: "TestClass",
          requestId: "req-111",
        }),
      );
    });
  });
});
