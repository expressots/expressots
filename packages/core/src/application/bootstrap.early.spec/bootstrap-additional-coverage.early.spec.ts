// Unit tests for: bootstrap additional coverage

import { IWebServer } from "@expressots/shared";
import fs from "fs";
import path from "path";
import { config, parse } from "@expressots/shared";
import { AppFactory } from "../application-factory";
import { bootstrap, BootstrapOptions } from "../bootstrap";

jest.mock("fs");
jest.mock("path");
jest.mock("@expressots/shared", () => {
  const actual = jest.requireActual("@expressots/shared");
  return {
    ...actual,
    config: jest.fn(),
    parse: jest.fn(),
  };
});
jest.mock("../application-factory");

class MockWebServer implements IWebServer {
  public environment?: string;
  public listenPort?: number | string;
  private mockServer: any;

  constructor() {
    this.mockServer = {
      getHttpServer: jest.fn().mockResolvedValue({}),
    };
  }

  getHttpServer(): Promise<any> {
    return Promise.resolve({});
  }

  listen(port: number | string): Promise<any> {
    this.listenPort = port;
    return Promise.resolve(this.mockServer);
  }

  initEnvironment(): Promise<void> {
    return Promise.resolve();
  }

  setEngine(): Promise<void> {
    return Promise.resolve();
  }
}

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;

describe("bootstrap additional coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.NODE_ENV;
    delete process.env.CI;
    delete process.env.GITHUB_ACTIONS;
    delete process.env.GITLAB_CI;
    delete process.env.PORT;
    delete process.env._EXPRESSOTS_ENV_LOADED;
    (AppFactory.create as jest.Mock).mockResolvedValue(new MockWebServer());
    (mockFs.existsSync as jest.Mock) = jest.fn().mockReturnValue(false);
    (mockFs.readFileSync as jest.Mock) = jest.fn().mockReturnValue("{}");
    (mockFs.writeFileSync as jest.Mock) = jest.fn();
    (mockFs.promises as any) = {
      writeFile: jest.fn().mockResolvedValue(undefined),
      readFile: jest
        .fn()
        .mockResolvedValue(
          JSON.stringify({ name: "test-app", version: "1.0.0" }),
        ),
    };
    (mockPath.resolve as jest.Mock) = jest.fn((...args) => args.join("/"));
  });

  describe("validateEnvVariablesFromProcessEnv", () => {
    it("should detect empty string values", async () => {
      // Arrange
      process.env.TEST_VAR = "   "; // Whitespace only
      const options: BootstrapOptions = {
        envFileConfig: {
          required: ["TEST_VAR"],
          validateValues: true,
        },
      };

      // Act & Assert
      await expect(bootstrap(MockWebServer, options)).rejects.toThrow();
    });
  });

  describe("validateEnvVariablesFromFile", () => {
    it("should return missing when file doesn't exist and required is undefined", async () => {
      // Arrange
      (mockFs.existsSync as jest.Mock) = jest.fn((filePath: fs.PathLike) => {
        return String(filePath) === "package.json";
      });
      (parse as jest.Mock).mockReturnValue({ VAR1: "", VAR2: "" });

      const options: BootstrapOptions = {
        envFileConfig: {
          validateValues: true,
          // No required array - should validate all variables
        },
      };

      // Act & Assert
      await expect(bootstrap(MockWebServer, options)).rejects.toThrow();
    });

    it("should detect empty string values in file", async () => {
      // Arrange
      (mockFs.existsSync as jest.Mock) = jest.fn((filePath: fs.PathLike) => {
        const pathStr = String(filePath);
        return pathStr === ".env.development" || pathStr === "package.json";
      });
      (parse as jest.Mock).mockReturnValue({ TEST_VAR: "   " });
      (config as jest.Mock).mockImplementation(() => {
        process.env.TEST_VAR = "   "; // Set empty value
      });

      const options: BootstrapOptions = {
        envFileConfig: {
          validateValues: true,
        },
      };

      // Act & Assert
      await expect(bootstrap(MockWebServer, options)).rejects.toThrow();
    });

    it("should validate all variables when required is empty", async () => {
      // Arrange
      (mockFs.existsSync as jest.Mock) = jest.fn((filePath: fs.PathLike) => {
        const pathStr = String(filePath);
        return pathStr === ".env.development" || pathStr === "package.json";
      });
      (parse as jest.Mock).mockReturnValue({
        VAR1: "value1",
        VAR2: "", // Empty value
      });
      (config as jest.Mock).mockImplementation(() => {
        process.env.VAR1 = "value1";
        process.env.VAR2 = ""; // Empty value
      });

      const options: BootstrapOptions = {
        envFileConfig: {
          validateValues: true,
          // No required array - should validate all
        },
      };

      // Act & Assert
      await expect(bootstrap(MockWebServer, options)).rejects.toThrow();
    });

    it("should handle parse errors", async () => {
      // Arrange
      (mockFs.existsSync as jest.Mock) = jest.fn((filePath: fs.PathLike) => {
        const pathStr = String(filePath);
        return pathStr === ".env.development" || pathStr === "package.json";
      });
      // Mock readFileSync to return content that will cause parse to fail
      (mockFs.readFileSync as jest.Mock) = jest.fn((filePath: fs.PathLike) => {
        const pathStr = String(filePath);
        if (pathStr === ".env.development") {
          return "invalid env file content";
        }
        return JSON.stringify({ name: "test-app", version: "1.0.0" });
      });
      // Mock parse to throw error when called with file content
      (parse as jest.Mock).mockImplementation((content: string) => {
        if (content === "invalid env file content") {
          throw new Error("Parse error");
        }
        return {};
      });
      (config as jest.Mock).mockImplementation(() => {
        // config doesn't throw, it just loads
      });

      const options: BootstrapOptions = {
        envFileConfig: {
          validateValues: true,
        },
      };

      // Act & Assert
      await expect(bootstrap(MockWebServer, options)).rejects.toThrow(
        "Failed to parse",
      );
    });
  });

  describe("CI environment validation", () => {
    it("should throw CIEnvValidationError when validation fails in CI", async () => {
      // Arrange
      process.env.CI = "true";
      process.env.NODE_ENV = "production";
      (mockFs.existsSync as jest.Mock) = jest.fn().mockReturnValue(true);
      (parse as jest.Mock).mockReturnValue({});

      const options: BootstrapOptions = {
        envFileConfig: {
          required: ["MISSING_VAR"],
          validateValues: true,
        },
      };

      // Act & Assert
      await expect(bootstrap(MockWebServer, options)).rejects.toThrow();
    });
  });

  describe("Multiple missing files error", () => {
    it("should throw error with multiple missing files", async () => {
      // Arrange
      (mockFs.existsSync as jest.Mock) = jest.fn((filePath: fs.PathLike) => {
        return String(filePath) === "package.json";
      });

      const options: BootstrapOptions = {
        envFileConfig: {
          files: {
            development: ".env.dev",
            production: ".env.prod",
            staging: ".env.staging",
          },
          validateFile: true,
          autoCreateTemplate: false,
        },
      };

      // Act & Assert
      await expect(bootstrap(MockWebServer, options)).rejects.toThrow(
        "Missing required environment files",
      );
    });
  });

  describe("EnvValidationError", () => {
    it("should throw EnvValidationError when validation fails", async () => {
      // Arrange
      (mockFs.existsSync as jest.Mock) = jest.fn((filePath: fs.PathLike) => {
        const pathStr = String(filePath);
        return pathStr === ".env.development" || pathStr === "package.json";
      });
      (parse as jest.Mock).mockReturnValue({ REQUIRED_VAR: "" });
      (config as jest.Mock).mockImplementation(() => {
        process.env.REQUIRED_VAR = "";
      });

      const options: BootstrapOptions = {
        envFileConfig: {
          required: ["REQUIRED_VAR"],
          validateValues: true,
        },
      };

      // Act & Assert
      await expect(bootstrap(MockWebServer, options)).rejects.toThrow();
    });
  });

  describe("readPackageJson error handling", () => {
    it("should handle package.json parse errors", async () => {
      // Arrange
      (mockFs.existsSync as jest.Mock) = jest.fn((filePath: fs.PathLike) => {
        return String(filePath) === "package.json";
      });
      (mockFs.readFileSync as jest.Mock) = jest
        .fn()
        .mockReturnValue("invalid json");

      const options: BootstrapOptions = {};

      // Act - Should not throw
      await bootstrap(MockWebServer, options);

      // Assert - Should continue despite parse error
      expect(AppFactory.create).toHaveBeenCalled();
    });
  });

  describe("Template creation logging", () => {
    it("should log single template creation", async () => {
      // Arrange
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
      (mockFs.existsSync as jest.Mock) = jest.fn((filePath: fs.PathLike) => {
        return String(filePath) === "package.json";
      });
      (mockFs.writeFileSync as jest.Mock) = jest.fn();

      const options: BootstrapOptions = {
        envFileConfig: {
          autoCreateTemplate: true,
        },
      };

      // Act
      await bootstrap(MockWebServer, options);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Created"),
      );

      consoleLogSpy.mockRestore();
    });
  });
});
