// Unit tests for: serverShutdown

import process from "process";
import { AppExpress } from "../application-express";

jest.mock("../render/engine", () => {
  const actual = jest.requireActual("../render/engine");
  return {
    ...actual,
    setEngineEjs: jest.fn(),
    setEngineHandlebars: jest.fn(),
    setEnginePug: jest.fn(),
  };
});

class MockLogger {
  error = jest.fn();
}

class MockConsole {
  messageServer = jest.fn();
}

describe("AppExpress.serverShutdown() method", () => {
  let appExpress: AppExpress;
  let processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    appExpress = new AppExpress() as any; // Cast to 'any' to access private methods
    appExpress["logger"] = new MockLogger() as any;
    appExpress["console"] = new MockConsole() as any;

    // Mock serverShutdown method
    jest.spyOn(appExpress as any, "serverShutdown").mockImplementation(() => {
      console.log("Mocked serverShutdown called");
    });

    // Spy on process.exit
    processExitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation((code?: string | number | null | undefined) => {
        throw new Error(`Mocked process.exit called with code ${code}`);
      });
  });

  afterEach(() => {
    // Restore the original process.exit after each test
    processExitSpy.mockRestore();
  });

  describe("Happy Paths", () => {
    it("should call serverShutdown and exit the process", async () => {
      // Act & Assert
      await expect(appExpress["handleExit"]()).rejects.toThrow(
        "Mocked process.exit called with code 0",
      );
      expect(appExpress["serverShutdown"]).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle serverShutdown gracefully when no additional logic is present", async () => {
      // Act & Assert
      await expect(appExpress["handleExit"]()).rejects.toThrow(
        "Mocked process.exit called with code 0",
      );
      expect(appExpress["serverShutdown"]).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(0);
    });
  });
});
