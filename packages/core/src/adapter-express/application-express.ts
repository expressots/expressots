import express from "express";
import { Container } from "inversify";
import { provide } from "inversify-binding-decorators";
import process from "process";
import { Console, IApplicationMessageToConsole } from "../console/console";
import { IMiddleware, Middleware } from "../middleware/middleware-service";
import { Logger } from "../provider/logger/logger-service";
import { IHandlebars, RenderTemplateOptions } from "../render";
import { ApplicationBase } from "../application/application-base";
import { IApplicationExpress } from "./application-express.interface";
import { InversifyExpressServer } from "./express-utils/inversify-express-server";

/**
 * Enum representing possible server environments.
 */
enum ServerEnvironment {
  Development = "development",
  Production = "production",
}

/**
 * The Application class provides a way to configure and manage an Express application.
 * @provide Application
 */
@provide(ApplicationExpress)
class ApplicationExpress
  extends ApplicationBase
  implements IApplicationExpress
{
  private app: express.Application;
  private port: number;
  private environment: ServerEnvironment;
  private container: Container;
  private middlewares: Array<express.RequestHandler> = [];

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
   * Create and configure the Express application.
   * @param container - The InversifyJS container.
   * @param middlewares - An array of Express middlewares to be applied.
   * @returns The configured Application instance.
   */
  public async create(
    container: Container,
    middlewares: Array<express.RequestHandler> = [],
  ): Promise<ApplicationExpress> {
    this.container = container;

    await Promise.resolve(this.configureServices());

    const middleware = container.get<IMiddleware>(Middleware);
    this.middlewares.push(...middlewares, ...middleware.getMiddlewares());

    const expressServer = new InversifyExpressServer(container);

    expressServer.setConfig((app: express.Application) => {
      this.middlewares.forEach((middleware) => {
        app.use(middleware);
      });
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
    this.port = port;
    this.environment = environment;
    this.app.set("env", environment);

    this.app.listen(this.port, () => {
      const console: Console = this.container.get<Console>(Console);
      console.messageServer(this.port, this.environment, consoleMessage);

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

    await Promise.resolve(this.postServerInitialization());
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
      .error(
        "isDevelopment() method must be called on `PostServerInitialization`",
        "application",
      );
    return false;
  }

  /**
   * Verifies if the current environment is production.
   *
   * @returns A boolean value indicating whether the current environment is production or not.
   *
   */
  public get ExpressApp(): express.Application {
    return this.app;
  }
}

export { ApplicationExpress as AppExpress, ServerEnvironment };
