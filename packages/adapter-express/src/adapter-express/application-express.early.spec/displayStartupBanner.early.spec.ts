import { AppExpress } from "../application-express";

jest.mock("@expressots/core", () => {
  const actual = jest.requireActual("@expressots/core");
  return {
    ...actual,
    MetricsCollector: {
      collect: jest.fn().mockReturnValue({
        metrics: { providers: 2, interceptors: 1, middleware: 4 },
        features: ["validation"],
      }),
    },
    BannerGenerator: jest.fn().mockImplementation(() => ({
      display: jest.fn(),
    })),
  };
});

jest.mock("../express-utils/utils.js", () => ({
  getControllersFromMetadata: jest.fn().mockReturnValue([]),
  getControllersFromContainer: jest.fn().mockReturnValue([]),
  getControllerMethodMetadata: jest.fn().mockReturnValue([]),
}));

describe("AppExpress.displayStartupBanner() method", () => {
  it("falls back to the legacy console banner when no generator is configured", () => {
    const appExpress = new AppExpress() as AppExpress;
    const messageServer = jest.fn();
    const logger = {
      withContext: jest.fn().mockReturnValue({ debug: jest.fn() }),
      warn: jest.fn(),
    };

    (appExpress as unknown as { console: { messageServer: typeof messageServer } }).console = {
      messageServer,
    };
    (appExpress as unknown as { logger: typeof logger }).logger = logger;
    (appExpress as unknown as { bannerGenerator: null }).bannerGenerator = null;
    (appExpress as unknown as { port: number }).port = 3000;
    (appExpress as unknown as { environment: string }).environment = "development";
    (
      appExpress as unknown as { middlewareManager: { getStartupLogs: () => [] } }
    ).middlewareManager = {
      getStartupLogs: () => [],
    };

    (
      appExpress as unknown as { displayStartupBanner: (info?: { appName: string }) => void }
    ).displayStartupBanner({ appName: "demo", appVersion: "1.0.0" } as never);

    expect(messageServer).toHaveBeenCalledWith(
      3000,
      "development",
      expect.objectContaining({ appName: "demo" }),
    );
  });

  it("uses the banner generator and middleware startup logs in development", () => {
    const appExpress = new AppExpress() as AppExpress;
    const display = jest.fn();
    const discover = jest.fn();
    const clearStartupLogs = jest.fn();
    const logger = {
      withContext: jest.fn().mockReturnValue({ debug: jest.fn() }),
      warn: jest.fn(),
    };

    (appExpress as unknown as { bannerGenerator: { display: typeof display } }).bannerGenerator = {
      display,
    };
    (appExpress as unknown as { logger: typeof logger }).logger = logger;
    (appExpress as unknown as { port: number }).port = 4000;
    (appExpress as unknown as { environment: string }).environment = "development";
    (appExpress as unknown as { globalPrefix: string }).globalPrefix = "/api";
    (
      appExpress as unknown as { appContainer: { Container: { isBound: () => boolean } } }
    ).appContainer = { Container: { isBound: () => false } };
    (
      appExpress as unknown as {
        providerManager: { discover: typeof discover; getFormattedView: () => string };
      }
    ).providerManager = {
      discover,
      getFormattedView: () => "providers",
    };
    (appExpress as unknown as { middlewareManager: Record<string, unknown> }).middlewareManager = {
      getMiddlewarePipeline: () => [{ name: "cors" }],
      getContentNegotiationService: () => null,
      getValidationConfig: () => ({ smartDetection: true }),
      getErrorHandler: () => jest.fn(),
      getPipelineInfo: () => ({ entries: [{ category: "logging", name: "request-logging" }] }),
      getFormattedView: () => "middleware",
      getStartupLogs: () => [{ type: "warn", message: "helmet missing" }],
      clearStartupLogs,
    };

    (
      appExpress as unknown as { displayStartupBanner: (info?: { appName: string }) => void }
    ).displayStartupBanner({ appName: "demo", appVersion: "1.0.0" } as never);

    expect(display).toHaveBeenCalled();
    expect(discover).toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith("helmet missing", "middleware");
    expect(clearStartupLogs).toHaveBeenCalled();
  });

  it("falls back to the legacy console banner when banner generation throws", () => {
    const appExpress = new AppExpress() as AppExpress;
    const messageServer = jest.fn();
    const display = jest.fn().mockImplementation(() => {
      throw new Error("banner render failed");
    });
    const logger = {
      withContext: jest.fn().mockReturnValue({ debug: jest.fn() }),
      warn: jest.fn(),
    };

    (appExpress as unknown as { console: { messageServer: typeof messageServer } }).console = {
      messageServer,
    };
    (appExpress as unknown as { logger: typeof logger }).logger = logger;
    (appExpress as unknown as { bannerGenerator: { display: typeof display } }).bannerGenerator = {
      display,
    };
    (appExpress as unknown as { port: number }).port = 3000;
    (appExpress as unknown as { environment: string }).environment = "development";
    (
      appExpress as unknown as { appContainer: { Container: { isBound: () => boolean } } }
    ).appContainer = { Container: { isBound: () => false } };
    (
      appExpress as unknown as {
        providerManager: { discover: () => void; getFormattedView: () => string };
      }
    ).providerManager = {
      discover: jest.fn(),
      getFormattedView: () => "providers",
    };
    (appExpress as unknown as { middlewareManager: Record<string, unknown> }).middlewareManager = {
      getMiddlewarePipeline: () => [],
      getContentNegotiationService: () => null,
      getValidationConfig: () => ({ smartDetection: false }),
      getErrorHandler: () => jest.fn(),
      getPipelineInfo: () => ({ entries: [] }),
      getFormattedView: () => "middleware",
      getStartupLogs: () => [],
      clearStartupLogs: jest.fn(),
    };

    (
      appExpress as unknown as { displayStartupBanner: (info?: { appName: string }) => void }
    ).displayStartupBanner({ appName: "demo", appVersion: "1.0.0" } as never);

    expect(logger.warn).toHaveBeenCalledWith(
      "Failed to display startup banner, using fallback",
      "adapter-express",
      expect.any(Error),
    );
    expect(messageServer).toHaveBeenCalledWith(
      3000,
      "development",
      expect.objectContaining({ appName: "demo" }),
    );
  });
});
