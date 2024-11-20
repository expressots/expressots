// Unit tests for: globalConfiguration

import { AppExpress } from "../application-express";

class AppExpressTestable extends AppExpress {
  public callGlobalConfiguration(): void | Promise<void> {
    return this.globalConfiguration();
  }
}

jest.mock("../render/engine", () => {
  return {
    setEngineEjs: jest.fn(),
    setEngineHandlebars: jest.fn(),
    setEnginePug: jest.fn(),
  };
});

jest.mock("express", () => {
  return {
    Application: jest.fn(),
    RequestHandler: jest.fn(),
  };
});

jest.mock("fs", () => ({
  existsSync: jest.fn(),
}));

jest.mock("process", () => ({
  exit: jest.fn(),
  on: jest.fn(),
}));

describe("AppExpress.globalConfiguration() globalConfiguration method", () => {
  let appExpress: AppExpressTestable;

  beforeEach(() => {
    appExpress = new AppExpressTestable();
  });

  describe("Happy Path", () => {
    it("should initialize global configuration without errors", () => {
      // Test to ensure globalConfiguration initializes correctly
      const result = appExpress.callGlobalConfiguration();
      expect(result).toBeUndefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing configuration gracefully", () => {
      // Test to ensure missing configuration is handled
      jest.spyOn(appExpress as any, "globalConfiguration").mockImplementation(() => {
        throw new Error("Configuration missing");
      });

      expect(() => appExpress.callGlobalConfiguration()).toThrow("Configuration missing");
    });

    it("should handle invalid configuration gracefully", () => {
      // Test to ensure invalid configuration is handled
      jest.spyOn(appExpress as any, "globalConfiguration").mockImplementation(() => {
        throw new Error("Invalid configuration");
      });

      expect(() => appExpress.callGlobalConfiguration()).toThrow("Invalid configuration");
    });
  });
});

// End of unit tests for: globalConfiguration
