import "reflect-metadata";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { Environments } from "../src/environment";
import * as log from "../src/logger";

vi.mock("fs");
vi.mock("path");
vi.mock("../src/logger", () => ({
  log: {
    Info: vi.fn(),
  },
}));

describe("EnvValidatorProvider", () => {
  describe("Get", () => {
    it("returns the value of the environment variable with the given key", () => {
      const expectedValue = "test value";
      process.env.TEST_KEY = expectedValue;
      const actualValue = Environments.get("TEST_KEY");
      expect(actualValue).toEqual(expectedValue);
    });

    it("returns the default value if the environment variable is not defined", () => {
      const defaultValue = "default value";
      const actualValue = Environments.get("NON_EXISTENT_KEY", defaultValue);
      expect(actualValue).toEqual(defaultValue);
    });
  });

  describe("CheckAll", () => {
    let originalEnv: NodeJS.ProcessEnv;
    let logSpy: vi.SpyInstance;

    beforeEach(() => {
      originalEnv = process.env;
      process.env = {};
      logSpy = vi.spyOn(log.log, "Info").mockImplementation();
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
    });

    afterEach(() => {
      process.env = originalEnv;
      vi.clearAllMocks();
    });

    it("loads the .env file", () => {
      vi.spyOn(dotenv, "config").mockImplementation();
      Environments.checkAll();
      expect(dotenv.config).toHaveBeenCalled();
    });
  });
});
