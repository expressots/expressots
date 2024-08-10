import { Console, IApplicationMessageToConsole, Logger, Middleware } from "@expressots/core";
import express from "express";
import { Container } from "inversify";
import { provide } from "inversify-binding-decorators";
import process from "process";
import { ApplicationBase } from "./application-express.base";
import {
  ExpressHandler,
  ExpressoMiddleware,
  IWebServer,
  MiddlewareConfig,
  ServerEnvironment,
} from "./application-express.types";
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
@provide(AppExpress)
class AppExpress extends ApplicationBase implements IWebServer {
  private logger: Logger = new Logger();
  private app: express.Application;
  private port: number;
  private environment: ServerEnvironment;
  private container: Container;
  private globalPrefix: string = "/";
  private middlewares: Array<ExpressHandler | MiddlewareConfig | ExpressoMiddleware> = [];
  private console: Console;
  private renderOptions: RenderOptions = {} as RenderOptions;

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
   * Configures the InversifyJS container.
   * @param container - The InversifyJS container.
   */
  async configure(container: Container): Promise<void> {
    this.container = container;
    this.console = this.container.get(Console);
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
    await this.configureServices();

    const middleware = this.container.get(Middleware);
    const sortedMiddlewarePipeline = middleware.getMiddlewarePipeline();
    const pipeline = sortedMiddlewarePipeline.map((entry) => entry.middleware);

    this.middlewares.push(...(pipeline as Array<ExpressHandler>));

    /* Apply the status code to the response */
    this.middlewares.unshift(new HttpStatusCodeMiddleware() as ExpressoMiddleware);

    /* Get middlewares from the @controller and http decorators */

    const expressServer = new InversifyExpressServer(this.container, null, {
      rootPath: this.globalPrefix as string,
    });

    expressServer.setConfig((app: express.Application) => {
      this.configureMiddleware(app, this.middlewares);
    });

    expressServer.setErrorConfig((app: express.Application) => {
      if (middleware.getErrorHandler()) {
        app.use(middleware.getErrorHandler() as express.ErrorRequestHandler);
      }
    });

    this.app = expressServer.build();
    return this;
  }

  /**
   * Start listening on the given port and environment.
   * @param port - The port number to listen on.
   * @param environment - The server environment.
   * @param consoleMessage - Optional message to display in the console.
   */
  public async listen(
    port: number,
    environment: ServerEnvironment,
    consoleMessage?: IApplicationMessageToConsole,
  ): Promise<void> {
    await this.init();
    await this.configEngine();

    this.port = port || 3000;
    this.environment = environment;
    this.app.set("env", environment);

    this.app.listen(this.port, () => {
      this.console.messageServer(this.port, this.environment, consoleMessage);

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
   *
   * @public
   * @method setGlobalRoutePrefix
   *
   * @param {string} prefix - The prefix to use for all routes.
   *
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
   *
   * @public
   * @method setEngine
   * @template T - A generic type extending from RenderTemplateOptions.
   *
   * @param {Engine} engine - The view engine to set
   * @param {EngineOptions} [options] - The configuration options for the view engine
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
   *
   * @returns A boolean value indicating whether the current environment is development or not.
   */
  protected isDevelopment(): boolean {
    if (this.app) {
      return this.app.get("env") === ServerEnvironment.Development;
    }

    this.container
      .get<Logger>(Logger)
      .error("isDevelopment() method must be called on `PostServerInitialization`", "application");
    return false;
  }

  /**
   * Get the underlying HTTP server. (default: Express.js)
   * @returns The underlying HTTP server after initialization.
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

export { AppExpress };
