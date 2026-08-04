import express from "express";
import { Server as HTTPServer } from "http";
// Node built-ins used by the port-conflict handling in listen(). Imported
// statically: as `await import(...)` they compile to a dynamic import that
// Jest's CJS VM cannot execute without --experimental-vm-modules, which
// made createTestApp() — and therefore the default scaffold's own test
// suite — fail for every user.
import { exec } from "node:child_process";
import * as net from "node:net";
import { promisify } from "node:util";
import * as logBuffer from "./log-buffer.js";

// Note: We use the global `process` object directly instead of importing it
// because signal handlers (SIGTERM, SIGINT, etc.) don't work correctly when
// process is imported as an ES module in CommonJS compiled code.

import {
  AppContainer,
  ApplicationMetrics,
  Console,
  ExpressoMiddleware,
  IConsoleMessage,
  IMiddleware,
  INTERCEPTOR_METADATA_KEY,
  LifecycleRegistry,
  Logger,
  Middleware,
  ProviderManager,
  BannerGenerator,
  MetricsCollector,
  BannerConfig,
  resolveBannerConfig,
  BannerData,
} from "@expressots/core";

/**
 * Metadata key used by `@provide` (and friends) in `@expressots/core`'s
 * binding-decorator module. The constant lives at an internal path
 * (`di/binding-decorator/constants`) so we hardcode the string here —
 * it's part of the framework's stable runtime contract and is what
 * `MetricsCollector` reads for its own `providers` count.
 */
const PROVIDE_METADATA_KEY = "inversify-binding-decorators:provide";
import { Env, IWebServerPublic, RenderEngine, Server } from "@expressots/shared";

import { interfaces, schemaToJsonSchema } from "@expressots/core";
import { ExpressHandler, MiddlewareConfig } from "./application-express.types.js";
import { HttpStatusCodeMiddleware } from "./express-utils/http-status-middleware.js";
import { InversifyExpressServer } from "./express-utils/inversify-express-server.js";
import { setEngineEjs, setEngineHandlebars, setEnginePug } from "./render/engine.js";
import { AddressInfo } from "net";
import {
  getControllersFromMetadata,
  getControllersFromContainer,
  getControllerMethodMetadata,
  getControllerMetadata,
} from "./express-utils/utils.js";
import { getValidationMetadata } from "./express-utils/validation-decorators.js";
import {
  initializeStudio,
  stopStudio,
  isStudioEnabled,
  reportStudioRuntimeInfo,
  rescanStudioRoutes,
  refreshStudioContainer,
} from "./studio/index.js";

/**
 * The AppExpress class provides methods for configuring and running an Express application.
 * @class AppExpress
 * @implements {IWebServer} - Interface for the WebServer application implementation.
 * @method configure - Configures the InversifyJS container.
 * @method listen - Start listening on the given port and environment.
 * @method setGlobalRoutePrefix - Sets the global route prefix for the application.
 * @method setEngine - Configures the application's view engine based on the provided configuration options.
 * @method isDevelopment - Verifies if the current environment is development.
 */
export class AppExpress implements Server.IWebServer {
  protected logger: Logger = new Logger();
  private console: Console = new Console();
  private app: express.Application;
  private serverInstance: HTTPServer | null = null;
  private port: number;
  private environment?: Env.Environment;
  private appContainer: AppContainer;
  private globalPrefix: string = "/";
  private middlewareManager: IMiddleware;
  private middlewares: Array<ExpressHandler | MiddlewareConfig | ExpressoMiddleware> = [];
  private providerManager: ProviderManager;
  private renderOptions: RenderEngine.RenderOptions = {} as RenderEngine.RenderOptions;
  private lifecycleRegistry: LifecycleRegistry;
  private isShuttingDown: boolean = false;
  private bannerGenerator: BannerGenerator | null = null;
  private bannerConfig: BannerConfig | undefined;
  private shutdownHandlers: Map<NodeJS.Signals, () => void> = new Map();
  private studioConfig: {
    enabled?: boolean;
    port?: number;
    dbPath?: string;
    serviceName?: string;
  } = {};
  /**
   * Latest snapshot of application metrics produced by `MetricsCollector`
   * during banner display. We cache it so that `reportStudioRuntimeInfo`
   * can forward the *runtime* provider/interceptor counts (which match
   * what the CLI banner shows) to the Studio Agent without recomputing.
   */
  private lastApplicationMetrics: ApplicationMetrics | null = null;
  /** Track active connections for force-close during shutdown */
  private activeConnections: Set<import("net").Socket> = new Set();
  /** Timeout for force-closing connections during shutdown (ms) */
  private shutdownTimeout: number = 5000;
  /** Number of retries when port is in use (for hot-reload scenarios) */
  private portRetryAttempts: number = 10;
  /** Delay between port retry attempts (ms) */
  private portRetryDelay: number = 500;

  // Log buffering for banner-first display.
  //
  // Buffering is **opt-in** and is activated either by:
  //   1. Constructing an `AppExpress` instance (the constructor calls
  //      `startLogBuffering()`), or
  //   2. The framework calling `AppExpress.startLogBuffering()` explicitly
  //      from `bootstrap()` so logs emitted during container/module setup
  //      are captured before the AppExpress instance even exists.
  //
  // Importing `@expressots/adapter-express` does NOT touch stdio. Test
  // harnesses, type-only consumers, and tooling that imports the module
  // without ever booting an app will see normal `process.stdout` /
  // `console.*` behavior. `micro()` calls `disableBuffering()` on entry
  // because it does not use the banner system.
  /**
   * Disable log buffering. Called by micro() to restore normal console output
   * since micro API doesn't use the banner system.
   * @public API
   */
  public static disableBuffering(): void {
    logBuffer.disableBuffering();
  }

  /**
   * Start buffering all console output for the banner-first display flow.
   * Captures both `console.*` and direct `process.stdout.write` / `process.stderr.write`
   * calls so they can be flushed in the correct order after the banner displays.
   *
   * Idempotent: calling this multiple times is safe.
   *
   * @public API — called by `bootstrap()` so logs emitted during container
   * setup are captured before the `AppExpress` instance exists. Also called
   * automatically inside the constructor as a safety net.
   */
  public static startLogBuffering(): void {
    logBuffer.startLogBuffering();
  }

  /**
   * Stop buffering but keep the buffered logs for later flushing.
   * This restores normal console/stdout output.
   * @private
   */
  private static stopBuffering(): void {
    logBuffer.stopBuffering();
  }

  /**
   * Flush all buffered logs to stdout.
   * Should be called after stopBuffering() and after displaying the banner.
   * @private
   */
  private static flushBufferedLogs(): void {
    logBuffer.flushBufferedLogs();
  }

  constructor() {
    // Activate banner-first log buffering on first AppExpress construction.
    // Idempotent — bootstrap() typically called this earlier so logs emitted
    // during container/module setup were already buffered. micro() never
    // reaches this constructor; it explicitly disables buffering itself.
    AppExpress.startLogBuffering();
    this.globalConfiguration();
  }

  /**
   * Helper function to handle both sync and async method calls.
   * If the result is a Promise, awaits it; otherwise returns immediately.
   * @private
   */
  private async handleSyncOrAsync(result: void | Promise<void>): Promise<void> {
    if (result instanceof Promise) {
      return await result;
    }
  }

  /**
   * Implement this method to set up global configurations for the server.
   * This method is called synchronously in the constructor before any other
   * server initialization methods. Use this method to configure global settings
   * that apply to the entire server application.
   *
   * Note: This method is synchronous and called during object construction.
   * For asynchronous initialization, use `configureServices()` instead.
   *
   * @abstract
   * @returns {void}
   * @public API
   */
  protected globalConfiguration(): void {}

  /**
   * Implement this method to set up required services or configurations before
   * the server starts. This is essential for initializing dependencies or settings
   * necessary for server operation. Supports both synchronous and asynchronous setup.
   *
   * @abstract
   * @returns {void | Promise<void>}
   * @public API
   */
  protected configureServices(): void | Promise<void> {}

  /**
   * Implement this method to execute actions or configurations after the server
   * has started. Use this for operations that need to run once the server is
   * operational. Supports both synchronous and asynchronous execution.
   *
   * @abstract
   * @returns {void | Promise<void>}
   * @public API
   */
  protected postServerInitialization(): void | Promise<void> {}

  /**
   * Implement this method to handle cleanup and final actions when the server
   * is shutting down. Ideal for closing resources, stopping tasks, or other
   * cleanup procedures to ensure a graceful server shutdown. Supports both
   * synchronous and asynchronous cleanup.
   *
   * The signal parameter indicates what triggered the shutdown:
   * - SIGTERM: Graceful termination (e.g., Kubernetes pod shutdown)
   * - SIGINT: User interrupt (e.g., Ctrl+C)
   * - SIGHUP: Terminal hangup
   * - SIGQUIT: Quit with core dump
   * - SIGBREAK: Windows break signal
   *
   * @abstract
   * @param signal - The signal that triggered the shutdown (optional for backward compatibility)
   * @returns {void | Promise<void>}
   * @public API
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected serverShutdown(signal?: NodeJS.Signals): void | Promise<void> {}

  /**
   * Performs graceful shutdown of the application.
   *
   * Shutdown sequence:
   * 1. Execute lifecycle shutdown hooks on all IShutdown providers
   * 2. Call user's serverShutdown hook
   * 3. Close the HTTP server to stop accepting new connections
   *
   * @param signal - The signal that triggered the shutdown
   * @returns Promise that resolves when shutdown is complete
   * @internal
   */
  private async handleExit(signal?: NodeJS.Signals): Promise<void> {
    // Helper: race any drain against a hard cap. We never want a
    // misbehaving cleanup hook (OTel exporter, slow DB driver, user
    // shutdown promise that never resolves) to hold the whole exit
    // chain. Each phase gets its own bound — total fits inside the
    // outer `setShutdownTimeout` watchdog.
    const withTimeout = async <T>(p: Promise<T> | T, ms: number): Promise<void> => {
      const value = Promise.resolve(p).then(() => {});
      const timer = new Promise<void>((resolve) => setTimeout(resolve, ms).unref());
      await Promise.race([value, timer]);
    };

    // 1. Stop Studio Agent if running. We cap this at 1.5s — the agent
    //    itself caps its websocket drain at 500ms and OpenTelemetry at
    //    500ms, but auto-instrumentations can leave handles around so
    //    the wrapper close still occasionally drags. 1.5s is plenty.
    await withTimeout(stopStudio(), 1500);

    // 2. Execute lifecycle shutdown hooks on all IShutdown providers.
    //    Capped at the user-configured shutdown timeout (default 5s).
    if (this.lifecycleRegistry) {
      await withTimeout(this.lifecycleRegistry.executeShutdown(signal), this.shutdownTimeout);
    }

    // 3. Call user's serverShutdown hook (also capped).
    await withTimeout(this.handleSyncOrAsync(this.serverShutdown(signal)), this.shutdownTimeout);

    // 4. Gracefully close the HTTP server with aggressive connection
    //    teardown. Order matters: we destroy *all* tracked connections
    //    immediately (not just idle ones) before calling `close()`,
    //    because otherwise an active keep-alive request would hold the
    //    `close` callback open until either its keep-alive timer
    //    expires (~5s) or the inner `forceCloseTimeout` fires. Killing
    //    connections up-front lets `close` resolve in the next tick.
    if (this.serverInstance) {
      await new Promise<void>((resolve) => {
        const forceCloseTimeout = setTimeout(() => {
          console.log(
            `⚠️  Force-closing ${this.activeConnections.size} active connections after ${this.shutdownTimeout}ms timeout`,
          );
          this.destroyAllConnections();
          resolve();
        }, this.shutdownTimeout);
        forceCloseTimeout.unref();

        this.serverInstance!.close((err) => {
          clearTimeout(forceCloseTimeout);
          if (err) {
            // Don't fail on close error during shutdown - just log it
            console.log(`Note: Server close returned: ${err.message}`);
          }
          resolve();
        });

        // Aggressively kill keep-alive sockets so `close` actually
        // resolves promptly. `closeAllConnections` is Node 18.2+; older
        // versions silently no-op via the optional-call.
        try {
          (
            this.serverInstance as unknown as { closeAllConnections?: () => void }
          ).closeAllConnections?.();
        } catch {
          // best-effort — destroy our tracked set as a fallback
        }
        this.destroyAllConnections();
      });
    }
  }

  /**
   * Destroy all active connections immediately.
   * Used during forced shutdown.
   * @private
   */
  private destroyAllConnections(): void {
    for (const socket of this.activeConnections) {
      try {
        socket.destroy();
      } catch {
        // Ignore errors during connection destruction
      }
    }
    this.activeConnections.clear();
  }

  /**
   * Track a new connection for shutdown management.
   * @private
   */
  private trackConnection(socket: import("net").Socket): void {
    this.activeConnections.add(socket);
    socket.once("close", () => {
      this.activeConnections.delete(socket);
    });
  }

  /**
   * Initialize the InversifyJS container with the provided modules and options.
   * @param appModules - An array of application modules to be loaded into the container.
   * @param containerOptions - Container global configuration options.
   * @option skipBaseClassChecks - Skip the base class checks for the container.
   * @option autoBindInjectable - Automatically bind the injectable classes.
   * @option defaultScope - The default scope to use for bindings.
   *
   * @returns The configured AppContainer instance.
   * @public API
   */
  public configContainer(
    appModules: Array<interfaces.ContainerModule>,
    containerOptions?: interfaces.ContainerOptions,
  ): AppContainer {
    this.appContainer = new AppContainer(containerOptions ? containerOptions : {});

    if (!appModules) {
      this.logger.error("No modules provided for container configuration", "adapter-express");
      return;
    }

    this.appContainer.create(appModules);

    this.providerManager = new ProviderManager(this.appContainer.Container);
    const baseMiddleware = new Middleware();

    // Create a wrapper that automatically injects container for exception filters
    this.middlewareManager = this.createMiddlewareWrapper(baseMiddleware);

    // Initialize lifecycle registry and discover providers implementing IBootstrap/IShutdown
    this.lifecycleRegistry = new LifecycleRegistry(this.appContainer.Container);
    this.lifecycleRegistry.discover();

    return this.appContainer;
  }

  /**
   * Creates a middleware wrapper that automatically injects container when exception filters are enabled
   * This allows users to simply set enableExceptionFilters: true without manually passing the container
   */
  private createMiddlewareWrapper(baseMiddleware: Middleware): IMiddleware {
    const container = this.appContainer?.Container;

    // Create a proxy that intercepts setErrorHandler calls
    return new Proxy(baseMiddleware, {
      get(target: Middleware, prop: string | symbol): unknown {
        if (prop === "setErrorHandler") {
          return function (options?: import("@expressots/core").ErrorHandlerOptions): void {
            // Automatically inject container if enableExceptionFilters is true and container is available
            const enhancedOptions: import("@expressots/core").ErrorHandlerOptions = {
              ...options,
              container:
                options?.enableExceptionFilters && container ? container : options?.container,
            };
            target.setErrorHandler(enhancedOptions);
          };
        }
        // Forward all other property access to the base middleware
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const value = (target as any)[prop];
        return typeof value === "function" ? value.bind(target) : value;
      },
    }) as IMiddleware;
  }

  /**
   * Get the ProviderManager instance.
   * @returns The ProviderManager instance.
   * @public API
   */
  public get Provider(): ProviderManager {
    return this.providerManager;
  }

  /**
   * Get the Middleware instance.
   * @returns The Middleware instance.
   * @public API
   */
  public get Middleware(): IMiddleware {
    return this.middlewareManager;
  }

  /**
   * Configures the Express application with the provided middleware entries.
   * @param app - The Express application instance.
   * @param middlewareEntries - An array of Express middleware entries to be applied.
   */
  private async configureMiddleware(
    app: express.Application,
    middlewareEntries: Array<ExpressHandler | MiddlewareConfig | ExpressoMiddleware>,
  ): Promise<void> {
    for (const entry of middlewareEntries) {
      if (typeof entry === "function") {
        app.use(entry as express.RequestHandler);
        // eslint-disable-next-line no-prototype-builtins
      } else if (entry?.hasOwnProperty("path")) {
        const { path, middlewares } = entry as MiddlewareConfig;
        const pathGlobal = this.globalPrefix + path;
        for (const mid of middlewares) {
          if (path) {
            if (typeof mid === "function") {
              app.use(pathGlobal, mid as express.RequestHandler);
            } else {
              const middleware = mid as unknown as ExpressoMiddleware;
              // Check if it's a BaseMiddleware instance (has handler method, not use)
              const middlewareRecord = middleware as unknown as Record<string, unknown>;
              if (middlewareRecord.handler && typeof middlewareRecord.handler === "function") {
                // BaseMiddleware instance - wrap handler method
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const baseMiddleware = middleware as any;
                app.use(
                  pathGlobal,
                  (req: express.Request, res: express.Response, next: express.NextFunction) => {
                    baseMiddleware.handler(req, res, next);
                  },
                );
              } else if (middleware.use) {
                middleware.use = middleware.use.bind(middleware);
                app.use(pathGlobal, middleware.use);
              } else {
                this.logger.warn(
                  `Middleware ${middleware.constructor?.name || "unknown"} does not have a 'use' or 'handler' method`,
                  "application-express",
                );
              }
            }
          }
        }
      } else {
        const middleware = entry as ExpressoMiddleware;
        // Check if it's a BaseMiddleware instance (has handler method, not use)
        // BaseMiddleware instances are handled specially in inversify-express-server
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((middleware as any).handler && typeof (middleware as any).handler === "function") {
          // BaseMiddleware instance - wrap handler method
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const baseMiddleware = middleware as any;
          app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
            baseMiddleware.handler(req, res, next);
          });
        } else if (middleware.use) {
          middleware.use = middleware.use.bind(middleware);
          app.use(middleware.use);
        } else {
          this.logger.warn(
            `Middleware ${middleware.constructor?.name || "unknown"} does not have a 'use' or 'handler' method`,
            "application-express",
          );
        }
      }
    }
  }

  /**
   * Create and configure the Express application.
   * @param container - The InversifyJS container.
   * @param middlewares - An array of Express middlewares to be applied.
   * @returns The configured Application instance.
   */
  private async init(): Promise<AppExpress> {
    if (!this.appContainer) {
      this.logger.error("No container provided for application configuration", "adapter-express");
      process.exit(1);
    }

    // Create Express app early so it's available during configureServices for render()
    const tempApp = express();
    (this.Middleware as Middleware).setExpressApp(tempApp);

    // Initialize Studio Agent if available (adds middleware before user
    // middlewares). At this point we already know the port the user asked
    // us to listen on (set in `listen()` before `init()` is invoked) and
    // the configured global prefix, so forward both — the agent uses them
    // to populate the Studio Status page.
    await initializeStudio(
      tempApp,
      {
        ...this.studioConfig,
        appPort: this.port,
        globalPrefix: this.globalPrefix,
      },
      this.appContainer,
    );

    await this.handleSyncOrAsync(this.configureServices());

    const sortedMiddlewarePipeline = (this.Middleware as Middleware).getMiddlewarePipeline();
    const pipeline = sortedMiddlewarePipeline.map((entry) => entry.middleware);

    this.middlewares.push(...(pipeline as Array<ExpressHandler>));

    /* Apply the status code to the response */
    this.middlewares.unshift(new HttpStatusCodeMiddleware(this.globalPrefix) as ExpressoMiddleware);

    const expressServer = new InversifyExpressServer(
      this.appContainer.Container,
      null,
      { rootPath: this.globalPrefix as string },
      tempApp, // Pass tempApp to use the same Express app where studio middleware is registered
    );

    // Pass ContentNegotiationService to InversifyExpressServer if available
    const contentNegotiationService = (
      this.Middleware as Middleware
    ).getContentNegotiationService();
    if (contentNegotiationService) {
      expressServer.setContentNegotiationService(contentNegotiationService);
    }

    // Pass ValidationService to InversifyExpressServer if validation is configured
    const validationConfig = (this.Middleware as Middleware).getValidationConfig?.();
    if (validationConfig) {
      // `.js` extension required by NodeNext for ESM consumers; the
      // CJS build accepts it unchanged.
      const { ValidationService } = await import("./express-utils/validation-service.js");
      const { ClassValidatorAdapter } = await import("@expressots/core");

      const validationService = new ValidationService();
      validationService.enable(validationConfig);

      // Register ClassValidatorAdapter by default
      const classValidatorAdapter = new ClassValidatorAdapter();
      validationService.getRegistry().register(classValidatorAdapter);

      // Register any additional adapters from config
      if (validationConfig.adapters) {
        for (const AdapterClass of validationConfig.adapters) {
          const adapter = new AdapterClass();
          validationService.getRegistry().register(adapter);
        }
      }

      expressServer.setValidationService(validationService);
    }

    expressServer.setConfig((app: express.Application) => {
      this.configureMiddleware(app, this.middlewares);
    });

    expressServer.setErrorConfig((app: express.Application) => {
      if (this.Middleware.getErrorHandler()) {
        app.use(this.Middleware.getErrorHandler() as express.ErrorRequestHandler);
      }
    });

    this.app = expressServer.build();
    return this;
  }

  /**
   * Start listening on the given port and environment.
   * @param port - The port number to listen on.
   * @param appInfo - Optional message to display the app name and version.
   * @public API
   */
  public async listen(port: number | string, appInfo?: IConsoleMessage): Promise<IWebServerPublic> {
    // Capture wall-clock start so we can report total boot duration to the
    // Studio Status page once `app.listen()` resolves with the actual port.
    const listenStartedAt = Date.now();
    // Close existing server instance if it exists
    if (this.serverInstance) {
      this.logger.warn(
        "Closing existing server instance before starting new one",
        "adapter-express",
      );
      await this.closeExistingServer();

      this.logger.info("✓ Application reloaded", "adapter-express");
    }

    // Remove old signal handlers to prevent duplicates
    this.removeShutdownHandlers();

    // Reset shutdown flag
    this.isShuttingDown = false;

    // Resolve banner configuration with environment-specific overrides
    const resolvedBannerConfig = resolveBannerConfig(
      this.bannerConfig,
      this.environment || "development",
    );

    // Initialize banner generator with resolved config
    this.bannerGenerator = new BannerGenerator(resolvedBannerConfig);

    this.environment = this.environment || "development";
    this.port = typeof port === "string" ? parseInt(port, 10) : port;

    try {
      await this.init();
      await this.configEngine();

      this.app.set("env", this.environment);

      // Stop buffering and restore normal output (but don't flush yet)
      AppExpress.stopBuffering();

      // Flush all buffered logs that were captured during initialization
      AppExpress.flushBufferedLogs();
    } catch (error) {
      // Ensure buffering is stopped and logs are flushed even on error
      AppExpress.stopBuffering();
      AppExpress.flushBufferedLogs();
      throw error;
    }

    // Ensure port is available (handles hot-reload scenarios)
    // This will kill the previous process if needed - safest approach for dev experience
    const portAvailable = await this.ensurePortAvailable(this.port);
    if (!portAvailable) {
      const errorMessage = `Port ${this.port} is still in use and could not be freed`;
      this.logger.error(errorMessage, "adapter-express");
      this.logger.info("💡 Try manually killing the process:", "adapter-express");
      this.logger.info(
        process.platform === "win32"
          ? `   netstat -ano | findstr :${this.port} && taskkill /F /PID <pid>`
          : `   lsof -ti:${this.port} | xargs kill -9`,
        "adapter-express",
      );
      throw new Error(errorMessage);
    }

    return new Promise<IWebServerPublic>((resolve, reject) => {
      this.serverInstance = this.app.listen(this.port, async () => {
        // Track all connections for graceful shutdown
        // This enables force-closing connections during hot-reload
        this.serverInstance!.on("connection", (socket) => {
          this.trackConnection(socket);
        });

        // Update port with actual assigned port (important for port 0 auto-assign)
        this.port = (this.serverInstance?.address() as AddressInfo)?.port || this.port;

        // Display startup banner AFTER server starts (so we have the correct port)
        this.displayStartupBanner(appInfo);

        // Push live runtime details to the Studio Agent so the Status
        // page swaps "—" for real values. We forward the same numbers
        // `MetricsCollector` produced for the CLI banner (providers,
        // interceptors, middleware) — they come from DI metadata at
        // runtime and include framework-registered items that the
        // agent's static file scan can't see. We also forward the
        // *names* of those items so the Studio drill-down can list
        // them. No-op when Studio is disabled or when the installed
        // agent is too old to support it.
        reportStudioRuntimeInfo({
          appPort: this.port,
          globalPrefix: this.globalPrefix,
          startupMs: Date.now() - listenStartedAt,
          providerCount: this.lastApplicationMetrics?.providers,
          interceptorCount: this.lastApplicationMetrics?.interceptors,
          middlewareCount: this.lastApplicationMetrics?.middleware,
          runtimeItems: this.collectStudioRuntimeItems(),
          middlewarePreset: this.collectMiddlewarePresetInfo(),
        });

        // Re-scan routes now that `InversifyExpressServer.build()` has
        // populated the Express `_router` stack. The agent's first scan
        // happens before controllers are bound (Studio middleware ships
        // ahead of route registration so it can capture every request),
        // so without this rescan newly-added or never-bound controllers
        // never appear in the Studio Routes / Architecture views.
        // Fire-and-forget; the Studio Agent broadcasts the result over WS.
        void rescanStudioRoutes();

        // Re-capture the DI container snapshot now that all bindings are
        // registered (configureServices + InversifyExpressServer.build).
        // The initial capture runs before configureServices(), so any
        // late-registered bindings would otherwise be missing.
        refreshStudioContainer();

        // Setup signal handlers for graceful shutdown
        // Supported signals:
        // - SIGTERM: Standard termination (Kubernetes, Docker, process managers)
        // - SIGINT: User interrupt (Ctrl+C)
        // - SIGHUP: Terminal hangup
        // - SIGQUIT: Quit with core dump request
        // - SIGBREAK: Windows break signal (Ctrl+Break)
        // - SIGUSR2: Used by nodemon for restart (not on Windows)
        const shutdownSignals: Array<NodeJS.Signals> = [
          "SIGTERM",
          "SIGINT",
          "SIGHUP",
          "SIGQUIT",
          "SIGBREAK",
          ...(process.platform !== "win32" ? (["SIGUSR2"] as Array<NodeJS.Signals>) : []),
        ];

        for (const signal of shutdownSignals) {
          // Skip if handler already registered (prevents duplicates)
          if (this.shutdownHandlers.has(signal)) {
            continue;
          }

          const handler = (): void => {
            // Prevent multiple shutdown attempts
            if (this.isShuttingDown) {
              return;
            }
            this.isShuttingDown = true;

            // Emit the shutdown notice through the framework Logger so it
            // matches the standard "[ExpressoTS] … INFO [context] …" output.
            // The leading newline keeps it off the terminal's "^C" echo line.
            process.stdout.write("\n");
            this.logger.info(
              `Signal ${signal} received, initiating graceful shutdown...`,
              "adapter-express",
            );

            // Hard overall cap on the graceful shutdown. `handleExit` chains
            // several `await`s — Studio agent stop, lifecycle shutdown
            // hooks, the user's `serverShutdown`, and finally
            // `serverInstance.close`. If any of those hang (an unresponsive
            // OpenTelemetry exporter, a pending DB transaction, a slow
            // user hook, an HTTP keep-alive socket the OS hasn't reaped
            // yet), the host process otherwise sits in
            // "📡 Signal SIGINT received, initiating graceful shutdown…"
            // for minutes. Capping the whole pipeline keeps the developer
            // ergonomics tight (Ctrl+C is interactive — they want their
            // prompt back now) while still allowing fast hooks to run to
            // completion.
            //
            // We expose the cap so apps with legitimately long drains
            // (e.g. flushing a 50k-message queue) can opt into a longer
            // timeout via `setShutdownTimeout`.
            const overallCap = this.shutdownTimeout + 3000;
            let forced = false;
            const overallTimer = setTimeout(() => {
              forced = true;
              console.warn(
                `⚠️  Graceful shutdown exceeded ${overallCap}ms; ` +
                  `force-exiting. If this happens routinely, raise ` +
                  `\`setShutdownTimeout\` or audit your IShutdown hooks.`,
              );
              this.destroyAllConnections();
              process.exit(0);
            }, overallCap);
            // Don't let the watchdog timer keep the event loop alive on
            // its own; if everything else releases the loop it's fine
            // for `process.exit(0)` to fire from `handleExit` cleanly.
            overallTimer.unref();

            this.handleExit(signal)
              .then(() => {
                if (forced) return;
                clearTimeout(overallTimer);
                this.logger.info("Graceful shutdown completed", "adapter-express");
                // Flush stdout before exiting. Writing an empty chunk with a
                // callback guarantees the log line above is fully drained to
                // the terminal (the callback only fires after prior queued
                // writes complete), so the message can't appear after the
                // shell has already redrawn its prompt.
                process.stdout.write("", () => {
                  process.exit(0);
                });
              })
              .catch((error) => {
                if (forced) return;
                clearTimeout(overallTimer);
                this.logger.error(`Error during shutdown: ${error.message}`, "adapter-express");
                process.stderr.write("", () => {
                  process.exit(1);
                });
              });
          };

          // Store handler for later removal and register it
          this.shutdownHandlers.set(signal, handler);
          process.on(signal, handler);
        }

        // Setup exit handler to force-close connections immediately
        // This is a last-resort handler for when signals don't arrive or complete in time
        // (e.g., during hot-reload when the process is killed quickly)
        const exitHandler = (): void => {
          if (this.serverInstance) {
            // Synchronously destroy all connections - this is our last chance
            this.destroyAllConnections();
            // Try to close the server synchronously (won't block but releases the port faster)
            try {
              this.serverInstance.close();
            } catch {
              // Ignore errors during exit
            }
          }
        };

        // Register exit handler (only once)
        if (!this.shutdownHandlers.has("exit" as NodeJS.Signals)) {
          this.shutdownHandlers.set("exit" as NodeJS.Signals, exitHandler);
          process.once("exit", exitHandler);
        }

        try {
          // Call user's postServerInitialization hook
          await this.handleSyncOrAsync(this.postServerInitialization());

          // Execute bootstrap lifecycle hooks on all IBootstrap providers
          if (this.lifecycleRegistry) {
            await this.lifecycleRegistry.executeBootstrap();
          }

          resolve(this as IWebServerPublic);
        } catch (error) {
          this.logger.error(`Error during post-server initialization: ${error}`, "adapter-express");
          reject(error);
        }
      });
      this.serverInstance?.on("error", (error: NodeJS.ErrnoException) => {
        // Handle EADDRINUSE error with helpful suggestions
        if (error.code === "EADDRINUSE") {
          const port = this.port;
          const errorMessage = `Port ${port} is already in use`;
          const suggestions = [
            `Try a different port: Set PORT environment variable to another value`,
            `Find and stop the process using port ${port}`,
            process.platform === "win32"
              ? `On Windows: netstat -ano | findstr :${port}`
              : `On Linux/Mac: lsof -ti:${port} | xargs kill`,
          ];

          this.logger.error(errorMessage, "adapter-express");
          this.logger.info("💡 Suggestions:", "adapter-express");
          suggestions.forEach((suggestion) => {
            this.logger.info(`   • ${suggestion}`, "adapter-express");
          });

          reject(new Error(`${errorMessage}. ${suggestions[0]}`));
        } else {
          this.logger.error(`Error starting server: ${error.message}`, "adapter-express");
          reject(error);
        }
      });
    });
  }

  /**
   * Close existing server instance if it exists.
   * @private
   */
  private async closeExistingServer(): Promise<void> {
    if (this.serverInstance) {
      return new Promise<void>((resolve) => {
        this.serverInstance!.close(() => {
          this.serverInstance = null;
          resolve();
        });
        // Force close after timeout
        setTimeout(() => {
          if (this.serverInstance) {
            this.serverInstance = null;
            resolve();
          }
        }, 1000);
      });
    }
  }

  /**
   * Wait for a specified duration.
   * @private
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Kill the process using a specific port.
   * @private
   */
  private async killProcessOnPort(port: number): Promise<boolean> {
    const execAsync = promisify(exec);

    try {
      if (process.platform === "win32") {
        // Windows: Find PID using netstat and kill it
        const { stdout } = await execAsync(`netstat -ano | findstr :${port} | findstr LISTENING`);
        const lines = stdout.trim().split("\n");

        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];

          if (pid && pid !== String(process.pid) && /^\d+$/.test(pid)) {
            try {
              await execAsync(`taskkill /F /PID ${pid}`);
              return true;
            } catch {
              // Process might have already exited
            }
          }
        }
      } else {
        // Linux/Mac: Use lsof to find PID and kill it
        try {
          const { stdout } = await execAsync(`lsof -ti:${port}`);
          const pids = stdout.trim().split("\n").filter(Boolean);

          for (const pid of pids) {
            if (pid !== String(process.pid)) {
              try {
                await execAsync(`kill -9 ${pid}`);
                return true;
              } catch {
                // Process might have already exited
              }
            }
          }
        } catch {
          // No process found on port
        }
      }
    } catch {
      // Command failed - port might already be free
    }

    return false;
  }

  /**
   * Check if the port is available by attempting to bind to it.
   * @private
   */
  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const testServer = net.createServer();

      testServer.once("error", () => {
        resolve(false);
      });

      testServer.once("listening", () => {
        testServer.close(() => {
          resolve(true);
        });
      });

      testServer.listen(port);
    });
  }

  /**
   * Ensure the port is available, killing the existing process if needed.
   * This is the safest approach for hot-reload scenarios.
   * @private
   */
  private async ensurePortAvailable(port: number): Promise<boolean> {
    // First, check if port is already available
    if (await this.isPortAvailable(port)) {
      return true;
    }

    // Try to kill the process on the port
    let killed = await this.killProcessOnPort(port);

    if (killed) {
      // Wait a moment for the port to be released
      await this.delay(500);
    }

    // Retry multiple times to check if port is now available
    // Hot reload scenarios may need more time for the old process to shut down
    for (let attempt = 1; attempt <= this.portRetryAttempts; attempt++) {
      if (await this.isPortAvailable(port)) {
        return true;
      }

      // Try to kill again if still not available (process might be slow to release)
      if (attempt % 3 === 0) {
        killed = await this.killProcessOnPort(port);
        if (killed) {
          await this.delay(300);
        }
      }

      if (attempt < this.portRetryAttempts) {
        await this.delay(this.portRetryDelay);
      }
    }

    return false;
  }

  /**
   * Remove existing shutdown signal handlers to prevent duplicates.
   * @private
   */
  private removeShutdownHandlers(): void {
    this.shutdownHandlers.forEach((handler, signal) => {
      // Handle "exit" event specially (it's not a signal but we track it the same way)
      if (signal === ("exit" as NodeJS.Signals)) {
        process.removeListener("exit", handler);
      } else {
        process.removeListener(signal, handler);
      }
    });
    this.shutdownHandlers.clear();
    // Also clear any tracked connections from previous runs
    this.activeConnections.clear();
  }

  /**
   * Sets the global route prefix for the application.
   * @method setGlobalRoutePrefix
   * @param {string} prefix - The prefix to use for all routes.
   * @public API
   */
  public async setGlobalRoutePrefix(prefix: string): Promise<void> {
    this.globalPrefix = prefix;
  }

  /**
   * Configures the application's view engine based on the provided configuration options.
   */
  private async configEngine(): Promise<void> {
    if (this.renderOptions.engine) {
      switch (this.renderOptions.engine) {
        case RenderEngine.Engine.HBS:
          await setEngineHandlebars(
            this.app,
            this.renderOptions.options as RenderEngine.HandlebarsOptions,
          );
          break;
        case RenderEngine.Engine.EJS:
          await setEngineEjs(this.app, this.renderOptions.options as RenderEngine.EjsOptions);
          break;
        case RenderEngine.Engine.PUG:
          await setEnginePug(this.app, this.renderOptions.options as RenderEngine.PugOptions);
          break;
        default:
          throw new Error("Unsupported engine type!");
      }
    }
  }

  /**
   * Configures the application's view engine based on the provided configuration options.
   * @method setEngine
   * @template T - A generic type extending from RenderTemplateOptions.
   *
   * @param {Engine} engine - The view engine to set
   * @param {EngineOptions} [options] - The configuration options for the view engine
   * @public API
   */
  /**
   * Configure the startup banner display.
   * Can be called in configureServices() or globalConfiguration().
   *
   * @param config - Banner configuration options
   * @example
   * ```typescript
   * export class App extends AppExpress {
   *   configureServices(): void {
   *     this.setBanner({
   *       style: "full",
   *       showMetrics: true,
   *       showFeatures: true,
   *       showConfig: true,
   *       showPerformance: true,
   *       showResources: true,
   *       // Environment-specific overrides
   *       environment: {
   *         production: {
   *           style: "compact",
   *           showConfig: false,
   *           showResources: false,
   *         },
   *       },
   *     });
   *   }
   * }
   * ```
   * @public API
   */
  public setBanner(config: BannerConfig): void {
    this.bannerConfig = config;
  }

  /**
   * Configure ExpressoTS Studio integration.
   * When enabled and @expressots/studio-agent is installed, automatically
   * instruments the application for request recording and real-time monitoring.
   *
   * By default, Studio is auto-enabled in development if the package is installed.
   * Use this method to customize behavior or enable in production.
   *
   * @param config - Studio configuration options
   * @example
   * ```typescript
   * export class App extends AppExpress {
   *   configureServices(): void {
   *     this.setStudio({
   *       enabled: true,    // Force enable (default: auto in dev)
   *       port: 3334,       // WebSocket port for UI connection
   *       serviceName: 'my-app', // Service name for tracing
   *     });
   *   }
   * }
   * ```
   * @public API
   */
  public setStudio(config: {
    enabled?: boolean;
    port?: number;
    dbPath?: string;
    serviceName?: string;
  }): void {
    this.studioConfig = config;
  }

  /**
   * Check if ExpressoTS Studio is currently enabled.
   * @returns Boolean indicating if Studio Agent is running.
   * @public API
   */
  public isStudioEnabled(): boolean {
    return isStudioEnabled();
  }

  /**
   * Configure a view engine for server-side rendering.
   *
   * @deprecated Use `this.Middleware.render()` instead. Will be removed in v5.0.0.
   *
   * @example Migration
   * ```typescript
   * // Before (deprecated)
   * this.setEngine(RenderEngine.Engine.EJS, { viewsDir: 'views' });
   *
   * // After (recommended)
   * this.Middleware.render({ engine: 'ejs', viewsDir: 'views' });
   *
   * // Or with auto-detection
   * this.Middleware.render();
   * ```
   *
   * @param engine - The view engine to set
   * @param options - The configuration options for the view engine
   * @public API
   */
  public async setEngine<T extends RenderEngine.EngineOptions>(
    engine: RenderEngine.Engine,
    options?: T,
  ): Promise<void> {
    this.logger.warn(
      "setEngine() is deprecated. Use this.Middleware.render() instead. Will be removed in v5.0.0.",
      "adapter-express",
    );

    try {
      // Bridge to new render system
      const engineMap: Record<string, string> = {
        ejs: "ejs",
        pug: "pug",
        hbs: "hbs",
      };

      const engineName = engineMap[engine] || engine;

      // Try to use the new render system
      await (this.Middleware as Middleware).render({
        engine: engineName as "ejs" | "pug" | "hbs",
        viewsDir: options?.viewsDir,
        partialsDir: (options as RenderEngine.HandlebarsOptions)?.partialsDir,
      });
    } catch {
      // Fallback to old system if new system fails
      if (options) {
        this.renderOptions = { engine, options };
      } else {
        this.renderOptions = { engine };
      }
    }
  }

  /**
   * Verifies if the current environment is development.
   * @returns A boolean value indicating whether the current environment is development or not.
   * @public API
   */
  public async isDevelopment(): Promise<boolean> {
    // Check Express app environment first (most reliable)
    if (this.app) {
      return this.app.get("env") === "development";
    }

    // Fallback to this.environment (set by bootstrap())
    if (this.environment) {
      return this.environment === "development";
    }

    // Fallback to process.env.NODE_ENV
    if (process.env.NODE_ENV) {
      return process.env.NODE_ENV === "development";
    }

    // Default to false if nothing is set
    return false;
  }

  /**
   * Get the underlying HTTP server. (default: Express.js)
   * @returns The underlying HTTP server after initialization.
   * @public API
   */
  public async getHttpServer(): Promise<HTTPServer> {
    if (!this.serverInstance) {
      this.logger.error("Server instance not initialized yet", "adapter-express");
      throw new Error("Server instance not initialized yet");
    }

    return Promise.resolve(this.serverInstance);
  }

  /**
   * Get the port the server is listening on.
   * Useful for dynamic port assignment (port: 0) in testing scenarios.
   * @returns The actual port number the server is bound to.
   * @public API
   */
  public async getPort(): Promise<number> {
    if (!this.serverInstance) {
      this.logger.error("Server instance not initialized yet", "adapter-express");
      throw new Error("Server instance not initialized yet");
    }

    const address = this.serverInstance.address();
    if (address && typeof address === "object" && "port" in address) {
      return Promise.resolve(address.port);
    }

    throw new Error("Unable to determine server port");
  }

  /**
   * Detect API versions from @Version() decorators on controllers.
   * @returns Array of unique API versions (e.g., ["v1", "v2"])
   * @private
   */
  private detectApiVersions(): Array<string> {
    try {
      const controllers = getControllersFromMetadata();
      const versions = new Set<string>();

      controllers.forEach((controllerTarget) => {
        // Cast DecoratorTarget to NewableFunction for metadata access
        const controllerConstructor = controllerTarget as unknown as NewableFunction;

        // Check controller-level version
        const controllerMetadata = getControllerMetadata(controllerConstructor);
        if (controllerMetadata?.version) {
          const version = String(controllerMetadata.version);
          // Normalize version format (ensure "v" prefix)
          const normalizedVersion = version.startsWith("v") ? version : `v${version}`;
          versions.add(normalizedVersion);
        }

        // Check method-level versions
        const methodMetadata = getControllerMethodMetadata(controllerConstructor);
        if (methodMetadata) {
          methodMetadata.forEach((method) => {
            if (method.version) {
              const version = String(method.version);
              const normalizedVersion = version.startsWith("v") ? version : `v${version}`;
              versions.add(normalizedVersion);
            }
          });
        }
      });

      return Array.from(versions).sort();
    } catch (error) {
      // If metadata not available, return empty array
      return [];
    }
  }

  /**
   * Harvest provider + interceptor *names* from DI metadata so the
   * Studio Status page can drill down into the items behind the
   * "Providers" / "Interceptors" counters.
   *
   * Reads the same metadata that {@link MetricsCollector} uses for the
   * CLI banner — so what shows up here is the source of truth, not the
   * agent's static file scan (which can't see framework-registered
   * items like `Logger` or `LifecycleRegistry`).
   *
   * Returns `undefined` instead of an empty object so {@link
   * reportStudioRuntimeInfo} can skip forwarding when nothing was
   * harvested (keeps the WS payload small).
   */
  private collectStudioRuntimeItems():
    | {
        providers: Array<{ name: string; source: string }>;
        interceptors: Array<{
          name: string;
          priority?: number;
          source: string;
        }>;
        middleware?: Array<{
          name: string;
          category: string;
          type: "built-in" | "custom";
          order: number;
          path?: string;
        }>;
        middlewareBindings?: Array<{
          middlewareName: string;
          scope: "controller" | "route";
          controllerName: string;
          controllerMethod?: string;
          httpMethod?: string;
          routePath?: string;
        }>;
        routeSchemas?: Array<{
          controllerName: string;
          controllerMethod?: string;
          httpMethod?: string;
          routePath?: string;
          bodyDto?: string;
          bodySample?: Record<string, unknown>;
          bodySchema?: Record<string, unknown>;
        }>;
      }
    | undefined {
    try {
      const providerMetadata =
        (Reflect.getMetadata(PROVIDE_METADATA_KEY, Reflect) as
          Array<{ implementationType?: { name?: string } }> | undefined) || [];

      const providers: Array<{ name: string; source: string }> = [];
      for (const entry of providerMetadata) {
        const name = entry?.implementationType?.name;
        if (typeof name === "string" && name.length > 0) {
          providers.push({ name, source: "provide" });
        }
      }

      const interceptorMetadata =
        (Reflect.getMetadata(INTERCEPTOR_METADATA_KEY.interceptor, Reflect) as
          Array<{ interceptor?: { name?: string }; priority?: number }> | undefined) || [];

      const interceptors: Array<{
        name: string;
        priority?: number;
        source: string;
      }> = [];
      for (const entry of interceptorMetadata) {
        const name = entry?.interceptor?.name;
        if (typeof name === "string" && name.length > 0) {
          interceptors.push({
            name,
            priority: entry?.priority,
            source: "metadata",
          });
        }
      }

      const middleware = this.collectMiddlewarePipelineItems();
      const middlewareBindings = this.collectMiddlewareBindings();
      const routeSchemas = this.collectRouteSchemas();

      if (
        providers.length === 0 &&
        interceptors.length === 0 &&
        !middleware &&
        !middlewareBindings &&
        !routeSchemas
      ) {
        return undefined;
      }

      return { providers, interceptors, middleware, middlewareBindings, routeSchemas };
    } catch {
      return undefined;
    }
  }

  /**
   * Harvest controller- and route-scoped middleware bindings from
   * Reflect metadata. Each entry describes a single edge the Studio
   * architecture map should draw, e.g. "AuthMiddleware → UserController
   * (route POST /users/:id)".
   *
   * The middleware values stored on `ControllerMetadata.middleware` are
   * a polymorphic union (class, function, registered name, conditional
   * config, …). We normalise each to a display name; entries we can't
   * name (anonymous arrow functions, plain object configs without a
   * `name` field) are omitted. The agent's static scan picks up the
   * remaining named cases via decorator parsing — between the two
   * sources Studio sees a complete graph for the common patterns.
   */
  private collectMiddlewareBindings():
    | Array<{
        middlewareName: string;
        scope: "controller" | "route";
        controllerName: string;
        controllerMethod?: string;
        httpMethod?: string;
        routePath?: string;
      }>
    | undefined {
    try {
      const controllers = getControllersFromMetadata();
      if (!controllers || controllers.length === 0) return undefined;

      const out: Array<{
        middlewareName: string;
        scope: "controller" | "route";
        controllerName: string;
        controllerMethod?: string;
        httpMethod?: string;
        routePath?: string;
      }> = [];

      const nameOf = (value: unknown): string | null => {
        if (value == null) return null;
        if (typeof value === "string") return value;
        if (typeof value === "symbol") {
          const desc = value.description;
          return desc && desc.length > 0 ? desc : null;
        }
        if (typeof value === "function") {
          const fnName = (value as { name?: string }).name;
          return typeof fnName === "string" && fnName.length > 0 ? fnName : null;
        }
        if (typeof value === "object") {
          const candidate = (value as { name?: unknown }).name;
          if (typeof candidate === "string" && candidate.length > 0) {
            return candidate;
          }
          const ctorName = (value as { constructor?: { name?: string } }).constructor?.name;
          if (typeof ctorName === "string" && ctorName.length > 0 && ctorName !== "Object") {
            return ctorName;
          }
        }
        return null;
      };

      for (const controllerTarget of controllers) {
        const controllerCtor = controllerTarget as unknown as NewableFunction;
        const controllerName = (controllerCtor as { name?: string }).name;
        if (typeof controllerName !== "string" || controllerName.length === 0) {
          continue;
        }

        const ctrlMeta = getControllerMetadata(controllerCtor);
        if (ctrlMeta?.middleware && Array.isArray(ctrlMeta.middleware)) {
          for (const mw of ctrlMeta.middleware) {
            const middlewareName = nameOf(mw);
            if (!middlewareName) continue;
            out.push({
              middlewareName,
              scope: "controller",
              controllerName,
            });
          }
        }

        const methodMeta = getControllerMethodMetadata(controllerCtor);
        if (Array.isArray(methodMeta)) {
          const basePath = ctrlMeta?.path ?? "";
          for (const route of methodMeta) {
            if (!route?.middleware || !Array.isArray(route.middleware)) continue;
            const httpMethod =
              typeof route.method === "string" ? route.method.toUpperCase() : undefined;
            const fullPath = this.joinRoutePath(basePath, route.path);
            for (const mw of route.middleware) {
              const middlewareName = nameOf(mw);
              if (!middlewareName) continue;
              out.push({
                middlewareName,
                scope: "route",
                controllerName,
                controllerMethod: typeof route.key === "string" ? route.key : undefined,
                httpMethod,
                routePath: fullPath,
              });
            }
          }
        }
      }

      return out.length > 0 ? out : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Harvest per-route request-body schemas from runtime validation
   * metadata. The validated decorators (`@body(Schema)`, `@validatedBody`,
   * `@Validate`) store the actual schema object under
   * `METADATA_KEY.validationSchema`; this is the only place a Zod /
   * class-validator / Yup schema exists at all (the Studio agent's static
   * source scanner can't read it). For each body-source schema we convert
   * to JSON Schema via the framework's `schemaToJsonSchema()` and derive a
   * sample body, forwarding both to the agent so the API client's auto-fill
   * works for schematised DTOs, not just plain typed `@body()` params.
   */
  private collectRouteSchemas():
    | Array<{
        controllerName: string;
        controllerMethod?: string;
        httpMethod?: string;
        routePath?: string;
        bodyDto?: string;
        bodySample?: Record<string, unknown>;
        bodySchema?: Record<string, unknown>;
      }>
    | undefined {
    try {
      const controllers = getControllersFromMetadata();
      if (!controllers || controllers.length === 0) return undefined;

      const out: Array<{
        controllerName: string;
        controllerMethod?: string;
        httpMethod?: string;
        routePath?: string;
        bodyDto?: string;
        bodySample?: Record<string, unknown>;
        bodySchema?: Record<string, unknown>;
      }> = [];

      for (const controllerTarget of controllers) {
        const controllerCtor = controllerTarget as unknown as NewableFunction;
        const controllerName = (controllerCtor as { name?: string }).name;
        if (typeof controllerName !== "string" || controllerName.length === 0) {
          continue;
        }

        const ctrlMeta = getControllerMetadata(controllerCtor);
        const basePath = ctrlMeta?.path ?? "";
        const methodMeta = getControllerMethodMetadata(controllerCtor);
        if (!Array.isArray(methodMeta)) continue;

        for (const route of methodMeta) {
          const methodKey = typeof route.key === "string" ? route.key : undefined;
          if (!methodKey) continue;

          const validation = getValidationMetadata(controllerCtor, methodKey);
          if (!Array.isArray(validation) || validation.length === 0) continue;

          // Whole-body schema only (a `paramName` means a single sub-field
          // was validated, not the request body shape).
          const bodyEntry = validation.find(
            (v) => v?.source === "body" && !v?.paramName && v?.schema,
          );
          if (!bodyEntry?.schema) continue;

          const bodySchema = schemaToJsonSchema(bodyEntry.schema) ?? undefined;
          if (!bodySchema) continue;

          const sample = this.jsonSchemaToSample(bodySchema);
          const bodySample =
            sample && typeof sample === "object" && !Array.isArray(sample)
              ? (sample as Record<string, unknown>)
              : undefined;

          out.push({
            controllerName,
            controllerMethod: methodKey,
            httpMethod: typeof route.method === "string" ? route.method.toUpperCase() : undefined,
            routePath: this.joinRoutePath(basePath, route.path),
            bodyDto: this.schemaDisplayName(bodyEntry.schema),
            bodySample,
            bodySchema,
          });
        }
      }

      return out.length > 0 ? out : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Best-effort display name for a validation schema. Class-based schemas
   * (class-validator DTOs) carry a constructor name; structural schemas
   * (Zod objects) don't, so we return `undefined` and let the sample/schema
   * speak for itself.
   */
  private schemaDisplayName(schema: unknown): string | undefined {
    if (typeof schema === "function") {
      const name = (schema as { name?: string }).name;
      return typeof name === "string" && name.length > 0 ? name : undefined;
    }
    return undefined;
  }

  /**
   * Derive a representative sample value from a JSON Schema. Depth-limited
   * so recursive/huge schemas can't blow the stack, and falls back to
   * `null` for shapes it can't interpret (keeps the emitted JSON parseable).
   */
  private jsonSchemaToSample(schema: Record<string, unknown>, depth = 0): unknown {
    if (!schema || typeof schema !== "object") return null;
    if (depth > 4) return null;

    const enumVals = (schema as { enum?: Array<unknown> }).enum;
    if (Array.isArray(enumVals) && enumVals.length > 0) return enumVals[0];
    if ("const" in schema) return (schema as { const?: unknown }).const;
    if ("default" in schema) return (schema as { default?: unknown }).default;

    const rawType = (schema as { type?: unknown }).type;
    const type = Array.isArray(rawType) ? rawType[0] : rawType;

    switch (type) {
      case "object": {
        const props = (
          schema as {
            properties?: Record<string, Record<string, unknown>>;
          }
        ).properties;
        const out: Record<string, unknown> = {};
        if (props) {
          for (const [key, propSchema] of Object.entries(props)) {
            out[key] = this.jsonSchemaToSample(propSchema, depth + 1);
          }
        }
        return out;
      }
      case "array": {
        const items = (schema as { items?: Record<string, unknown> }).items;
        if (items && depth < 3) return [this.jsonSchemaToSample(items, depth + 1)];
        return [];
      }
      case "string": {
        const format = (schema as { format?: string }).format;
        if (format === "email") return "user@example.com";
        if (format === "uri" || format === "url") return "https://example.com";
        if (format === "uuid") return "00000000-0000-0000-0000-000000000000";
        if (format === "date-time") return new Date(0).toISOString();
        return "";
      }
      case "integer":
      case "number":
        return 0;
      case "boolean":
        return false;
      case "null":
        return null;
      default: {
        // Composed schemas (allOf/anyOf/oneOf) — sample the first variant.
        for (const key of ["allOf", "anyOf", "oneOf"] as const) {
          const variants = (schema as Record<string, unknown>)[key];
          if (Array.isArray(variants) && variants.length > 0) {
            return this.jsonSchemaToSample(variants[0] as Record<string, unknown>, depth + 1);
          }
        }
        return null;
      }
    }
  }

  /**
   * Combine a controller's base path with a route path, normalising
   * leading/trailing slashes. Mirrors the simpler logic Studio uses to
   * build `RouteInfo.path` so the bindings line up with route entries.
   */
  private joinRoutePath(basePath: string, routePath: string | undefined): string {
    const base = basePath?.startsWith("/") ? basePath : `/${basePath ?? ""}`;
    if (!routePath || routePath === "/" || routePath === "") return base || "/";
    const tail = routePath.startsWith("/") ? routePath : `/${routePath}`;
    return (base + tail).replace(/\/+/g, "/");
  }

  /**
   * Collect the ordered middleware pipeline from the Middleware service
   * for forwarding to Studio. Uses feature-detection so older core
   * versions that lack `getPipelineInfo()` won't break.
   */
  private collectMiddlewarePipelineItems():
    | Array<{
        name: string;
        category: string;
        type: "built-in" | "custom";
        order: number;
        path?: string;
      }>
    | undefined {
    try {
      const mw = this.Middleware as Middleware;
      const getPipelineInfo = (
        mw as unknown as {
          getPipelineInfo?: () => {
            entries: Array<{
              name: string;
              category: string;
              type: "built-in" | "custom";
              order: number;
              path: string;
            }>;
          };
        }
      ).getPipelineInfo;

      if (typeof getPipelineInfo !== "function") return undefined;

      const info = getPipelineInfo.call(mw);
      if (!info || !info.entries || info.entries.length === 0) return undefined;

      return info.entries.map((e) => ({
        name: e.name,
        category: e.category,
        type: e.type,
        order: e.order,
        path: e.path !== "Global" ? e.path : undefined,
      }));
    } catch {
      return undefined;
    }
  }

  /**
   * Build the middleware preset info snapshot for Studio. Reads the
   * last applied preset from the Middleware service and transforms it
   * into the shape Studio expects.
   */
  private collectMiddlewarePresetInfo():
    | {
        name: string;
        hasOverrides: boolean;
        parse?: {
          json?: { limit?: string };
          urlencoded?: { limit?: string; extended?: boolean };
          cookies?: boolean;
        };
        security?: {
          tier?: string;
          helmet?: boolean;
          cors?: {
            origin?: boolean | string;
            credentials?: boolean;
            methods?: Array<string>;
            allowedHeaders?: Array<string>;
          };
          rateLimit?: { windowMs?: number; max?: number } | false;
        };
        compress?: { enabled: boolean; level?: number };
        logger?: { enabled: boolean; implementation?: string };
      }
    | undefined {
    try {
      const mw = this.Middleware as Middleware;
      const getPreset = (
        mw as unknown as {
          getLastAppliedPreset?: () => {
            name: string;
            hasOverrides: boolean;
            config: Record<string, unknown>;
          } | null;
        }
      ).getLastAppliedPreset;
      if (typeof getPreset !== "function") return undefined;

      const preset = getPreset.call(mw);
      if (!preset) return undefined;

      const cfg = preset.config as {
        parse?:
          | boolean
          | {
              json?: boolean | { limit?: string };
              urlencoded?: boolean | { limit?: string; extended?: boolean };
              cookies?: boolean | object;
            };
        security?:
          | string
          | {
              headers?: string | boolean | object;
              cors?:
                | boolean
                | {
                    origin?: boolean | string;
                    credentials?: boolean;
                    methods?: Array<string>;
                    allowedHeaders?: Array<string>;
                  };
              rateLimit?: boolean | { windowMs?: number; max?: number };
            };
        compress?: boolean | { level?: number; implementation?: string };
        logger?: boolean | { implementation?: string; disableInTest?: boolean };
      };

      const parse =
        cfg.parse && typeof cfg.parse === "object"
          ? {
              json:
                cfg.parse.json && typeof cfg.parse.json === "object"
                  ? { limit: cfg.parse.json.limit }
                  : undefined,
              urlencoded:
                cfg.parse.urlencoded && typeof cfg.parse.urlencoded === "object"
                  ? {
                      limit: cfg.parse.urlencoded.limit,
                      extended: cfg.parse.urlencoded.extended,
                    }
                  : undefined,
              cookies: !!cfg.parse.cookies,
            }
          : cfg.parse
            ? { json: { limit: "100kb" }, cookies: false }
            : undefined;

      let security:
        | {
            tier?: string;
            helmet?: boolean;
            cors?: {
              origin?: boolean | string;
              credentials?: boolean;
              methods?: Array<string>;
              allowedHeaders?: Array<string>;
            };
            rateLimit?: { windowMs?: number; max?: number } | false;
          }
        | undefined;

      if (typeof cfg.security === "string") {
        security = resolveSecurityTierForStudio(cfg.security);
      } else if (cfg.security && typeof cfg.security === "object") {
        const sec = cfg.security;
        security = {
          helmet: sec.headers !== false,
          cors:
            sec.cors && typeof sec.cors === "object"
              ? sec.cors
              : sec.cors !== false
                ? { origin: true }
                : undefined,
          rateLimit:
            sec.rateLimit && typeof sec.rateLimit === "object"
              ? sec.rateLimit
              : sec.rateLimit
                ? { windowMs: 60000, max: 100 }
                : false,
        };
      }

      const compress = cfg.compress
        ? {
            enabled: true,
            level: typeof cfg.compress === "object" ? cfg.compress.level : undefined,
          }
        : { enabled: false };

      const logger = cfg.logger
        ? {
            enabled: true,
            implementation: typeof cfg.logger === "object" ? cfg.logger.implementation : "auto",
          }
        : { enabled: false };

      return {
        name: preset.name,
        hasOverrides: preset.hasOverrides,
        parse,
        security,
        compress,
        logger,
      };
    } catch {
      return undefined;
    }
  }

  /**
   * Display middleware startup logs after the banner.
   *
   * Warnings (e.g. missing optional packages like `helmet`) are always surfaced
   * so the developer can act on them. Informational entries (e.g. "Security
   * configured", "Applied preset: api") are demoted to `debug` since the
   * dashboard already shows the active middleware count; set `LOG_LEVEL=DEBUG`
   * to see the full breakdown.
   * @private
   */
  private displayMiddlewareStartupLogs(): void {
    const isDev = this.environment === "development";
    if (!isDev) return;

    const startupLogs = (this.Middleware as Middleware).getStartupLogs();
    if (startupLogs.length === 0) return;

    startupLogs.forEach((log) => {
      if (log.type === "warn") {
        this.logger.warn(log.message, "middleware");
      } else {
        this.logger.withContext("middleware").debug(log.message);
      }
    });

    (this.Middleware as Middleware).clearStartupLogs();
  }

  /**
   * Display startup banner with application metrics.
   * @param appInfo - Application info
   * @private
   */
  private displayStartupBanner(appInfo?: IConsoleMessage): void {
    if (!this.bannerGenerator) {
      // Fallback to old console message if banner generator not initialized
      this.console.messageServer(this.port, this.environment || "development", appInfo);
      // Log CI detection after banner, before middleware logs
      this.displayCIDetectionLogs(appInfo);
      // Still display middleware startup logs even in fallback mode
      this.displayMiddlewareStartupLogs();
      return;
    }

    try {
      // Detect API versions from controllers (if not already provided)
      // Use type assertion since apiVersions might not be in the type definition yet
      type AppInfoWithVersions = IConsoleMessage & { apiVersions?: Array<string> };
      let finalAppInfo: AppInfoWithVersions | undefined = appInfo as AppInfoWithVersions;

      if (!finalAppInfo?.apiVersions || finalAppInfo.apiVersions.length === 0) {
        const apiVersions = this.detectApiVersions();
        if (apiVersions.length > 0) {
          finalAppInfo = {
            ...appInfo,
            appName: appInfo?.appName || "App",
            appVersion: appInfo?.appVersion || "not provided",
            apiVersions,
          };
        }
      }

      // Detect API versions from controllers
      const detectedApiVersions = finalAppInfo?.apiVersions || [];

      // Collect metrics. Cache the result on the instance so the Studio
      // integration can forward the *runtime* counts (providers /
      // interceptors / middleware) to the agent — those values come from
      // DI metadata and registries, which our static file scanner can't
      // see, so without this the Studio Status page would disagree with
      // the CLI banner.
      const { metrics, features } = MetricsCollector.collect(this.appContainer.Container, {
        getControllersFromMetadata: () => getControllersFromMetadata(),
        getControllersFromContainer: () =>
          getControllersFromContainer(this.appContainer.Container, false),
        getControllerMethodMetadata: (constructor: NewableFunction) =>
          getControllerMethodMetadata(constructor),
        getMiddlewareCount: () => (this.Middleware as Middleware).getMiddlewarePipeline().length,
        hasContentNegotiation: () =>
          !!(this.Middleware as Middleware).getContentNegotiationService(),
        hasSmartValidation: () => !!(this.Middleware as Middleware).getValidationConfig(),
        hasAuthorization: () => this.appContainer.Container.isBound("IGuardCache"),
        hasExceptionFilters: () => !!(this.Middleware as Middleware).getErrorHandler(),
        hasApiVersioning: () => detectedApiVersions.length > 0,
        hasGlobalRoutePrefix: () => !!this.globalPrefix && this.globalPrefix !== "/",
        hasErrorHandler: () => !!(this.Middleware as Middleware).getErrorHandler(),
        hasRequestLogging: () => {
          // Check if any request logging middleware is in the pipeline
          const pipeline = (this.Middleware as Middleware).getPipelineInfo();
          return pipeline.entries.some(
            (e) => e.category === "logging" || e.name.toLowerCase().includes("logging"),
          );
        },
      });

      // Persist the metrics so `reportStudioRuntimeInfo` (called from the
      // listen callback) can forward live provider/interceptor counts.
      this.lastApplicationMetrics = metrics;

      // Discover providers for introspection
      this.Provider.discover();

      // Get middleware and provider views for banner
      const middlewareView = (this.Middleware as Middleware).getFormattedView();
      const providerView = this.Provider.getFormattedView();

      // Prepare banner data with extended info
      const bannerData: BannerData = {
        appInfo: finalAppInfo,
        metrics,
        features,
        middlewareView,
        providerView,
      };

      // Display banner
      this.bannerGenerator.display(
        this.port,
        this.environment || "development",
        finalAppInfo,
        metrics,
        features,
        {
          Prefix: this.globalPrefix || "/",
          "Node Version": process.version,
          Platform: process.platform,
        },
        bannerData,
      );

      // Log CI detection after banner, before middleware logs
      this.displayCIDetectionLogs(appInfo);

      // Automatically display middleware startup logs after banner (transparent to user)
      this.displayMiddlewareStartupLogs();
    } catch (error) {
      // Fallback to old console message on error
      this.logger.warn(
        "Failed to display startup banner, using fallback",
        "adapter-express",
        error,
      );
      this.console.messageServer(this.port, this.environment || "development", appInfo);
      // Log CI detection after banner, before middleware logs
      this.displayCIDetectionLogs(appInfo);
      // Still display middleware startup logs even in fallback mode
      this.displayMiddlewareStartupLogs();
    }
  }

  /**
   * Display CI detection logs after the banner but before middleware logs.
   * @param appInfo - Application info containing CI detection data
   * @private
   */
  private displayCIDetectionLogs(appInfo?: IConsoleMessage): void {
    if (appInfo?.ciDetection?.detected) {
      this.logger.info(`🔍 CI environment detected: ${appInfo.ciDetection.platform}`, "bootstrap");
      this.logger.info(`✅ Skipping .env file loading (using process.env)`, "bootstrap");
    }
  }
}

/**
 * Resolve a named security tier string into the display-friendly shape
 * expected by the Studio Middleware card. Mirrors the defaults applied
 * by `Middleware.getSecurityPreset()` in `@expressots/core`.
 */
function resolveSecurityTierForStudio(tier: string): {
  tier: string;
  helmet: boolean;
  cors?: {
    origin?: boolean | string;
    credentials?: boolean;
    methods?: Array<string>;
    allowedHeaders?: Array<string>;
  };
  rateLimit?: { windowMs?: number; max?: number } | false;
} {
  switch (tier) {
    case "api":
      return {
        tier,
        helmet: true,
        cors: {
          origin: true,
          credentials: true,
          methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
          allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
        },
        rateLimit: { windowMs: 60000, max: 100 },
      };
    case "strict":
      return {
        tier,
        helmet: true,
        cors: { origin: false },
        rateLimit: { windowMs: 60000, max: 50 },
      };
    case "relaxed":
      return {
        tier,
        helmet: true,
        cors: { origin: true },
        rateLimit: false,
      };
    case "minimal":
      return {
        tier,
        helmet: false,
        rateLimit: false,
      };
    case "standard":
    default:
      return {
        tier,
        helmet: true,
        cors: { origin: true },
        rateLimit: false,
      };
  }
}
