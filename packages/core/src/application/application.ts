import process from "process";
import express from "express";
import { Container } from "inversify";
import { provide } from "inversify-binding-decorators";
import { InversifyExpressServer } from "inversify-express-utils";
import { Console, IApplicationMessageToConsole } from "../console/console";
import errorHandler from "../error/error-handler-middleware";
import { IHandlebars, RenderTemplateOptions } from "../render";

/**
 * Enum representing possible server environments.
 */
enum ServerEnvironment {
  Development = "development",
  Staging = "staging",
  Production = "production",
}

/**
 * The Application class provides a way to configure and manage an Express application.
 * @provide Application
 */
@provide(Application)
class Application {
  private app: express.Application;
  private port: number;
  private environment: ServerEnvironment;

  /**
   * Constructs a new instance of the Application class.
   */
  constructor() {}

  /**
   * Configure services that should be initialized before the server starts.
   */
  protected configureServices(): void {}

  /**
   * Configure services that should be executed after the server starts.
   */
  protected postServerInitialization(): void {}

  /**
   * Perform actions or cleanup after the server is shutdown.
   */
  protected serverShutdown(): void {}

  /**
   * Handles process exit by calling serverShutdown and then exiting the process.
   */
  private handleExit(): void {
    this.serverShutdown();
    process.exit(0);
  }

  /**
   * Create and configure the Express application.
   * @param container - The InversifyJS container.
   * @param middlewares - An array of Express middlewares to be applied.
   * @returns The configured Application instance.
   */
  public create(
    container: Container,
    middlewares: Array<express.RequestHandler> = [],
  ): Application {
    this.configureServices();

    const expressServer = new InversifyExpressServer(container);

    expressServer.setConfig((app: express.Application) => {
      // Detect if a middleware in the array has a body parser. If so, replace the default body parser.
      const hasCustomBodyParser = middlewares.some((middleware) => {
        const middlewareName = middleware.name.toLowerCase();
        return (
          middlewareName.includes("json") ||
          middlewareName.includes("urlencoded")
        );
      });

      if (!hasCustomBodyParser) {
        /* Default body parser application/json */
        app.use(express.json());

        /* Default body parser application/x-www-form-urlencoded */
        app.use(express.urlencoded({ extended: true }));
      }

      middlewares.forEach((middleware) => {
        app.use(middleware);
      });
    });

    expressServer.setErrorConfig((app: express.Application) => {
      app.use(errorHandler);
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
  public listen(
    port: number,
    environment: ServerEnvironment,
    consoleMessage?: IApplicationMessageToConsole,
  ): void {
    this.port = port;
    this.environment = environment;

    this.app.listen(this.port, () => {
      new Console().messageServer(this.port, this.environment, consoleMessage);

      (
        [
          "SIGTERM",
          "SIGHUP",
          "SIGBREAK",
          "SIGQUIT",
          "SIGINT",
        ] as Array<NodeJS.Signals>
      ).forEach((signal) => {
        process.on(signal, this.handleExit.bind(this));
      });
    });

    this.postServerInitialization();
  }

  /**
   * Configures the application's view engine based on the provided configuration options.
   *
   * @public
   * @method setEngine
   * @template T - A generic type extending from RenderTemplateOptions.
   *
   * @param {T} options - An object of type T (must be an object that extends RenderTemplateOptions)
   *                      that provides the configuration options for setting the view engine.
   *                      This includes the extension name, view path, and the engine function itself.
   */
  public setEngine<T extends RenderTemplateOptions>(options: T): void {
    if ("extName" in options) {
      const { extName, viewPath, engine } = options as IHandlebars;
      this.app.engine(extName, engine);
      this.app.set("view engine", extName);
      this.app.set("views", viewPath);
    }
  }
}

const appServerInstance: Application = new Application();

export { appServerInstance as AppInstance, Application, ServerEnvironment };
