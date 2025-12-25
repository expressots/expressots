import express from "express";
import fs from "fs";
import { Server as HTTPServer } from "http";
import process, { exit } from "process";

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
} from "@expressots/core";
import { config, Env, IWebServerPublic, RenderEngine, Server } from "@expressots/shared";

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
  // This MUST be declared AFTER all the static properties it uses!
  private static initBuffering = ((): boolean => {
    AppExpress.startLogBuffering();
    return true;
  })();

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
            .map((a) =>
              typeof a === "object" && a !== null ? JSON.stringify(a) : String(a),
            )
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
    this.globalConfiguration();
  }

  /**
   * Implement this method to set up global configurations for the server.
   * This method is called before any other server initialization methods.
   * Use this method to configure global settings that apply to the entire
   * server application. Supports asynchronous setup with a Promise.
   *
   * @abstract
   * @returns {void | Promise<void>}
   * @public API
   */
  protected async globalConfiguration(): Promise<void> {}

  /**
   * Implement this method to set up required services or configurations before
   * the server starts. This is essential for initializing dependencies or settings
   * necessary for server operation. Supports asynchronous setup with a Promise.
   *
   * @abstract
   * @returns {void | Promise<void>}
   * @public API
   */
  protected async configureServices(): Promise<void> {}

  /**
   * Implement this method to execute actions or configurations after the server
   * has started. Use this for operations that need to run once the server is
   * operational. Supports asynchronous execution with a Promise.
   *
   * @abstract
   * @returns {void | Promise<void>}
   * @public API
   */
  protected async postServerInitialization(): Promise<void> {}

  /**
   * Implement this method to handle cleanup and final actions when the server
   * is shutting down. Ideal for closing resources, stopping tasks, or other
   * cleanup procedures to ensure a graceful server shutdown. Supports asynchronous
   * cleanup with a Promise.
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
  protected async serverShutdown(signal?: NodeJS.Signals): Promise<void> {}

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
    await this.serverShutdown(signal);

    // 3. Gracefully close the HTTP server
    if (this.serverInstance) {
      await new Promise<void>((resolve, reject) => {
        this.serverInstance!.close((err) => {
          if (err) {
            this.logger.error(`Error closing server: ${err.message}`, "adapter-express");
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
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
      exit(1);
    }

    await this.configureServices();

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

      // Display startup banner FIRST (now goes directly to stdout)
      this.displayStartupBanner(appInfo);

      // Flush all buffered logs that were captured during initialization
      AppExpress.flushBufferedLogs();
    } catch (error) {
      // Ensure buffering is stopped and logs are flushed even on error
      AppExpress.stopBuffering();
      AppExpress.flushBufferedLogs();
      throw error;
    }

    return new Promise<IWebServerPublic>((resolve, reject) => {
      this.serverInstance = this.app.listen(this.port, async () => {
        this.port = (this.serverInstance?.address() as AddressInfo)?.port;

        // Setup signal handlers for graceful shutdown
        // Supported signals:
        // - SIGTERM: Standard termination (Kubernetes, Docker, process managers)
        // - SIGINT: User interrupt (Ctrl+C)
        // - SIGHUP: Terminal hangup
        // - SIGQUIT: Quit with core dump request
        // - SIGBREAK: Windows break signal (Ctrl+Break)
        const shutdownSignals: Array<NodeJS.Signals> = [
          "SIGTERM",
          "SIGINT",
          "SIGHUP",
          "SIGQUIT",
          "SIGBREAK",
        ];

        for (const signal of shutdownSignals) {
          process.on(signal, () => {
            // Prevent multiple shutdown attempts
            if (this.isShuttingDown) {
              return;
            }
            this.isShuttingDown = true;

            console.log(`\n📡 Signal ${signal} received, initiating graceful shutdown...`);

            // Execute shutdown hooks and exit
            this.handleExit(signal)
              .then(() => {
                console.log("✅ Graceful shutdown completed");
                process.exit(0);
              })
              .catch((error) => {
                this.logger.error(`Shutdown error: ${error.message}`, "adapter-express");
                process.exit(1);
              });
          });
        }

        try {
          // Call user's postServerInitialization hook
          await this.postServerInitialization();

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
      this.serverInstance?.on("error", (error) => {
        this.logger.error(`Error starting server: ${error.message}`, "adapter-express");
        reject(error);
      });
    });
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

  public async setEngine<T extends RenderEngine.EngineOptions>(
    engine: RenderEngine.Engine,
    options?: T,
  ): Promise<void> {
    try {
      if (options) {
        this.renderOptions = { engine, options };
      } else {
        this.renderOptions = { engine };
      }
    } catch (error: unknown) {
      this.logger.error((error as Error).message, "adapter-express");
    }
  }

  /**
   * Verifies if the current environment is development.
   * @returns A boolean value indicating whether the current environment is development or not.
   * @public API
   */
  public async isDevelopment(): Promise<boolean> {
    if (this.app) {
      return this.app.get("env") === "development";
    }

    this.appContainer.Container.get<Logger>(Logger).error(
      "isDevelopment() method must be called on `PostServerInitialization`",
      "application",
    );
    return false;
  }

  /**
   * Load environment variables from the specified file based on the environment configuration.
   * @param environment - The environment to load configuration for.
   * @param options - The options to use for loading the environment configuration.
   * @option env - The environment configuration options.
   * @example
   * ```typescript
   * {
            env: {
                development: ".env.development",
                production: ".env.production"
            }
        }
    * ```
   * @public API
   */
  public async initEnvironment(
    environment: Env.Environment,
    options?: Env.IEnvironment,
  ): Promise<void> {
    this.environment = environment;

    if (options === undefined) {
      config({ path: ".env" });
    } else {
      if (!options.env[environment]) {
        this.logger.error(
          `Environment configuration for [${environment}] does not exist.`,
          "adapter-express",
        );
        process.exit(1);
      } else {
        const envFileName = options.env[environment];

        if (!fs.existsSync(envFileName)) {
          this.logger.error(`Environment file [${envFileName}] does not exist.`, "adapter-express");
          process.exit(1);
        } else {
          config({ path: envFileName });
        }
      }
    }
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
   * Display startup banner with application metrics.
   * @param appInfo - Application info
   * @private
   */
  private displayStartupBanner(appInfo?: IConsoleMessage): void {
    if (!this.bannerGenerator) {
      // Fallback to old console message if banner generator not initialized
      this.console.messageServer(this.port, this.environment || "development", appInfo);
      return;
    }

    try {
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
      });

      // Display banner
      this.bannerGenerator.display(
        this.port,
        this.environment || "development",
        appInfo,
        metrics,
        features,
        {
          "Global Prefix": this.globalPrefix || "/",
          "Node Version": process.version,
          Platform: process.platform,
        },
      );
    } catch (error) {
      // Fallback to old console message on error
      this.logger.warn(
        "Failed to display startup banner, using fallback",
        "adapter-express",
        error,
      );
      this.console.messageServer(this.port, this.environment || "development", appInfo);
    }
  }
}
