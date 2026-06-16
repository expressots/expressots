// Unit tests for: bootstrap

import { IWebServer, IWebServerPublic } from "@expressots/shared";
import { Server } from "http";
import fs from "fs";
import path from "path";
import { config } from "@expressots/shared";
import { AppFactory } from "../application-factory";
import { bootstrap, BootstrapOptions } from "../bootstrap";

// Mock dependencies
jest.mock("fs");
jest.mock("path");
jest.mock("@expressots/shared", () => {
  const actual = jest.requireActual("@expressots/shared");
  return {
    ...actual,
    config: jest.fn(),
  };
});
jest.mock("../application-factory");

class MockWebServer implements IWebServer {
  public environment?: string;
  public listenPort?: number | string;
  private mockServer: IWebServerPublic;

  constructor() {
    this.mockServer = {
      getHttpServer: jest.fn().mockResolvedValue({} as Server),
      getPort: jest.fn().mockResolvedValue(3000),
    } as IWebServerPublic;
  }

  getHttpServer(): Promise<Server> {
    return Promise.resolve({} as Server);
  }

  listen(port: number | string, appInfo?: any): Promise<IWebServerPublic> {
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

describe("bootstrap() bootstrap function", () => {
  let mockFs: jest.Mocked<typeof fs>;
  let mockPath: jest.Mocked<typeof path>;
  let originalEnv: NodeJS.ProcessEnv;
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Mock fs
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

    // Mock path
    mockPath = path as jest.Mocked<typeof path>;
    (mockPath.resolve as jest.Mock) = jest.fn((...args) => args.join("/"));

    // Mock AppFactory
    (AppFactory.create as jest.Mock) = jest
      .fn()
      .mockResolvedValue(new MockWebServer());

    // Mock config from @expressots/shared
    (config as jest.Mock) = jest.fn();

    // Spy on console
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

    // Clear process.env
    process.env = {};
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    jest.clearAllMocks();
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe("Happy Path", () => {
    it("should bootstrap application with minimal options", async () => {
      // Arrange
      const AppClass = MockWebServer;
      const mockWebServer = new MockWebServer();
      (AppFactory.create as jest.Mock) = jest
        .fn()
        .mockResolvedValue(mockWebServer);

      // Act
      const result = await bootstrap(AppClass);

      // Assert
      expect(result).toBeDefined();
      expect(mockWebServer.listenPort).toBe(3000); // Default port
      expect(AppFactory.create).toHaveBeenCalledWith(AppClass);
    });

    it("should bootstrap application with custom port", async () => {
      // Arrange
      const AppClass = MockWebServer;
      const mockWebServer = new MockWebServer();
      (AppFactory.create as jest.Mock) = jest
        .fn()
        .mockResolvedValue(mockWebServer);
      const options: BootstrapOptions = { port: 8080 };

      // Act
      const result = await bootstrap(AppClass, options);

      // Assert
      expect(result).toBeDefined();
      expect(mockWebServer.listenPort).toBe(8080);
    });

    it("should bootstrap application with custom app name and version", async () => {
      // Arrange
      const AppClass = MockWebServer;
      const options: BootstrapOptions = {
        appName: "My Custom App",
        appVersion: "2.0.0",
      };

      // Act
      const result = await bootstrap(AppClass, options);

      // Assert
      expect(result).toBeDefined();
      expect(AppFactory.create).toHaveBeenCalled();
    });

    it("should bootstrap application with custom environment", async () => {
      // Arrange
      const AppClass = MockWebServer;
      const options: BootstrapOptions = {
        currentEnvironment: "production",
      };

      // Act
      const result = await bootstrap(AppClass, options);

      // Assert
      expect(result).toBeDefined();
    });

    it("should use port from process.env.PORT", async () => {
      // Arrange
      process.env.PORT = "4000";
      const AppClass = MockWebServer;
      const mockWebServer = new MockWebServer();
      (AppFactory.create as jest.Mock) = jest
        .fn()
        .mockResolvedValue(mockWebServer);

      // Act
      const result = await bootstrap(AppClass);

      // Assert
      expect(result).toBeDefined();
      expect(mockWebServer.listenPort).toBe(4000);
    });

    it("should use NODE_ENV from process.env", async () => {
      // Arrange
      process.env.NODE_ENV = "production";
      const AppClass = MockWebServer;

      // Act
      const result = await bootstrap(AppClass);

      // Assert
      expect(result).toBeDefined();
    });

    it("should support port 0 for OS-assigned port", async () => {
      // Arrange
      const AppClass = MockWebServer;
      const options: BootstrapOptions = { port: 0 };

      // Act
      const result = await bootstrap(AppClass, options);

      // Assert
      expect(result).toBeDefined();
      // Port 0 should be passed through to listen()
    });
  });

  describe("Environment File Configuration", () => {
    it("should skip .env file loading when envFileConfig is not provided", async () => {
      // Arrange
      const AppClass = MockWebServer;

      // Act
      await bootstrap(AppClass);

      // Assert
      expect(config).not.toHaveBeenCalled();
    });

    it("should load .env file when envFileConfig is provided and file exists", async () => {
      // Arrange
      const AppClass = MockWebServer;
      (mockFs.existsSync as jest.Mock) = jest.fn().mockReturnValue(true);
      const options: BootstrapOptions = {
        envFileConfig: {
          files: {
            development: ".env.dev",
          },
        },
      };

      // Act
      await bootstrap(AppClass, options);

      // Assert
      expect(config).toHaveBeenCalled();
    });

    it("should auto-create template when autoCreateTemplate is true", async () => {
      // Arrange
      const AppClass = MockWebServer;
      (mockFs.existsSync as jest.Mock) = jest.fn().mockReturnValue(false);
      const options: BootstrapOptions = {
        currentEnvironment: "development",
        envFileConfig: {
          autoCreateTemplate: true,
        },
      };

      // Act
      await bootstrap(AppClass, options);

      // Assert
      expect(mockFs.promises.writeFile).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Created"),
      );
    });

    it("should validate required variables in CI mode", async () => {
      // Arrange
      process.env.CI = "true";
      process.env.DATABASE_URL = "postgres://localhost";
      const AppClass = MockWebServer;
      const options: BootstrapOptions = {
        envFileConfig: {
          required: ["DATABASE_URL"],
          ciMode: true,
        },
      };

      // Act
      const result = await bootstrap(AppClass, options);

      // Assert
      expect(result).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing package.json gracefully", async () => {
      // Arrange
      (mockFs.promises.readFile as jest.Mock) = jest
        .fn()
        .mockRejectedValue(new Error("File not found"));
      const AppClass = MockWebServer;
      const mockWebServer = new MockWebServer();
      (AppFactory.create as jest.Mock) = jest
        .fn()
        .mockResolvedValue(mockWebServer);

      // Act
      const result = await bootstrap(AppClass);

      // Assert
      expect(result).toBeDefined();
      expect(mockWebServer.listenPort).toBe(3000);
    });

    it("should handle invalid PORT in process.env", async () => {
      // Arrange
      process.env.PORT = "invalid";
      const AppClass = MockWebServer;

      // Act & Assert
      await expect(bootstrap(AppClass)).rejects.toThrow();
    });

    it("should handle AppFactory.create failure", async () => {
      // Arrange
      (AppFactory.create as jest.Mock) = jest
        .fn()
        .mockRejectedValue(new Error("Factory error"));
      const AppClass = MockWebServer;

      // Act & Assert
      await expect(bootstrap(AppClass)).rejects.toThrow("Factory error");
    });

    it("should handle listen failure", async () => {
      // Arrange
      const AppClass = MockWebServer;
      const mockWebServer = new MockWebServer();
      mockWebServer.listen = jest
        .fn()
        .mockRejectedValue(new Error("Listen error"));
      (AppFactory.create as jest.Mock) = jest
        .fn()
        .mockResolvedValue(mockWebServer);

      // Act & Assert
      await expect(bootstrap(AppClass)).rejects.toThrow("Listen error");
    });

    it("should use default environment when NODE_ENV is not set", async () => {
      // Arrange
      delete process.env.NODE_ENV;
      const AppClass = MockWebServer;

      // Act
      const result = await bootstrap(AppClass);

      // Assert
      expect(result).toBeDefined();
    });
  });

  describe("Port Priority", () => {
    it("should prioritize options.port over process.env.PORT", async () => {
      // Arrange
      process.env.PORT = "4000";
      const AppClass = MockWebServer;
      const mockWebServer = new MockWebServer();
      (AppFactory.create as jest.Mock) = jest
        .fn()
        .mockResolvedValue(mockWebServer);
      const options: BootstrapOptions = { port: 5000 };

      // Act
      const result = await bootstrap(AppClass, options);

      // Assert
      expect(result).toBeDefined();
      expect(mockWebServer.listenPort).toBe(5000);
    });

    it("should use default port 3000 when neither option nor env is set", async () => {
      // Arrange
      delete process.env.PORT;
      const AppClass = MockWebServer;
      const mockWebServer = new MockWebServer();
      (AppFactory.create as jest.Mock) = jest
        .fn()
        .mockResolvedValue(mockWebServer);

      // Act
      const result = await bootstrap(AppClass);

      // Assert
      expect(result).toBeDefined();
      expect(mockWebServer.listenPort).toBe(3000);
    });
  });
});

// End of unit tests for: bootstrap
