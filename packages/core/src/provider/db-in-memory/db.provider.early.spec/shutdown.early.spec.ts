// Unit tests for: InMemoryDBProvider.shutdown()

import { InMemoryDBProvider } from "../db.provider";

describe("InMemoryDBProvider.shutdown() shutdown method", () => {
  let provider: InMemoryDBProvider;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    provider = new InMemoryDBProvider();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe("Happy Path", () => {
    it("should shutdown database", async () => {
      // Arrange
      const shutdownSpy = jest.fn();
      jest
        .spyOn(provider.getDatabase(), "shutdown")
        .mockImplementation(shutdownSpy);

      // Act
      await provider.shutdown();

      // Assert
      expect(shutdownSpy).toHaveBeenCalled();
    });

    it("should log shutdown when logging is enabled", async () => {
      // Arrange
      provider = new InMemoryDBProvider({ logging: true });

      // Act
      await provider.shutdown("SIGTERM");

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "[InMemoryDB] Shutting down (signal: SIGTERM)",
      );
    });

    it("should log shutdown without signal", async () => {
      // Arrange
      provider = new InMemoryDBProvider({ logging: true });

      // Act
      await provider.shutdown();

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "[InMemoryDB] Shutting down (signal: undefined)",
      );
    });

    it("should not log when logging is disabled", async () => {
      // Arrange
      provider = new InMemoryDBProvider({ logging: false });

      // Act
      await provider.shutdown();

      // Assert
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });
});

