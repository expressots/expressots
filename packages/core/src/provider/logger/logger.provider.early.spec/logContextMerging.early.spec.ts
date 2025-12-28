// Unit tests for: Logger log() method - context merging

import { Logger } from "../logger.provider";
import { LogLevel } from "../utils/log-levels";
import { ContextManager } from "../logger.context";

describe("Logger log() - context merging", () => {
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

  it("should merge request context into data", () => {
    // Arrange
    logger.runWithContext({ requestId: "req-123", userId: "user-456" }, () => {
      // Act
      logger.info("Test message");

      // Assert
      expect(mockTransport.log).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            requestId: "req-123",
            userId: "user-456",
          }),
        }),
      );
    });
  });

  it("should merge context object into data", () => {
    // Arrange
    const contextLogger = logger.withContext({
      tenantId: "tenant-789",
      correlationId: "corr-111",
    });

    // Act
    contextLogger.info("Test message");

    // Assert
    expect(mockTransport.log).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "tenant-789",
          correlationId: "corr-111",
        }),
      }),
    );
  });

  it("should merge request context with explicit context", () => {
    // Arrange
    logger.withContext({ className: "TestClass" });
    logger.runWithContext({ requestId: "req-123" }, () => {
      // Act
      logger.info("Test message", "ExplicitContext");

      // Assert
      expect(mockTransport.log).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "ExplicitContext",
          data: expect.objectContaining({
            requestId: "req-123",
          }),
        }),
      );
    });
  });

  it("should use request context className when no explicit context", () => {
    // Arrange
    logger.runWithContext({ className: "RequestClass" }, () => {
      // Act
      logger.info("Test message");

      // Assert
      expect(mockTransport.log).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "RequestClass",
        }),
      );
    });
  });

  it("should merge all context sources", () => {
    // Arrange
    const contextLogger = logger.withContext({ tenantId: "tenant-1" });
    contextLogger.runWithContext(
      { requestId: "req-1", userId: "user-1" },
      () => {
        // Act
        contextLogger.info("Test message", "ExplicitContext");

        // Assert
        expect(mockTransport.log).toHaveBeenCalledWith(
          expect.objectContaining({
            context: "ExplicitContext",
            data: expect.objectContaining({
              requestId: "req-1",
              userId: "user-1",
              tenantId: "tenant-1",
            }),
          }),
        );
      },
    );
  });
});
