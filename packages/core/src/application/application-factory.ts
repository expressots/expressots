import {
  IWebServer,
  IWebServerPublic,
  IWebServerConstructor,
} from "@expressots/adapter-express";
import { Container } from "inversify";
import { Logger } from "../provider/logger/logger.provider";

/**
 * Type guard to check if input is a constructor type of IWebServer.
 * @param input - Input to check.
 * @returns True if input is a constructor type of IWebServer.
 */
function isWebServerConstructor<T extends IWebServer>(
  input: unknown,
): input is IWebServerConstructor<T> {
  return input && typeof input === "function";
}

/**
 * AppFactory Class
 *
 * Responsible for creating an instance of the IWebServer implementation using a custom application type.
 */
class AppFactory {
  public static container: Container;
  private static logger: Logger = new Logger();

  /**
   * Create an instance of a web server.
   * @param container - InversifyJS container to resolve dependencies.
   * @param webServerType - Constructor of a class that implements IWebServer, or array of middlewares.
   * @returns A promise that resolves to an instance of IWebServer.
   */
  public static async create<T extends IWebServer>(
    container: Container,
    webServerType: IWebServerConstructor<T>,
  ): Promise<IWebServerPublic> {
    // Set the container to the static property.
    AppFactory.container = container;

    if (isWebServerConstructor<T>(webServerType)) {
      const webServerInstance: T = new webServerType();
      await webServerInstance.configure(container);
      return webServerInstance;
    } else {
      this.logger.error("Invalid web server type.", "app-factory:create");
      throw new Error("Invalid web server type.");
    }
  }
}

export { AppFactory };
