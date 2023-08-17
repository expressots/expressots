import express from "express";
import { provide } from "inversify-binding-decorators";
import { Container } from "inversify";
import { InversifyExpressServer } from "inversify-express-utils";
import { ApplicationBase } from "./application-base";
import process from "process";
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
class Application extends ApplicationBase {
  private app: express.Application;
  private port: number;
  private environment: ServerEnvironment;

  protected configureServices(): void | Promise<void> { }
  protected postServerInitialization(): void | Promise<void> { }
  protected serverShutdown(): void | Promise<void> { }

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
    middlewares: express.RequestHandler[] = [],
  ): Promise<Application> {
    
    await Promise.resolve(this.configureServices());

    const expressServer = new InversifyExpressServer(container);

    expressServer.setConfig((app: express.Application) => {
      const hasCustomBodyParser = middlewares.some((middleware) => {
        const middlewareName = middleware.name.toLowerCase();
        return (
          middlewareName.includes("json") ||
          middlewareName.includes("urlencoded")
        );
      });

      if (!hasCustomBodyParser) {
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));
      }

      middlewares.forEach((middleware) => {
        app.use(middleware);
      });
    });

    this.app = expressServer.build();

    this.app.use(errorHandler);

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

    this.app.listen(this.port, () => {
      new Console().messageServer(this.port, this.environment, consoleMessage);

      (["SIGTERM", "SIGHUP", "SIGBREAK", "SIGQUIT", "SIGINT"] as NodeJS.Signals[]).forEach((signal) => {
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
}

export { Application, ServerEnvironment };

