import {
  IWebServer,
  IWebServerPublic,
  IWebServerConstructor,
} from "@expressots/adapter-express";
import { Container } from "../di/inversify";
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
 * @public API
 */
export class AppFactory {
  public static container: Container;
  private static logger: Logger = new Logger();

  /**
   * Create an instance of a web server.
   * @param container - Dependency injection container.
   * @param webServerType - Constructor of a class that implements IWebServer.
   * @returns A promise that resolves to an instance of IWebServer.
   */
  public static async create<T extends IWebServer>(
    container: Container,
    webServerType: IWebServerConstructor<T>,
  ): Promise<IWebServerPublic> {
    AppFactory.container = container;

    if (isWebServerConstructor<T>(webServerType)) {
      const webServerInstance: T = new webServerType();
      await webServerInstance.configure(container);
      return webServerInstance as unknown as IWebServerPublic;
    } else {
      this.logger.error("Invalid web server type.", "app-factory:create");
      throw new Error("Invalid web server type.");
    }
  }
}
