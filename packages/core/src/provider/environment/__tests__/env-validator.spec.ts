import dotenv from "dotenv";
import fs from "fs";
import "reflect-metadata";
import { EnvValidatorProvider } from "../env-validator.provider";

vi.mock("fs");
vi.mock("path");
vi.mock("../src/provider/logger", () => ({
  log: {
    Info: vi.fn(),
  },
}));

const Environments = new EnvValidatorProvider();

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

    beforeEach(() => {
      originalEnv = process.env;
      process.env = {};
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
