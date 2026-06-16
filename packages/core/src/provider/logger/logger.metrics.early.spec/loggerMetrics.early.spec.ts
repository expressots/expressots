// Unit tests for: logger.metrics

import {
  getDefaultBannerConfig,
  resolveBannerConfig,
  detectFeaturesStatus,
  formatMemory,
} from "../logger.metrics";

describe("logger.metrics", () => {
  describe("getDefaultBannerConfig()", () => {
    it("should return full config for development environment", () => {
      // Act
      const config = getDefaultBannerConfig("development");

      // Assert
      expect(config.style).toBe("full");
      expect(config.showMetrics).toBe(true);
      expect(config.showFeatures).toBe(false); // Disabled by default - user can enable
      expect(config.showConfig).toBe(true);
      expect(config.showPerformance).toBe(true);
      expect(config.showHealth).toBe(true);
      expect(config.showResources).toBe(false); // Disabled by default - user can enable
      expect(config.showMiddlewarePipeline).toBe(false); // Disabled by default - user can enable
      expect(config.showProviderRegistry).toBe(false); // Disabled by default - user can enable
      expect(config.maxMiddlewareDisplay).toBe(6);
      expect(config.maxProviderDisplay).toBe(5);
      expect(config.suppressLogsUntilBanner).toBe(true);
    });

    it("should return compact config for production environment", () => {
      // Act
      const config = getDefaultBannerConfig("production");

      // Assert
      expect(config.style).toBe("compact");
      expect(config.showFeatures).toBe(false); // Disabled by default
      expect(config.showConfig).toBe(true); // Always true
      expect(config.showHealth).toBe(true); // Always true
      expect(config.showResources).toBe(false); // Disabled by default
      expect(config.showMiddlewarePipeline).toBe(false); // Disabled by default
      expect(config.showProviderRegistry).toBe(false); // Disabled by default
    });

    it("should return full config when environment is undefined", () => {
      // Act
      const config = getDefaultBannerConfig(undefined);

      // Assert
      expect(config.style).toBe("full");
      expect(config.showFeatures).toBe(false); // Disabled by default - user can enable
    });

    it("should include showInEnvironments array", () => {
      // Act
      const config = getDefaultBannerConfig("development");

      // Assert
      expect(config.showInEnvironments).toEqual([
        "development",
        "production",
        "staging",
        "test",
      ]);
    });
  });

  describe("resolveBannerConfig()", () => {
    it("should return defaults when config is undefined", () => {
      // Act
      const config = resolveBannerConfig(undefined, "development");

      // Assert
      expect(config.style).toBe("full");
      expect(config.showMetrics).toBe(true);
    });

    it("should merge user config with defaults", () => {
      // Arrange
      const userConfig = {
        style: "minimal" as const,
        showMetrics: false,
        maxMiddlewareDisplay: 10,
      };

      // Act
      const config = resolveBannerConfig(userConfig, "development");

      // Assert
      expect(config.style).toBe("minimal");
      expect(config.showMetrics).toBe(false);
      expect(config.maxMiddlewareDisplay).toBe(10);
      expect(config.showFeatures).toBe(false); // From defaults (disabled by default)
    });

    it("should apply production environment overrides", () => {
      // Arrange
      const userConfig = {
        style: "full" as const,
        environment: {
          production: {
            style: "minimal" as const,
            showMetrics: false,
          },
        },
      };

      // Act
      const config = resolveBannerConfig(userConfig, "production");

      // Assert
      expect(config.style).toBe("minimal");
      expect(config.showMetrics).toBe(false);
    });

    it("should apply development environment overrides", () => {
      // Arrange
      const userConfig = {
        style: "compact" as const,
        environment: {
          development: {
            style: "full" as const,
            showFeatures: true,
          },
        },
      };

      // Act
      const config = resolveBannerConfig(userConfig, "development");

      // Assert
      expect(config.style).toBe("full");
      expect(config.showFeatures).toBe(true);
    });

    it("should not apply environment overrides for other environments", () => {
      // Arrange
      const userConfig = {
        style: "full" as const,
        environment: {
          production: {
            style: "minimal" as const,
          },
        },
      };

      // Act
      const config = resolveBannerConfig(userConfig, "staging");

      // Assert
      expect(config.style).toBe("full"); // Base config, not production override
    });

    it("should merge environment overrides with base config", () => {
      // Arrange
      const userConfig = {
        style: "full" as const,
        showMetrics: true,
        environment: {
          production: {
            style: "compact" as const,
            // showMetrics not overridden, should keep base value
          },
        },
      };

      // Act
      const config = resolveBannerConfig(userConfig, "production");

      // Assert
      expect(config.style).toBe("compact");
      expect(config.showMetrics).toBe(true); // From base config
    });
  });

  describe("detectFeaturesStatus()", () => {
    it("should return all features as false when options are undefined", () => {
      // Act
      const status = detectFeaturesStatus();

      // Assert
      expect(status).toEqual({
        contentNegotiation: false,
        smartValidation: false,
        authorization: false,
        exceptionFilters: false,
        gracefulShutdown: true, // Always enabled
        lifecycleHooks: false,
        customScopes: false,
        apiVersioning: false,
        globalRoutePrefix: false,
        errorHandler: false,
        requestLogging: false,
        interceptors: false,
        eventSystem: false,
        lazyLoading: false,
        enhancedConfiguration: false,
      });
    });

    it("should detect all features when enabled", () => {
      // Arrange
      const options = {
        hasContentNegotiation: true,
        hasSmartValidation: true,
        hasAuthorization: true,
        hasExceptionFilters: true,
        hasLifecycleHooks: true,
        hasCustomScopes: true,
        hasApiVersioning: true,
        hasGlobalRoutePrefix: true,
        hasErrorHandler: true,
        hasRequestLogging: true,
        hasInterceptors: true,
        hasEventSystem: true,
        hasLazyLoading: true,
        hasEnhancedConfiguration: true,
      };

      // Act
      const status = detectFeaturesStatus(options);

      // Assert
      expect(status.contentNegotiation).toBe(true);
      expect(status.smartValidation).toBe(true);
      expect(status.authorization).toBe(true);
      expect(status.exceptionFilters).toBe(true);
      expect(status.gracefulShutdown).toBe(true);
      expect(status.lifecycleHooks).toBe(true);
      expect(status.customScopes).toBe(true);
      expect(status.apiVersioning).toBe(true);
      expect(status.globalRoutePrefix).toBe(true);
      expect(status.errorHandler).toBe(true);
      expect(status.requestLogging).toBe(true);
      expect(status.interceptors).toBe(true);
      expect(status.eventSystem).toBe(true);
      expect(status.lazyLoading).toBe(true);
      expect(status.enhancedConfiguration).toBe(true);
    });

    it("should use default values for undefined options", () => {
      // Arrange
      const options = {
        hasContentNegotiation: true,
        // Other options undefined
      };

      // Act
      const status = detectFeaturesStatus(options);

      // Assert
      expect(status.contentNegotiation).toBe(true);
      expect(status.smartValidation).toBe(false);
      expect(status.gracefulShutdown).toBe(true); // Always enabled
    });

    it("should default gracefulShutdown to true when undefined", () => {
      // Arrange
      const options = {
        // hasGracefulShutdown not provided
      };

      // Act
      const status = detectFeaturesStatus(options);

      // Assert
      expect(status.gracefulShutdown).toBe(true);
    });

    it("should respect explicit gracefulShutdown value", () => {
      // Arrange
      const options = {
        hasGracefulShutdown: false,
      };

      // Act
      const status = detectFeaturesStatus(options);

      // Assert
      // The implementation uses ?? operator, so false is respected
      expect(status.gracefulShutdown).toBe(false);
    });
  });

  describe("formatMemory()", () => {
    it("should format bytes less than 1024", () => {
      // Act & Assert
      expect(formatMemory(0)).toBe("0B");
      expect(formatMemory(512)).toBe("512B");
      expect(formatMemory(1023)).toBe("1023B");
    });

    it("should format kilobytes", () => {
      // Act & Assert
      expect(formatMemory(1024)).toBe("1.0KB");
      expect(formatMemory(2048)).toBe("2.0KB");
      expect(formatMemory(5120)).toBe("5.0KB");
      expect(formatMemory(10240)).toBe("10.0KB");
    });

    it("should format megabytes", () => {
      // Act & Assert
      expect(formatMemory(1024 * 1024)).toBe("1.0MB");
      expect(formatMemory(2 * 1024 * 1024)).toBe("2.0MB");
      expect(formatMemory(5.5 * 1024 * 1024)).toBe("5.5MB");
    });

    it("should format fractional kilobytes", () => {
      // Act & Assert
      expect(formatMemory(1536)).toBe("1.5KB"); // 1.5 * 1024
      expect(formatMemory(2560)).toBe("2.5KB"); // 2.5 * 1024
    });

    it("should format fractional megabytes", () => {
      // Act & Assert
      const oneAndHalfMB = 1.5 * 1024 * 1024;
      expect(formatMemory(oneAndHalfMB)).toBe("1.5MB");
    });

    it("should handle large values", () => {
      // Act & Assert
      const tenMB = 10 * 1024 * 1024;
      expect(formatMemory(tenMB)).toBe("10.0MB");
    });
  });
});
