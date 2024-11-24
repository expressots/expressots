import { IMiddleware, interfaces, Logger, Middleware } from "@expressots/core";
import { config, Env, IConsoleMessage } from "@expressots/shared";
import express from "express";
import fs from "fs";
import { MiddlewareConfig } from "../application-express.types";
import { IIOC, IOC } from "./application-express-micro-container";
import { IRoute, Route } from "./application-express-micro-route";

/**
 * Configuration options for the Express Micro API adapter
 * @public API
 */
export type MicroAPIConfig = {
  containerOptions: interfaces.ContainerOptions;
};

/**
 * Interface for the Create Method of Express Micro API adapter
 */
export interface ICreateMicroAPI {
  /**
   * Initialize the environment for the application
   * @param environment - The environment to initialize
   * @param options - Options for the environment initialization
   * @public API
   */
  initEnvironment(environment: Env.Environment, options?: Env.IEnvironment): void;

  /**
   * Set the global route prefix
   * @param prefix - The global route prefix
   * @public API
   */
  setGlobalRoutePrefix(prefix: string): void;

  /**
   * Get the Container instance
   * @returns IIOC - The container instance interface
   * @public API
   */
  get Container(): IIOC;

  /**
   * Get the Express HTTP Server instance
   * @returns express.Application
   * @public API
   */
  getHttpServer(): express.Application;

  /**
   * Build the Web Server Micro API
   * @returns IWebServerMicroAPI
   * @public API
   */
  build(): IWebServerMicroAPI;
}

/**
 * Interface for the Build Method of the Web Server Micro API adapter
 */
export interface IWebServerMicroAPI {
  /**
   * Get the Middleware instance
   * @returns IMiddleware
   * @public API
   */
  get Middleware(): IMiddleware;

  /**
   * Get the Route instance
   * @returns IRoute
   * @public API
   */
  get Route(): IRoute;

  /**
   * Listen for incoming requests
   * @param port - The port to listen on
   * @param appInfo - Information about the application
   * @public API
   */
  listen(port: number | string, appInfo?: IConsoleMessage): Promise<void>;
}

class AppExpressMicro {
  private logger: Logger = new Logger();
  private app: express.Application;
  private port: number;
  private environment: Env.Environment;
  private container: IIOC;
  private globalPrefix: string = "/";
  private middlewareManager: IMiddleware;
  private routeManager: IRoute;

  /**
   * Handle the exit of the server
   * @private
   */
  private handleExit(): void {
    this.logger.info("Server shutting down.", "MicroAPI");
    process.exit(0);
  }

  /**
   * Configure the middleware for the application
   * @private
   */
  private configureMiddleware(): void {
    const sortedMiddlewarePipeline = (this.middlewareManager as Middleware).getMiddlewarePipeline();
    const pipeline = sortedMiddlewarePipeline.map((entry) => entry.middleware);

    for (const entry of pipeline) {
      if (typeof entry === "function") {
        this.app.use(entry as express.RequestHandler);
      } else if ((entry as MiddlewareConfig).middlewares) {
        const { path, middlewares } = entry as MiddlewareConfig;
        for (const mid of middlewares) {
          if (path) {
            this.app.use(path, mid as express.RequestHandler);
          } else {
            this.app.use(mid as express.RequestHandler);
          }
        }
      }
    }
  }

  /**
   * Set the global route prefix
   * @param prefix - The global route prefix
   * @public API
   */
  public setGlobalRoutePrefix(prefix: string): void {
    this.globalPrefix = prefix;
  }

  /**
   * Initialize the environment for the application
   * @param environment - The environment to initialize
   * @param options - Options for the environment initialization
   * @public API
   */
  public initEnvironment(environment: Env.Environment, options?: Env.IEnvironment): void {
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
   * Get the Middleware instance
   * @returns IMiddleware
   * @public API
   */
  public get Middleware(): IMiddleware {
    return this.middlewareManager;
  }

  /**
   * Get the Route instance
   * @returns IRoute
   * @public API
   */
  public get Route(): IRoute {
    return this.routeManager;
  }

  /**
   * Get the Container instance
   * @returns IIOC
   * @public API
   */
  public get Container(): IIOC {
    return this.container;
  }

  /**
   * Get the Express HTTP Server instance
   * @returns express.Application
   * @public API
   */
  public getHttpServer(): express.Application {
    return this.app;
  }

  /**
   * Create a new instance of the Express Micro API adapter
   * @param config - Configuration options
   * @returns ICreateMicroAPI
   * @public API
   */
  public create(config?: MicroAPIConfig): ICreateMicroAPI {
    this.app = express();
    this.routeManager = new Route(this.app);
    this.container = new IOC(config?.containerOptions);
    this.middlewareManager = new Middleware();

    this.environment = "development";

    return this as unknown as ICreateMicroAPI;
  }

  /**
   * Build the Web Server Micro API
   * @returns IWebServerMicroAPI
   * @public API
   */
  public build(): IWebServerMicroAPI {
    (this.routeManager as Route).setGlobalRoutePrefix(this.globalPrefix);
    return this as unknown as IWebServerMicroAPI;
  }

  /**
   * Listen for incoming requests
   * @param port - The port to listen on
   * @param appInfo - Information about the application
   * @public API
   */
  public async listen(port: number | string, appInfo?: IConsoleMessage): Promise<void> {
    const logger: Logger = new Logger();
    this.port = typeof port === "string" ? parseInt(port, 10) : port || 3000;

    this.configureMiddleware();

    (this.routeManager as Route).applyRoutes();

    if (this.Middleware.getErrorHandler()) {
      this.app.use(this.Middleware.getErrorHandler() as express.ErrorRequestHandler);
    }

    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        const appInfoNormalized = appInfo ? `${appInfo?.appName} - ${appInfo?.appVersion} ` : "";
        logger.info(`${appInfoNormalized}[${this.port}:${this.environment}]`, "MicroAPI");

        (["SIGTERM", "SIGHUP", "SIGBREAK", "SIGQUIT", "SIGINT"] as Array<NodeJS.Signals>).forEach(
          (signal) => {
            process.on(signal, this.handleExit.bind(this));
          },
        );
        resolve();
      });
    });
  }
}

/**
 * Create a new instance of the Express Micro API adapter
 * @param config - Configuration options
 * @returns ICreateMicroAPI
 * @public API
 */
export function createMicroAPI(config?: MicroAPIConfig): ICreateMicroAPI {
  const microAPI = new AppExpressMicro();
  const create = microAPI.create.bind(microAPI);
  return create(config);
}
