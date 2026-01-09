// Unit tests for: BannerGenerator.display()

import { BannerGenerator, BannerData } from "../logger.banner";
import { ApplicationMetrics, FeaturesStatus } from "../logger.metrics";
import type { IConsoleMessage } from "@expressots/shared";
import { MiddlewareCategory } from "../../../middleware/middleware-service";

describe("BannerGenerator.display() display method", () => {
  let bannerGenerator: BannerGenerator;
  let stdoutWriteSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutWriteSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutWriteSpy.mockRestore();
  });

  describe("Happy Path", () => {
    it("should display full banner with all information", () => {
      // Arrange
      bannerGenerator = new BannerGenerator({ style: "full" });
      const port = 3000;
      const environment = "development";
      const appInfo: IConsoleMessage = {
        appName: "TestApp",
        appVersion: "1.0.0",
      };
      const metrics: ApplicationMetrics = {
        controllers: 5,
        providers: 10,
        middleware: 8,
        guards: 3,
        filters: 2,
        routes: 15,
      };
      const features: FeaturesStatus = {
        globalRoutePrefix: true,
        apiVersioning: true,
        contentNegotiation: false,
        smartValidation: true,
        authorization: true,
        exceptionFilters: true,
        errorHandler: true,
        gracefulShutdown: true,
        lifecycleHooks: true,
        requestLogging: true,
        customScopes: false,
        interceptors: true,
        eventSystem: true,
        lazyLoading: false,
        enhancedConfiguration: true,
      };
      const config = {
        port: 3000,
        env: "development",
      };

      // Act
      bannerGenerator.display(
        port,
        environment,
        appInfo,
        metrics,
        features,
        config,
      );

      // Assert
      expect(stdoutWriteSpy).toHaveBeenCalled();
      const output = stdoutWriteSpy.mock.calls.map((call) => call[0]).join("");
      expect(output).toContain("ExpressoTS");
      expect(output).toContain("TestApp");
      expect(output).toContain("3000");
      expect(output).toContain("development");
    });

    it("should display compact banner", () => {
      // Arrange
      bannerGenerator = new BannerGenerator({ style: "compact" });
      const port = 3000;
      const environment = "production";
      const appInfo: IConsoleMessage = {
        appName: "TestApp",
        appVersion: "1.0.0",
      };

      // Act
      bannerGenerator.display(port, environment, appInfo);

      // Assert
      expect(stdoutWriteSpy).toHaveBeenCalled();
      const output = stdoutWriteSpy.mock.calls.map((call) => call[0]).join("");
      expect(output).toContain("ExpressoTS");
      expect(output).toContain("TestApp");
    });

    it("should display minimal banner", () => {
      // Arrange
      bannerGenerator = new BannerGenerator({ style: "minimal" });
      const port = 8080;
      const environment = "test";
      const appInfo: IConsoleMessage = {
        appName: "MinimalApp",
        appVersion: "1.0.0",
      };

      // Act
      bannerGenerator.display(port, environment, appInfo);

      // Assert
      expect(stdoutWriteSpy).toHaveBeenCalled();
      const output = stdoutWriteSpy.mock.calls.map((call) => call[0]).join("");
      expect(output).toContain("MinimalApp");
      expect(output).toContain("8080");
      expect(output).toContain("test");
    });

    it("should display banner with middleware view", () => {
      // Arrange
      bannerGenerator = new BannerGenerator({
        style: "full",
        showMiddlewarePipeline: true, // Enable middleware display
      });
      const port = 3000;
      const environment = "development";
      const bannerData: BannerData = {
        middlewareView: {
          entries: [
            {
              name: "cors",
              category: "security" as MiddlewareCategory,
              type: "built-in",
            },
            {
              name: "helmet",
              category: "security" as MiddlewareCategory,
              type: "built-in",
            },
          ],
          total: 2,
          remaining: 0,
        },
      };

      // Act
      bannerGenerator.display(
        port,
        environment,
        undefined,
        undefined,
        undefined,
        undefined,
        bannerData,
      );

      // Assert
      expect(stdoutWriteSpy).toHaveBeenCalled();
      const output = stdoutWriteSpy.mock.calls.map((call) => call[0]).join("");
      expect(output).toContain("Middleware Pipeline");
      expect(output).toContain("cors");
    });

    it("should display banner with provider view", () => {
      // Arrange
      bannerGenerator = new BannerGenerator({
        style: "full",
        showProviderRegistry: true, // Enable provider display
      });
      const port = 3000;
      const environment = "development";
      const bannerData: BannerData = {
        providerView: {
          entries: [
            {
              name: "Logger",
              scope: "singleton",
              hasLifecycle: false,
              hasHealthCheck: true,
              hasMetrics: true,
            },
          ],
          total: 1,
          remaining: 0,
        },
      };

      // Act
      bannerGenerator.display(
        port,
        environment,
        undefined,
        undefined,
        undefined,
        undefined,
        bannerData,
      );

      // Assert
      expect(stdoutWriteSpy).toHaveBeenCalled();
      const output = stdoutWriteSpy.mock.calls.map((call) => call[0]).join("");
      expect(output).toContain("Provider Registry");
      expect(output).toContain("Logger");
    });

    it("should display banner with API versions", () => {
      // Arrange
      bannerGenerator = new BannerGenerator({ style: "full" });
      const port = 3000;
      const environment = "development";
      const appInfo: IConsoleMessage & { apiVersions?: Array<string> } = {
        appName: "TestApp",
        appVersion: "1.0.0",
        apiVersions: ["v1", "v2"],
      };

      // Act
      bannerGenerator.display(port, environment, appInfo);

      // Assert
      expect(stdoutWriteSpy).toHaveBeenCalled();
      const output = stdoutWriteSpy.mock.calls.map((call) => call[0]).join("");
      expect(output).toContain("API Versions");
      expect(output).toContain("v1");
      expect(output).toContain("v2");
    });
  });

  describe("Edge Cases", () => {
    it("should not display anything when style is 'none'", () => {
      // Arrange
      bannerGenerator = new BannerGenerator({ style: "none" });
      const port = 3000;
      const environment = "development";

      // Act
      bannerGenerator.display(port, environment);

      // Assert
      // Should only write newlines, no actual banner content
      const output = stdoutWriteSpy.mock.calls.map((call) => call[0]).join("");
      expect(output).not.toContain("ExpressoTS");
    });

    it("should handle missing appInfo gracefully", () => {
      // Arrange
      bannerGenerator = new BannerGenerator({ style: "full" });
      const port = 3000;
      const environment = "development";

      // Act
      bannerGenerator.display(port, environment, undefined);

      // Assert
      expect(stdoutWriteSpy).toHaveBeenCalled();
      const output = stdoutWriteSpy.mock.calls.map((call) => call[0]).join("");
      expect(output).toContain("App");
      expect(output).toContain("not provided");
    });

    it("should handle missing metrics gracefully", () => {
      // Arrange
      bannerGenerator = new BannerGenerator({ style: "full" });
      const port = 3000;
      const environment = "development";
      const appInfo: IConsoleMessage = {
        appName: "TestApp",
        appVersion: "1.0.0",
      };

      // Act
      bannerGenerator.display(port, environment, appInfo);

      // Assert
      expect(stdoutWriteSpy).toHaveBeenCalled();
      // Should not crash when metrics are undefined
    });

    it("should display middleware with remaining count", () => {
      // Arrange
      bannerGenerator = new BannerGenerator({
        style: "full",
        maxMiddlewareDisplay: 2,
        showMiddlewarePipeline: true, // Enable middleware display
      });
      const port = 3000;
      const environment = "development";
      const bannerData: BannerData = {
        middlewareView: {
          entries: [
            {
              name: "cors",
              category: "security" as MiddlewareCategory,
              type: "built-in",
            },
            {
              name: "helmet",
              category: "security" as MiddlewareCategory,
              type: "built-in",
            },
          ],
          total: 5,
          remaining: 3,
        },
      };

      // Act
      bannerGenerator.display(
        port,
        environment,
        undefined,
        undefined,
        undefined,
        undefined,
        bannerData,
      );

      // Assert
      expect(stdoutWriteSpy).toHaveBeenCalled();
      const output = stdoutWriteSpy.mock.calls.map((call) => call[0]).join("");
      expect(output).toContain("... +3 more");
    });

    it("should display provider with remaining count", () => {
      // Arrange
      bannerGenerator = new BannerGenerator({
        style: "full",
        maxProviderDisplay: 2,
        showProviderRegistry: true, // Enable provider display
      });
      const port = 3000;
      const environment = "development";
      const bannerData: BannerData = {
        providerView: {
          entries: [
            {
              name: "Logger",
              scope: "singleton",
              hasLifecycle: false,
              hasHealthCheck: true,
              hasMetrics: true,
            },
            {
              name: "Database",
              scope: "singleton",
              hasLifecycle: true,
              hasHealthCheck: true,
              hasMetrics: false,
            },
          ],
          total: 5,
          remaining: 3,
        },
      };

      // Act
      bannerGenerator.display(
        port,
        environment,
        undefined,
        undefined,
        undefined,
        undefined,
        bannerData,
      );

      // Assert
      expect(stdoutWriteSpy).toHaveBeenCalled();
      const output = stdoutWriteSpy.mock.calls.map((call) => call[0]).join("");
      expect(output).toContain("... +3 more");
    });

    it("should handle different environment colors", () => {
      // Arrange
      bannerGenerator = new BannerGenerator({ style: "full" });
      const port = 3000;

      // Test development (yellow)
      stdoutWriteSpy.mockClear();
      bannerGenerator.display(port, "development");
      let output = stdoutWriteSpy.mock.calls.map((call) => call[0]).join("");
      expect(output).toContain("development");

      // Test production (green)
      stdoutWriteSpy.mockClear();
      bannerGenerator.display(port, "production");
      output = stdoutWriteSpy.mock.calls.map((call) => call[0]).join("");
      expect(output).toContain("production");

      // Test other environments (red)
      stdoutWriteSpy.mockClear();
      bannerGenerator.display(port, "staging");
      output = stdoutWriteSpy.mock.calls.map((call) => call[0]).join("");
      expect(output).toContain("staging");
    });

    it("should respect showMetrics config", () => {
      // Arrange
      bannerGenerator = new BannerGenerator({
        style: "full",
        showMetrics: false,
      });
      const port = 3000;
      const environment = "development";
      const metrics: ApplicationMetrics = {
        controllers: 5,
        providers: 10,
        middleware: 8,
        guards: 0,
        filters: 0,
        routes: 15,
      };

      // Act
      bannerGenerator.display(port, environment, undefined, metrics);

      // Assert
      expect(stdoutWriteSpy).toHaveBeenCalled();
      const output = stdoutWriteSpy.mock.calls.map((call) => call[0]).join("");
      // Metrics should not be displayed
      expect(output).not.toContain("Controllers:");
    });

    it("should respect showFeatures config", () => {
      // Arrange
      bannerGenerator = new BannerGenerator({
        style: "full",
        showFeatures: false,
      });
      const port = 3000;
      const environment = "development";
      const features: FeaturesStatus = {
        globalRoutePrefix: true,
        apiVersioning: true,
        contentNegotiation: false,
        smartValidation: true,
        authorization: true,
        exceptionFilters: true,
        errorHandler: true,
        gracefulShutdown: true,
        lifecycleHooks: true,
        requestLogging: true,
        customScopes: false,
        interceptors: true,
        eventSystem: true,
        lazyLoading: false,
        enhancedConfiguration: true,
      };

      // Act
      bannerGenerator.display(
        port,
        environment,
        undefined,
        undefined,
        features,
      );

      // Assert
      expect(stdoutWriteSpy).toHaveBeenCalled();
      const output = stdoutWriteSpy.mock.calls.map((call) => call[0]).join("");
      // Features should not be displayed
      expect(output).not.toContain("Features Enabled");
    });

    it("should respect showConfig config", () => {
      // Arrange
      bannerGenerator = new BannerGenerator({
        style: "full",
        showConfig: false,
      });
      const port = 3000;
      const environment = "development";
      const config = { port: 3000 };

      // Act
      bannerGenerator.display(
        port,
        environment,
        undefined,
        undefined,
        undefined,
        config,
      );

      // Assert
      expect(stdoutWriteSpy).toHaveBeenCalled();
      const output = stdoutWriteSpy.mock.calls.map((call) => call[0]).join("");
      // Config should not be displayed
      expect(output).not.toContain("Configuration");
    });

    it("should respect showPerformance config", () => {
      // Arrange
      bannerGenerator = new BannerGenerator({
        style: "full",
        showPerformance: false,
      });
      const port = 3000;
      const environment = "development";

      // Act
      bannerGenerator.display(port, environment);

      // Assert
      expect(stdoutWriteSpy).toHaveBeenCalled();
      const output = stdoutWriteSpy.mock.calls.map((call) => call[0]).join("");
      // Performance should not be displayed
      expect(output).not.toContain("Startup:");
    });

    it("should respect showHealth config", () => {
      // Arrange
      bannerGenerator = new BannerGenerator({
        style: "full",
        showHealth: false,
      });
      const port = 3000;
      const environment = "development";

      // Act
      bannerGenerator.display(port, environment);

      // Assert
      expect(stdoutWriteSpy).toHaveBeenCalled();
      const output = stdoutWriteSpy.mock.calls.map((call) => call[0]).join("");
      // Health should not be displayed
      expect(output).not.toContain("System Health");
    });

    it("should respect showResources config", () => {
      // Arrange
      bannerGenerator = new BannerGenerator({
        style: "full",
        showResources: false,
      });
      const port = 3000;
      const environment = "development";

      // Act
      bannerGenerator.display(port, environment);

      // Assert
      expect(stdoutWriteSpy).toHaveBeenCalled();
      const output = stdoutWriteSpy.mock.calls.map((call) => call[0]).join("");
      // Resources should not be displayed
      expect(output).not.toContain("Resources");
    });

    it("should respect showMiddlewarePipeline config", () => {
      // Arrange
      bannerGenerator = new BannerGenerator({
        style: "full",
        showMiddlewarePipeline: false,
      });
      const port = 3000;
      const environment = "development";
      const bannerData: BannerData = {
        middlewareView: {
          entries: [
            {
              name: "cors",
              category: "security" as MiddlewareCategory,
              type: "built-in",
            },
          ],
          total: 1,
          remaining: 0,
        },
      };

      // Act
      bannerGenerator.display(
        port,
        environment,
        undefined,
        undefined,
        undefined,
        undefined,
        bannerData,
      );

      // Assert
      expect(stdoutWriteSpy).toHaveBeenCalled();
      const output = stdoutWriteSpy.mock.calls.map((call) => call[0]).join("");
      // Middleware pipeline should not be displayed
      expect(output).not.toContain("Middleware Pipeline");
    });

    it("should respect showProviderRegistry config", () => {
      // Arrange
      bannerGenerator = new BannerGenerator({
        style: "full",
        showProviderRegistry: false,
      });
      const port = 3000;
      const environment = "development";
      const bannerData: BannerData = {
        providerView: {
          entries: [
            {
              name: "Logger",
              scope: "singleton",
              hasLifecycle: false,
              hasHealthCheck: true,
              hasMetrics: true,
            },
          ],
          total: 1,
          remaining: 0,
        },
      };

      // Act
      bannerGenerator.display(
        port,
        environment,
        undefined,
        undefined,
        undefined,
        undefined,
        bannerData,
      );

      // Assert
      expect(stdoutWriteSpy).toHaveBeenCalled();
      const output = stdoutWriteSpy.mock.calls.map((call) => call[0]).join("");
      // Provider registry should not be displayed
      expect(output).not.toContain("Provider Registry");
    });
  });
});
