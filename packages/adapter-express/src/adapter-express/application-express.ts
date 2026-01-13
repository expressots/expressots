import express from "express";
import { Server as HTTPServer } from "http";

// Note: We use the global `process` object directly instead of importing it
// because signal handlers (SIGTERM, SIGINT, etc.) don't work correctly when
// process is imported as an ES module in CommonJS compiled code.

import {
  AppContainer,
  Console,
  ExpressoMiddleware,
  IConsoleMessage,
  IMiddleware,
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
import { Env, IWebServerPublic, RenderEngine, Server } from "@expressots/shared";

import { interfaces } from "@expressots/core";
import { ExpressHandler, MiddlewareConfig } from "./application-express.types";
import { HttpStatusCodeMiddleware } from "./express-utils/http-status-middleware";
import { InversifyExpressServer } from "./express-utils/inversify-express-server";
import { setEngineEjs, setEngineHandlebars, setEnginePug } from "./render/engine";
import { AddressInfo } from "net";
import {
  getControllersFromMetadata,
  getControllersFromContainer,
  getControllerMethodMetadata,
  getControllerMetadata,
} from "./express-utils/utils";

/**
 * The AppExpress class provides methods for configuring and running an Express application.
 * @class AppExpress
 * @implements {IWebServer} - Interface for the WebServer application implementation.
 * @extends {ApplicationBase} - Base class for the application implementation that provides lifecycle hooks.
 * @method configure - Configures the InversifyJS container.
 * @method listen - Start listening on the given port and environment.
 * @method setGlobalRoutePrefix - Sets the global route prefix for the application.
 * @method setEngine - Configures the application's view engine based on the provided configuration options.
 * @method isDevelopment - Verifies if the current environment is development.
 */
export class AppExpress implements Server.IWebServer {
  private logger: Logger = new Logger();
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
  /** Track active connections for force-close during shutdown */
  private activeConnections: Set<import("net").Socket> = new Set();
  /** Timeout for force-closing connections during shutdown (ms) */
  private shutdownTimeout: number = 5000;
  /** Number of retries when port is in use (for hot-reload scenarios) */
  private portRetryAttempts: number = 10;
  /** Delay between port retry attempts (ms) */
  private portRetryDelay: number = 500;

  // Log buffering for banner-first display
  // IMPORTANT: All these properties must be declared BEFORE initBuffering!
  private static originalStdoutWrite: typeof process.stdout.write | null = null;
  private static originalStderrWrite: typeof process.stderr.write | null = null;
  private static logBuffer: Array<string> = [];
  private static isBuffering: boolean = false;
  private static bufferingInitialized: boolean = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static originalGlobalConsole: any = null;

  // Initialize buffering when AppExpress class is loaded (before any instances are created)
  // This ensures ALL logs are buffered from the very beginning for the full template.
  // The micro() function explicitly disables this buffering since it doesn't use the banner system.
  // This MUST be declared AFTER all the static properties it uses!
  private static initBuffering = ((): boolean => {
    AppExpress.startLogBuffering();
    return true;
  })();

  /**
   * Disable log buffering. Called by micro() to restore normal console output
   * since micro API doesn't use the banner system.
   * @public API
   */
  public static disableBuffering(): void {
    AppExpress.stopBuffering();
    // Clear any buffered logs since micro() doesn't need them
    AppExpress.logBuffer = [];
  }

  /**
   * Start buffering all console output.
   * This captures both console.log and direct process.stdout.write calls.
   * @private
   */
  private static startLogBuffering(): void {
    if (AppExpress.isBuffering) return;

    // Store original streams
    AppExpress.originalStdoutWrite = process.stdout.write.bind(process.stdout);
    AppExpress.originalStderrWrite = process.stderr.write.bind(process.stderr);

    // Create wrapper functions that use fs.writeSync directly (always works)
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const fsModule = require("fs");
    const createOriginalConsoleMethod =
      (useStderr: boolean = false) =>
      (...args: Array<unknown>): void => {
        const message =
          args
            .map((a) => {
              if (typeof a === "object" && a !== null) {
                try {
                  return JSON.stringify(a, null, 2);
                } catch {
                  return String(a);
                }
              }
              return String(a);
            })
            .join(" ") + "\n";
        // Use fs.writeSync directly - this always works
        fsModule.writeSync(useStderr ? 2 : 1, message);
      };

    AppExpress.originalGlobalConsole = {
      log: createOriginalConsoleMethod(false),
      info: createOriginalConsoleMethod(false),
      warn: createOriginalConsoleMethod(true),
      error: createOriginalConsoleMethod(true),
      debug: createOriginalConsoleMethod(false),
    };

    AppExpress.logBuffer = [];
    AppExpress.isBuffering = true;

    // Create buffering functions for console methods
    const bufferConsoleMethod =
      () =>
      (...args: Array<unknown>): void => {
        const message =
          args
            .map((a) => (typeof a === "object" && a !== null ? JSON.stringify(a) : String(a)))
            .join(" ") + "\n";
        AppExpress.logBuffer.push(message);
      };

    // Override console methods directly (not replacing the console object)
    // This ensures even cached references to console.log will use the buffered version
    console.log = bufferConsoleMethod();
    console.info = bufferConsoleMethod();
    console.warn = bufferConsoleMethod();
    console.error = bufferConsoleMethod();
    console.debug = bufferConsoleMethod();

    // Also override process.stdout.write for direct writes (like our Logger)
    const bufferWrite = (chunk: string | Uint8Array): boolean => {
      const str = typeof chunk === "string" ? chunk : Buffer.from(chunk).toString();
      AppExpress.logBuffer.push(str);
      return true;
    };

    // Use direct assignment for overriding
    (process.stdout as unknown as { write: typeof bufferWrite }).write = bufferWrite;
    (process.stderr as unknown as { write: typeof bufferWrite }).write = bufferWrite;
  }

  /**
   * Stop buffering but keep the buffered logs for later flushing.
   * This restores normal console/stdout output.
   * @private
   */
  private static stopBuffering(): void {
    if (!AppExpress.isBuffering) return;

    // Restore original console methods using our wrapper functions
    if (AppExpress.originalGlobalConsole) {
      console.log = AppExpress.originalGlobalConsole.log;
      console.info = AppExpress.originalGlobalConsole.info;
      console.warn = AppExpress.originalGlobalConsole.warn;
      console.error = AppExpress.originalGlobalConsole.error;
      console.debug = AppExpress.originalGlobalConsole.debug;
    }

    // Restore original stdout/stderr by direct assignment
    // (Object.defineProperty may not work correctly for stream.write)
    if (AppExpress.originalStdoutWrite) {
      (process.stdout as unknown as { write: typeof process.stdout.write }).write =
        AppExpress.originalStdoutWrite;
    }
    if (AppExpress.originalStderrWrite) {
      (process.stderr as unknown as { write: typeof process.stderr.write }).write =
        AppExpress.originalStderrWrite;
    }

    AppExpress.isBuffering = false;
  }

  /**
   * Flush all buffered logs to stdout.
   * Should be called after stopBuffering() and after displaying the banner.
   * @private
   */
  private static flushBufferedLogs(): void {
    const logs = AppExpress.logBuffer;
    AppExpress.logBuffer = [];

    for (const log of logs) {
      if (AppExpress.originalStdoutWrite) {
        AppExpress.originalStdoutWrite.call(process.stdout, log);
      } else {
        process.stdout.write(log);
      }
    }
  }

  constructor() {
    // Buffering is already started via static initialization (initBuffering)
    // This ensures ALL logs are captured from the very beginning
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
    // 1. Execute lifecycle shutdown hooks on all IShutdown providers
    if (this.lifecycleRegistry) {
      await this.lifecycleRegistry.executeShutdown(signal);
    }

    // 2. Call user's serverShutdown hook
    await this.handleSyncOrAsync(this.serverShutdown(signal));

    // 3. Gracefully close the HTTP server with connection force-close
    if (this.serverInstance) {
      await new Promise<void>((resolve) => {
        // Set a timeout to force-destroy connections if graceful shutdown takes too long
        const forceCloseTimeout = setTimeout(() => {
          console.log(
            `⚠️  Force-closing ${this.activeConnections.size} active connections after ${this.shutdownTimeout}ms timeout`,
          );
          this.destroyAllConnections();
          resolve();
        }, this.shutdownTimeout);

        // Try graceful close first
        this.serverInstance!.close((err) => {
          clearTimeout(forceCloseTimeout);
          if (err) {
            // Don't fail on close error during shutdown - just log it
            console.log(`Note: Server close returned: ${err.message}`);
          }
          resolve();
        });

        // Immediately destroy idle connections (keep-alive connections with no pending requests)
        // This speeds up shutdown significantly
        this.serverInstance!.closeIdleConnections?.();
      });

      // Clear all remaining connections
      this.destroyAllConnections();
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

    await this.handleSyncOrAsync(this.configureServices());

    const sortedMiddlewarePipeline = (this.Middleware as Middleware).getMiddlewarePipeline();
    const pipeline = sortedMiddlewarePipeline.map((entry) => entry.middleware);

    this.middlewares.push(...(pipeline as Array<ExpressHandler>));

    /* Apply the status code to the response */
    this.middlewares.unshift(new HttpStatusCodeMiddleware(this.globalPrefix) as ExpressoMiddleware);

    const expressServer = new InversifyExpressServer(this.appContainer.Container, null, {
      rootPath: this.globalPrefix as string,
    });

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
      const { ValidationService } = await import("./express-utils/validation-service");
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

            // Use console.log for shutdown messages - synchronous and guaranteed to write before exit
            console.log(`\n📡 Signal ${signal} received, initiating graceful shutdown...`);

            // Execute shutdown hooks and exit
            this.handleExit(signal)
              .then(() => {
                console.log("✅ Graceful shutdown completed");
                process.exit(0);
              })
              .catch((error) => {
                console.error(`❌ Error during shutdown: ${error.message}`);
                process.exit(1);
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
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
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
    const net = await import("net");

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
   * Display middleware startup logs after the banner.
   * This makes startup logging transparent to the user - no need for manual code in postServerInitialization().
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
        this.logger.info(log.message, "middleware");
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

      // Collect metrics
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
          "Global Prefix": this.globalPrefix || "/",
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
