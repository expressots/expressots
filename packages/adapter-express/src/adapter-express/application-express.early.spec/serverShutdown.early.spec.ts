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

jest.mock("fs");
jest.mock("process", () => ({
  ...jest.requireActual("process"),
  exit: jest.fn((code?: number) => {
    throw new Error(`Mocked process.exit called with code ${code}`);
  }),
}));

class MockLogger {
  error = jest.fn();
}

class MockConsole {
  messageServer = jest.fn();
}

describe("AppExpress.serverShutdown() serverShutdown method", () => {
  let appExpress: AppExpress;

  beforeEach(() => {
    appExpress = new AppExpress();
    appExpress["logger"] = new MockLogger() as any;
    appExpress["console"] = new MockConsole() as any;

    jest.spyOn(appExpress as any, "serverShutdown").mockImplementation(() => {
      console.log("Mocked serverShutdown called");
    });
  });

  describe("Happy Paths", () => {
    it("should call serverShutdown and exit the process", () => {
      // Act & Assert
      expect(() => appExpress["handleExit"]()).toThrow("Mocked process.exit called with code 0");
      expect((appExpress as any).serverShutdown).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle serverShutdown gracefully when no additional logic is present", () => {
      // Act & Assert
      expect(() => appExpress["handleExit"]()).toThrow("Mocked process.exit called with code 0");
      expect((appExpress as any).serverShutdown).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(0);
    });
  });
});
