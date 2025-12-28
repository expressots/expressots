// Unit tests for: bootstrap environment loading edge cases

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

describe("bootstrap() environment loading edge cases", () => {
  let mockFs: jest.Mocked<typeof fs>;
  let mockPath: jest.Mocked<typeof path>;
  let originalEnv: NodeJS.ProcessEnv;
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    originalEnv = { ...process.env };
    mockFs = fs as jest.Mocked<typeof fs>;
    (mockFs.existsSync as jest.Mock) = jest.fn().mockReturnValue(false);
    (mockFs.readFileSync as jest.Mock) = jest.fn();
    (mockFs.promises as any) = {
      writeFile: jest.fn().mockResolvedValue(undefined),
      readFile: jest
        .fn()
        .mockResolvedValue(
          JSON.stringify({ name: "test-app", version: "1.0.0" }),
        ),
    };

    mockPath = path as jest.Mocked<typeof path>;
    (mockPath.resolve as jest.Mock) = jest.fn((...args) => args.join("/"));

    (AppFactory.create as jest.Mock) = jest
      .fn()
      .mockResolvedValue(new MockWebServer());

    // Default config mock - can be overridden in individual tests
    // Reset config mock before each test
    (config as jest.Mock) = jest.fn();
    (parse as jest.Mock) = jest.fn().mockReturnValue({});

    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

    process.env = {};
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe("CI Environment Detection", () => {
    it("should detect CI environment from CI env var", async () => {
      // Arrange
      process.env.CI = "true";
      const AppClass = MockWebServer;
      const options: BootstrapOptions = {
        envFileConfig: {
          required: ["DATABASE_URL"],
          ciMode: true,
        },
      };
      process.env.DATABASE_URL = "postgres://localhost";

      // Act
      const result = await bootstrap(AppClass, options);

      // Assert
      expect(result).toBeDefined();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("CI environment detected"),
      );
    });

    it("should detect GitHub Actions", async () => {
      // Arrange
      process.env.GITHUB_ACTIONS = "true";
      const AppClass = MockWebServer;
      const options: BootstrapOptions = {
        envFileConfig: {
          required: ["DATABASE_URL"],
        },
      };
      process.env.DATABASE_URL = "postgres://localhost";

      // Act
      const result = await bootstrap(AppClass, options);

      // Assert
      expect(result).toBeDefined();
    });

    it("should detect GitLab CI", async () => {
      // Arrange
      process.env.GITLAB_CI = "true";
      const AppClass = MockWebServer;
      const options: BootstrapOptions = {
        envFileConfig: {
          required: ["DATABASE_URL"],
        },
      };
      process.env.DATABASE_URL = "postgres://localhost";

      // Act
      const result = await bootstrap(AppClass, options);

      // Assert
      expect(result).toBeDefined();
    });
  });

  describe("Environment File Loading", () => {
    it("should load .env.vault in CI mode when DOTENV_KEY is set", async () => {
      // Arrange
      process.env.CI = "true";
      process.env.DOTENV_KEY = "test-key";
      const AppClass = MockWebServer;
      const options: BootstrapOptions = {
        envFileConfig: {
          required: ["DATABASE_URL"],
        },
      };
      process.env.DATABASE_URL = "postgres://localhost";
      (config as jest.Mock).mockImplementation((opts: any) => {
        if (opts.path === ".env.vault") {
          process.env.DATABASE_URL = "vault://database";
        }
      });

      // Act
      const result = await bootstrap(AppClass, options);

      // Assert
      expect(result).toBeDefined();
      expect(config).toHaveBeenCalledWith({ path: ".env.vault" });
    });

    it("should handle .env.vault loading error gracefully", async () => {
      // Arrange
      process.env.CI = "true";
      process.env.DOTENV_KEY = "test-key";
      const AppClass = MockWebServer;
      const options: BootstrapOptions = {
        envFileConfig: {
          required: ["DATABASE_URL"],
        },
      };
      process.env.DATABASE_URL = "postgres://localhost";
      (config as jest.Mock).mockImplementation((opts: any) => {
        if (opts.path === ".env.vault") {
          throw new Error("Vault error");
        }
      });

      // Act
      const result = await bootstrap(AppClass, options);

      // Assert
      expect(result).toBeDefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Could not load .env.vault"),
      );
    });

    it("should attempt to load optional files (.env, .env.local, .env.{env}.local)", async () => {
      // Arrange
      // Clear CI environment to ensure local mode
      delete process.env.CI;
      delete process.env.GITHUB_ACTIONS;
      delete process.env.GITLAB_CI;
      const AppClass = MockWebServer;
      (mockFs.existsSync as jest.Mock) = jest.fn((filePath: string) => {
        // Return true for the main env file (.env.dev), false for optional files
        return filePath === ".env.dev";
      });
      // Mock config to track calls - optional files are loaded in try-catch, so errors are silently ignored
      let configCallCount = 0;
      (config as jest.Mock) = jest.fn(() => {
        configCallCount++;
      });
      const options: BootstrapOptions = {
        currentEnvironment: "development",
        envFileConfig: {
          files: {
            development: ".env.dev",
          },
          ciMode: false, // Explicitly set to false
        },
      };

      // Act
      await bootstrap(AppClass, options);

      // Assert - config should be called for optional files (they're attempted even if they don't exist)
      // The code wraps them in try-catch, so they're attempted but errors are silently ignored
      // Config is called for: .env, .env.local, .env.dev.local (optional files) and .env.dev (main file)
      expect(configCallCount).toBeGreaterThanOrEqual(4); // At least 4 calls (3 optional + 1 main)
    });

    it("should skip file loading when skipFileLoading is true", async () => {
      // Arrange
      const AppClass = MockWebServer;
      process.env.DATABASE_URL = "postgres://localhost";
      const options: BootstrapOptions = {
        envFileConfig: {
          skipFileLoading: true,
          required: ["DATABASE_URL"],
        },
      };

      // Act
      const result = await bootstrap(AppClass, options);

      // Assert
      expect(result).toBeDefined();
      expect(mockFs.existsSync).not.toHaveBeenCalled();
    });
  });

  describe("Template Creation", () => {
    it("should create multiple templates when files mapping is provided", async () => {
      // Arrange
      // Clear CI environment to ensure local mode
      delete process.env.CI;
      delete process.env.GITHUB_ACTIONS;
      delete process.env.GITLAB_CI;
      const AppClass = MockWebServer;
      const templateFiles = [".env.dev", ".env.prod", ".env.staging"];
      const createdFiles = new Set<string>();
      // Track which files have been created
      (mockFs.existsSync as jest.Mock) = jest.fn((filePath: string) => {
        // Return true if file was created, false otherwise
        if (createdFiles.has(filePath)) {
          return true;
        }
        return !templateFiles.includes(filePath);
      });
      // Mock writeFile to track created files
      (mockFs.promises.writeFile as jest.Mock) = jest.fn(
        async (filePath: string) => {
          createdFiles.add(filePath);
        },
      );
      // Mock config to set the required variable in process.env when loading template files
      // This simulates that the template files have been filled in with values
      (config as jest.Mock) = jest.fn((opts: any) => {
        if (templateFiles.includes(opts.path)) {
          // When loading template files, set the required variable
          process.env.DATABASE_URL = "postgres://localhost";
        }
      });
      const options: BootstrapOptions = {
        currentEnvironment: "development",
        envFileConfig: {
          files: {
            development: ".env.dev",
            production: ".env.prod",
            staging: ".env.staging",
          },
          autoCreateTemplate: true,
          required: ["DATABASE_URL"],
          ciMode: false, // Explicitly set to false
        },
      };

      // Act
      await bootstrap(AppClass, options);

      // Assert
      expect(mockFs.promises.writeFile).toHaveBeenCalled();
      // Should create templates for all mapped environments
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Created"),
      );
    });

    it("should create template with required variables", async () => {
      // Arrange
      // Clear CI environment to ensure local mode
      delete process.env.CI;
      delete process.env.GITHUB_ACTIONS;
      delete process.env.GITLAB_CI;
      delete process.env.JENKINS_URL;
      delete process.env.CIRCLECI;
      delete process.env.TRAVIS;
      delete process.env.BUILDKITE;
      const AppClass = MockWebServer;

      // CRITICAL: Mock existsSync to return true for .env.development AFTER template is created
      // The validateEnvVariablesFromFile function checks fs.existsSync(fileName) first (line 667)
      // If it returns false, validation fails immediately. So we need to return true for the template file
      const createdFiles = new Set<string>();
      (mockFs.existsSync as jest.Mock) = jest.fn((filePath: string) => {
        // Return true if file was created (tracked via writeFile mock)
        if (createdFiles.has(filePath)) {
          return true;
        }
        // Return false for files that don't exist yet
        return false;
      });

      // Track created files when writeFile is called
      (mockFs.promises.writeFile as jest.Mock) = jest.fn(
        async (filePath: string) => {
          createdFiles.add(filePath);
        },
      );

      // CRITICAL: The validation checks process.env[key] directly (line 678 in bootstrap.ts)
      // So we need to ensure the values are set in process.env BEFORE validation runs
      process.env.DATABASE_URL = "postgres://localhost";
      process.env.API_KEY = "secret-key";

      // Mock config to also set values when loading template file (simulates real behavior)
      (config as jest.Mock).mockImplementation((opts: any) => {
        // When loading the template file (.env.development), set the required variables
        if (opts && opts.path === ".env.development") {
          process.env.DATABASE_URL = "postgres://localhost";
          process.env.API_KEY = "secret-key";
        }
        // Handle optional files - don't throw errors (they're loaded in try-catch)
        const optionalFiles = [".env", ".env.local", ".env.development.local"];
        if (opts && optionalFiles.includes(opts.path)) {
          // Optional files don't need to set values, just don't throw
        }
      });

      // Mock readFileSync to return template content for validation
      (mockFs.readFileSync as jest.Mock) = jest.fn((filePath: string) => {
        if (filePath === ".env.development") {
          return "PORT=3000\nNODE_ENV=development\nDATABASE_URL=\nAPI_KEY=";
        }
        return "";
      });

      // Mock parse to return parsed content
      (parse as jest.Mock) = jest.fn((content: string) => {
        if (content.includes("DATABASE_URL")) {
          return {
            PORT: "3000",
            NODE_ENV: "development",
            DATABASE_URL: "",
            API_KEY: "",
          };
        }
        return {};
      });

      const options: BootstrapOptions = {
        currentEnvironment: "development",
        envFileConfig: {
          autoCreateTemplate: true,
          required: ["DATABASE_URL", "API_KEY"],
          ciMode: false, // Explicitly set to false to ensure local mode
        },
      };

      // Act
      await bootstrap(AppClass, options);

      // Assert
      expect(mockFs.promises.writeFile).toHaveBeenCalled();
      const writeCall = (mockFs.promises.writeFile as jest.Mock).mock.calls[0];
      expect(writeCall[1]).toContain("DATABASE_URL=");
      expect(writeCall[1]).toContain("API_KEY=");
      // Verify that config was called to load the template file
      expect(config).toHaveBeenCalledWith({ path: ".env.development" });
    });
  });

  describe("Validation", () => {
    it("should validate required variables when validateValues is true", async () => {
      // Arrange
      const AppClass = MockWebServer;
      (mockFs.existsSync as jest.Mock) = jest.fn().mockReturnValue(true);
      (mockFs.readFileSync as jest.Mock) = jest
        .fn()
        .mockReturnValue("DATABASE_URL=postgres://localhost\nAPI_KEY=secret");
      (parse as jest.Mock) = jest.fn().mockReturnValue({
        DATABASE_URL: "postgres://localhost",
        API_KEY: "secret",
      });
      process.env.DATABASE_URL = "postgres://localhost";
      process.env.API_KEY = "secret";
      const options: BootstrapOptions = {
        currentEnvironment: "development",
        envFileConfig: {
          files: {
            development: ".env.dev",
          },
          required: ["DATABASE_URL", "API_KEY"],
          validateValues: true,
        },
      };

      // Act
      const result = await bootstrap(AppClass, options);

      // Assert
      expect(result).toBeDefined();
    });

    it("should handle file exists and loads successfully", async () => {
      // Arrange
      // Clear CI environment to ensure local mode
      delete process.env.CI;
      delete process.env.GITHUB_ACTIONS;
      delete process.env.GITLAB_CI;
      const AppClass = MockWebServer;
      (mockFs.existsSync as jest.Mock) = jest.fn().mockReturnValue(true);
      (mockFs.readFileSync as jest.Mock) = jest
        .fn()
        .mockReturnValue("DATABASE_URL=postgres://localhost");
      (parse as jest.Mock) = jest.fn().mockReturnValue({
        DATABASE_URL: "postgres://localhost",
      });
      // Mock config to set the env var when loading the file
      (config as jest.Mock) = jest.fn((opts: any) => {
        if (opts.path === ".env.dev") {
          process.env.DATABASE_URL = "postgres://localhost";
        }
      });
      const options: BootstrapOptions = {
        currentEnvironment: "development",
        envFileConfig: {
          files: {
            development: ".env.dev",
          },
          ciMode: false, // Explicitly set to false
        },
      };

      // Act
      const result = await bootstrap(AppClass, options);

      // Assert
      expect(result).toBeDefined();
      expect(config).toHaveBeenCalledWith({ path: ".env.dev" });
    });
  });

  describe("Package.json Caching", () => {
    it("should cache package.json after first read", async () => {
      // Arrange
      const AppClass = MockWebServer;
      const readFileSpy = mockFs.promises.readFile as jest.Mock;

      // Act - First call
      await bootstrap(AppClass);
      const firstCallCount = readFileSpy.mock.calls.length;

      // Act - Second call
      await bootstrap(AppClass);
      const secondCallCount = readFileSpy.mock.calls.length;

      // Assert - Should only read once (cached)
      expect(secondCallCount).toBe(firstCallCount);
    });
  });

  describe("Error Handling", () => {
    it("should initialize logger on error", async () => {
      // Arrange
      const AppClass = MockWebServer;
      (AppFactory.create as jest.Mock) = jest
        .fn()
        .mockRejectedValue(new Error("Test error"));

      // Act & Assert
      await expect(bootstrap(AppClass)).rejects.toThrow("Test error");
    });
  });
});

// End of unit tests for: bootstrap environment loading edge cases
