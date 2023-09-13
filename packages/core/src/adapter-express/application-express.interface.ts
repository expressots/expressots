import { IApplicationMessageToConsole } from "../console/console";
import { RenderTemplateOptions } from "../render";
import { ServerEnvironment } from "./application-express";

/**
 * Interface representing the Application class for Expressjs
 * @interface IApplicationExpress
 */
interface IApplicationExpress {
  /**
   * Start listening on the given port and environment.
   * @param port - The port number to listen on.
   * @param environment - The server environment.
   * @param consoleMessage - Optional message to display in the console.
   */
  listen(
    port: number,
    environment: ServerEnvironment,
    consoleMessage?: IApplicationMessageToConsole,
  ): Promise<void> | void;

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
  setEngine<T extends RenderTemplateOptions>(options: T): void;
}

export { IApplicationExpress };
