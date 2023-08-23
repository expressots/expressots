import express from "express";
import process from "process";
import { Container } from "inversify";
import { provide } from "inversify-binding-decorators";
import { Console, IApplicationMessageToConsole } from "../console/console";
import { Configure, IConfigure } from "../middleware/configure-services";
import { IHandlebars, RenderTemplateOptions } from "../render";
import { ApplicationBase } from "./application-base";
import { InversifyExpressServer } from "../controller/express-utils/inversify-server";

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
  private container: Container;
    
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
    
    this.container = container;

    await Promise.resolve(this.configureServices());

    const configure = container.get<IConfigure>(Configure);
    const configureMiddlewares = configure.getMiddlewares();
    middlewares = [...middlewares, ...configureMiddlewares];
    
    const expressServer = new InversifyExpressServer(container);

    expressServer.setConfig((app: express.Application) => {
      middlewares.forEach((middleware) => {
        app.use(middleware);
      });
    });

    expressServer.setErrorConfig((app: express.Application) => {
      if (configure.getErrorHandler()){
        app.use(configure.getErrorHandler() as express.ErrorRequestHandler);
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

    this.app.listen(this.port, () => {
      const console: Console = this.container.get<Console>(Console);
      console.messageServer(this.port, this.environment, consoleMessage);

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

