// Unit tests for: Logger log() method - flow data extraction

import { Logger } from "../logger.provider";
import { LogLevel } from "../utils/log-levels";

describe("Logger log() - flow data extraction", () => {
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

  it("should extract flow from data object", () => {
    // Arrange
    const flowData = { step: "test", duration: 100 };
    const data = { flow: flowData, other: "data" };

    // Act
    (logger as any).log(LogLevel.INFO, "Test message", { data });

    // Assert
    expect(mockTransport.log).toHaveBeenCalledWith(
      expect.objectContaining({
        flow: flowData,
        data: { other: "data" },
      }),
    );
  });

  it("should handle flow in options directly", () => {
    // Arrange
    const flowData = { step: "test", duration: 100 };

    // Act
    (logger as any).log(LogLevel.INFO, "Test message", { flow: flowData });

    // Assert
    expect(mockTransport.log).toHaveBeenCalledWith(
      expect.objectContaining({
        flow: flowData,
      }),
    );
  });

  it("should remove flow from data when extracted", () => {
    // Arrange
    const flowData = { step: "test" };
    const data = { flow: flowData };

    // Act
    (logger as any).log(LogLevel.INFO, "Test message", { data });

    // Assert
    expect(mockTransport.log).toHaveBeenCalledWith(
      expect.objectContaining({
        flow: flowData,
        data: undefined,
      }),
    );
  });

  it("should not extract flow from array data", () => {
    // Arrange
    const data = [{ flow: "test" }];

    // Act
    (logger as any).log(LogLevel.INFO, "Test message", { data });

    // Assert
    expect(mockTransport.log).toHaveBeenCalledWith(
      expect.objectContaining({
        data,
        flow: undefined,
      }),
    );
  });

  it("should not extract flow from null data", () => {
    // Arrange
    const data = null;

    // Act
    (logger as any).log(LogLevel.INFO, "Test message", { data });

    // Assert
    expect(mockTransport.log).toHaveBeenCalledWith(
      expect.objectContaining({
        data: null,
        flow: undefined,
      }),
    );
  });
});

