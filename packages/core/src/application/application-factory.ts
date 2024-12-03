import {
  IWebServer,
  IWebServerBuilder,
  IWebServerConstructor,
} from "@expressots/shared";
import { Logger } from "../provider/logger/logger.provider";

/**
 * Type guard to check if input is a constructor type of IWebServer.
 * @param input - Input to check.
 * @returns True if input is a constructor type of IWebServer.
 */
export function isWebServerConstructor<T extends IWebServer>(
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
  private static logger: Logger = new Logger();

  /**
   * Create an instance of a web server.
   * @param webServerType - Constructor of a class that implements IWebServer.
   * @returns A promise that resolves to an instance of IWebServerBuilder.
   */
  public static async create<T extends IWebServer>(
    webServerType: IWebServerConstructor<T>,
  ): Promise<IWebServerBuilder> {
    if (isWebServerConstructor<T>(webServerType)) {
      const webServerInstance: T = new webServerType();
      return webServerInstance;
    } else {
      AppFactory.logger.error("Invalid web server type.", "app-factory:create");
      throw new Error("Invalid web server type.");
    }
  }
}
