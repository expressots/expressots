import {
  AppContainer,
  Console,
  IConsoleMessage,
  Logger,
  Middleware,
  ProviderManager,
  ExpressoMiddleware,
  IMiddleware,
} from "@expressots/core";
import { config } from "@expressots/shared";
import express from "express";
import fs from "fs";
import process, { exit } from "process";
import { interfaces } from "../di/di.interfaces";
import { ApplicationBase } from "./application-express.base";
import { Environment, ExpressHandler, MiddlewareConfig } from "./application-express.types";
import { IEnvironment, IWebServer } from "./application-express.interface";
import { HttpStatusCodeMiddleware } from "./express-utils/http-status-middleware";
import { InversifyExpressServer } from "./express-utils/inversify-express-server";
import { EjsOptions, setEngineEjs } from "./render/ejs/ejs.config";
import { Engine, EngineOptions, RenderOptions } from "./render/engine";
import { HandlebarsOptions, setEngineHandlebars } from "./render/handlebars/hbs.config";
import { PugOptions, setEnginePug } from "./render/pug/pug.config";

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
export class AppExpress extends ApplicationBase implements IWebServer {
  private logger: Logger = new Logger();
  private console: Console = new Console();
  private app: express.Application;
  private port: number;
  private environment?: Environment;
  private appContainer: AppContainer;
  private globalPrefix: string = "/";
  private middlewareManager: IMiddleware;
  private middlewares: Array<ExpressHandler | MiddlewareConfig | ExpressoMiddleware> = [];
  private providerManager: ProviderManager;
  private renderOptions: RenderOptions = {} as RenderOptions;

  constructor() {
    super();
    this.globalConfiguration();
  }

  protected globalConfiguration(): void | Promise<void> {}
  protected configureServices(): void | Promise<void> {}
  protected postServerInitialization(): void | Promise<void> {}
  protected serverShutdown(): void | Promise<void> {}

  /**
   * Handles process exit by calling serverShutdown and then exiting the process.
   */
  private handleExit(): void {
    this.serverShutdown();
    process.exit(0);
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
    this.middlewareManager = new Middleware();

    return this.appContainer;
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
        for (const mid of middlewares) {
          if (path) {
            if (typeof mid === "function") {
              app.use(path, mid as express.RequestHandler);
            } else {
              const middleware = mid as unknown as ExpressoMiddleware;
              middleware.use = middleware.use.bind(middleware);
              app.use(path, middleware.use);
            }
          }
        }
      } else {
        const middleware = entry as ExpressoMiddleware;
        middleware.use = middleware.use.bind(middleware);
        app.use(middleware.use);
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
    this.middlewares.unshift(new HttpStatusCodeMiddleware() as ExpressoMiddleware);

    const expressServer = new InversifyExpressServer(this.appContainer.Container, null, {
      rootPath: this.globalPrefix as string,
    });

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
  public async listen(port: number | string, appInfo?: IConsoleMessage): Promise<void> {
    await this.init();
    await this.configEngine();

    this.environment = this.environment || "development";
    this.app.set("env", this.environment);

    this.port = typeof port === "string" ? parseInt(port, 10) : port || 3000;
    this.app.listen(this.port, () => {
      this.console.messageServer(this.port, this.environment, appInfo);

      (["SIGTERM", "SIGHUP", "SIGBREAK", "SIGQUIT", "SIGINT"] as Array<NodeJS.Signals>).forEach(
        (signal) => {
          process.on(signal, this.handleExit.bind(this));
        },
      );
    });

    await this.postServerInitialization();
  }

  /**
   * Sets the global route prefix for the application.
   * @method setGlobalRoutePrefix
   * @param {string} prefix - The prefix to use for all routes.
   * @public API
   */
  public setGlobalRoutePrefix(prefix: string): void {
    this.globalPrefix = prefix;
  }

  /**
   * Configures the application's view engine based on the provided configuration options.
   */
  private async configEngine(): Promise<void> {
    if (this.renderOptions.engine) {
      switch (this.renderOptions.engine) {
        case Engine.HBS:
          await setEngineHandlebars(this.app, this.renderOptions.options as HandlebarsOptions);
          break;
        case Engine.EJS:
          await setEngineEjs(this.app, this.renderOptions.options as EjsOptions);
          break;
        case Engine.PUG:
          await setEnginePug(this.app, this.renderOptions.options as PugOptions);
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
  public async setEngine<T extends EngineOptions>(engine: Engine, options?: T): Promise<void> {
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
  protected isDevelopment(): boolean {
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
  public initEnvironment(environment: Environment, options?: IEnvironment): void {
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
  public async getHttpServer(): Promise<express.Application> {
    if (!this.app) {
      this.logger.error(
        "The method can only be called in `app.provider` or in e2e tests with supertest.",
        "adapter-express",
      );

      throw new Error("Incorrect usage of `getHttpServer` method");
    }
    return this.app;
  }
}
