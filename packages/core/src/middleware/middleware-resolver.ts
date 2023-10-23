/* eslint-disable @typescript-eslint/no-explicit-any */
import express from "express";
import { Logger } from "../provider/logger/logger-service";
import { ExpressHandler } from "./middleware-service";

/**
 * MiddlewareResolver class is responsible for resolving and retrieving Express middlewares
 * by their names. It maintains a registry of available middlewares and provides
 * a method to retrieve them by their name. If a middleware is not installed, it logs
 * an informative message.
 */
class MiddlewareResolver {
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  /**
   * A registry object mapping middleware names to their corresponding package names.
   * It is used to identify and require the middleware from the current working directory.
   */
  private middlewareRegistry: { [key: string]: string } = {
    cors: "cors",
    compression: "compression",
    cookieParser: "cookie-parser",
    cookieSession: "cookie-session",
    serveFavicon: "serve-favicon",
    morgan: "morgan",
    helmet: "helmet",
    rateLimit: "express-rate-limit",
    multer: "multer",
    session: "express-session",
    // Add other middlewares
  };

  /**
   * Retrieves a middleware by its name and optionally configures it with provided options.
   *
   * @param {string} middlewareName - The name of the middleware to be retrieved.
   * @param {...any} options - Optional arguments to configure the middleware.
   * @returns {express.RequestHandler | null} - Returns the configured middleware or null if not found or not installed.
   */
  getMiddleware(
    middlewareName: string,
    ...options: any
  ): express.RequestHandler | null {
    const packageName = this.middlewareRegistry[middlewareName];

    if (!packageName) {
      this.logger.error(
        `Middleware ${packageName} not found`,
        "middleware-resolver",
      );
      return null;
    }

    let hasMiddleware = "";
    try {
      hasMiddleware = require.resolve(packageName, { paths: [process.cwd()] });
    } catch (error) {
      this.logger.warn(
        `Middleware [${packageName}] not installed. Please install it using your package manager.`,
        "middleware-resolver",
      );
    }

    if (hasMiddleware) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const middleware = require(hasMiddleware);
      return middleware(...options) || middleware.default(...options);
    }

    return null;
  }
}

/**
 * A utility function that wraps the creation and retrieval of middleware.
 * It creates a new instance of MiddlewareResolver and calls the getMiddleware method.
 *
 * @param {string} middleware - The name of the middleware to be retrieved.
 * @param {...any} options - Optional arguments to configure the middleware.
 * @returns {express.RequestHandler | null} - Returns the configured middleware or null if not found or not installed.
 */
function middlewareResolver(
  middleware: string,
  ...options: any
): ExpressHandler | null {
  const resolver = new MiddlewareResolver();
  return resolver.getMiddleware(middleware, ...options);
}

export { middlewareResolver };
