// Unit tests for: InMemoryDBProvider.bootstrap()

import { InMemoryDBProvider, InMemoryDBConfig } from "../db.provider";

describe("InMemoryDBProvider.bootstrap() bootstrap method", () => {
  let provider: InMemoryDBProvider;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe("Happy Path", () => {
    it("should initialize startTime on bootstrap", async () => {
      // Arrange
      provider = new InMemoryDBProvider();

      // Act
      await provider.bootstrap();

      // Assert
      expect((provider as any).startTime).toBeInstanceOf(Date);
    });

    it("should load persisted data if persist is configured", async () => {
      // Arrange
      const loadSpy = jest.fn().mockResolvedValue(undefined);
      provider = new InMemoryDBProvider({
        persist: {
          storage: "file",
          path: "./test-db.json",
        },
      });
      jest.spyOn(provider.getDatabase(), "load").mockImplementation(loadSpy);

      // Act
      await provider.bootstrap();

      // Assert
      expect(loadSpy).toHaveBeenCalled();
    });

    it("should not load persisted data if persist is not configured", async () => {
      // Arrange
      const loadSpy = jest.fn();
      provider = new InMemoryDBProvider();
      jest.spyOn(provider.getDatabase(), "load").mockImplementation(loadSpy);

      // Act
      await provider.bootstrap();

      // Assert
      expect(loadSpy).not.toHaveBeenCalled();
    });

    it("should log initialization when logging is enabled", async () => {
      // Arrange
      provider = new InMemoryDBProvider({ logging: true });

      // Act
      await provider.bootstrap();

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("[InMemoryDB] Provider initialized at"),
      );
    });

    it("should not log when logging is disabled", async () => {
      // Arrange
      provider = new InMemoryDBProvider({ logging: false });

      // Act
      await provider.bootstrap();

      // Assert
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });
});
