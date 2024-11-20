// Unit tests for: initEnvironment

import * as Shared from "../../../node_modules/@expressots/shared";
import { AppExpress } from "../application-express";
import fs from "fs";
import process from "process";

jest.mock("fs");
jest.mock("process", () => ({
  ...jest.requireActual("process"),
  exit: jest.fn(),
}));
jest.mock("../../../node_modules/@expressots/shared", () => ({
  config: jest.fn(),
}));

class MockLogger {
  error = jest.fn();
}

describe("AppExpress.initEnvironment() initEnvironment method", () => {
  let appExpress: AppExpress;

  beforeEach(() => {
    appExpress = new AppExpress() as any;
    appExpress["logger"] = new MockLogger() as any;
  });

  describe("Happy Path", () => {
    it("should load environment variables from the default .env file when no options are provided", () => {
      const mockEnvironment: string = "development";

      appExpress.initEnvironment(mockEnvironment as any);

      expect(Shared.config).toHaveBeenCalledWith({ path: ".env" });
    });

    it("should load environment variables from the specified file when options are provided", () => {
      const mockEnvironment: string = "production";
      const mockOptions = {
        env: {
          production: ".env.production",
        },
      };
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      appExpress.initEnvironment(mockEnvironment as any, mockOptions as any);

      expect(Shared.config).toHaveBeenCalledWith({ path: ".env.production" });
    });
  });

  describe("Edge Cases", () => {
    it("should exit the process if the environment configuration does not exist", () => {
      const mockEnvironment: string = "staging";
      const mockOptions = {
        env: {
          production: ".env.production",
        },
      };

      const mockError = jest.spyOn(appExpress["logger"], "error");

      appExpress.initEnvironment(mockEnvironment as any, mockOptions as any);

      expect(mockError).toHaveBeenCalledWith(
        "Environment configuration for [staging] does not exist.",
        "adapter-express",
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should exit the process if the environment file does not exist", () => {
      const mockEnvironment: string = "production";
      const mockOptions = {
        env: {
          production: ".env.production",
        },
      };
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const mockError = jest.spyOn(appExpress["logger"], "error");

      appExpress.initEnvironment(mockEnvironment as any, mockOptions as any);

      expect(mockError).toHaveBeenCalledWith(
        "Environment file [.env.production] does not exist.",
        "adapter-express",
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});

// End of unit tests for: initEnvironment
