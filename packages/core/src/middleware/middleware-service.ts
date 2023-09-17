import express from "express";
import { provideSingleton } from "../decorator/index";
import defaultErrorHandler from "../error/error-handler-middleware";
import { Logger } from "../provider/logger/logger-service";
import { OptionsJson } from "./interfaces/body-parser.interface";
import { CompressionOptions } from "./interfaces/compression.interface";
import { CorsOptions } from "./interfaces/cors.interface";
import { CookieParserOptions } from "./interfaces/cookie-parser.interface";
import { ServeStaticOptions } from "./interfaces/serve-static.interface";
import { middlewareResolver } from "./middleware-resolver";
import { CookieSessionOptions } from "./interfaces/cookie-session/cookie-session.interface";
import { ServeFaviconOptions } from "./interfaces/serve-favicon.interface";

type ExpressHandler =
  | express.ErrorRequestHandler
  | express.RequestParamHandler
  | express.RequestHandler
  | undefined;

/**
 * Interface for configuring and managing middlewares in the application.
 * Provides methods to be added automatically in the application without the need to import packages.
 */
interface IMiddleware {
  /**
   * Adds a Body Parser middleware to the middleware collection.
   * The body parser is responsible for parsing the incoming request bodies in a middleware.
   *
   * @param options - Optional configuration options for the JSON body parser.
   */
  addBodyParser(options?: OptionsJson): void;

  /**
   * Adds Cross-Origin Resource Sharing (CORS) middleware to enable or control cross-origin requests.
   *
   * @param options - Optional configuration options for CORS. Defines the behavior of CORS requests like allowed origins, methods, headers, etc.
   */
  addCors(options?: CorsOptions): void;

  /**
   * Adds Compression middleware to reduce the size of the response body and improve the speed of the client-server communication.
   *
   * @param options - Optional configuration options for Compression. Allows fine-tuning the compression behavior, such as setting the compression level, threshold, and filter functions to determine which requests should be compressed.
   */
  addCompression(options?: CompressionOptions): void;

  /**
   * Adds Cookie Parser middleware to parse the cookie header and populate req.cookies with an object keyed by the cookie names.
   *
   * @param secret - A string or array used for signing cookies. This is optional and if not specified, the cookie-parser will not parse signed cookies.
   * @param options - Optional configuration options for Cookie Parser.
   */
  addCookieParser(
    secret?: string | Array<string> | undefined,
    options?: CookieParserOptions,
  ): void;

  /**
   * Adds Cookie Session middleware to enable cookie-based sessions.
   *
   * @param options - Optional configuration options for Cookie Session. Defines the behavior of cookie sessions like the name of the cookie, keys to sign the cookie, etc.
   */
  addCookieSession(options: CookieSessionOptions): void;

  /**
   * Adds a middleware to serve the favicon to the middleware collection.
   * The favicon is the icon that is displayed in the browser tab for the application.
   * 
   * @param path - The path to the favicon file.
   * @param options - Optional configuration options for serving the favicon. Defines the behavior of the favicon middleware like cache control, custom headers, etc.
   */
  addServeFavicon(path: string | Buffer, options?: ServeFaviconOptions): void;

  /**
   * Configures the error handling middleware for the application.
   *
   * @param errorHandling - The Express error handler function that takes care of processing errors and formulating the response.
   */
  setErrorHandler(errorHandling?: ExpressHandler): void;

  /**
   * Adds a middleware to serve static files from the specified root directory.
   * Allows the application to serve files like images, CSS, JavaScript, etc.
   *
   * @param root - The root directory from which the static assets are to be served.
   * @param options - Optional configuration options for serving static files. Defines behavior like cache control, custom headers, etc.
   */
  serveStatic(root: string, options?: ServeStaticOptions): void;

  /**
   * Adds a middleware to the middleware collection.
   *
   * @param middleware - The Express request handler function to be added to the middleware collection.
   *
   */
  addMiddleware(middleware: express.RequestHandler): void;

  /**
   * Retrieves all the middlewares that have been added.
   *
   * @returns An array of Express request handlers representing the middlewares.
   */
  getMiddlewares(): Array<express.RequestHandler>;

  /**
   * Gets the configured error handler middleware.
   *
   * @returns The error handler middleware.
   */
  getErrorHandler(): ExpressHandler;
}

/**
 * Singleton class that implements the IConfigure interface.
 * Manages the middleware configuration for the application,
 * including adding Body Parser and retrieving all configured middlewares.
 *
 * @see IConfigure
 */
@provideSingleton(Middleware)
class Middleware implements IMiddleware {
  private middlewares: Array<express.RequestHandler> = [];
  private errorHandler: ExpressHandler | undefined;
  private logger: Logger = new Logger();

  /**
   * Checks if a middleware with the given name exists in the middleware collection.
   *
   * @param middlewareName - The name of the middleware to be checked.
   *
   * @returns A boolean value indicating whether the middleware exists or not.
   */
  private middlewareExists(middlewareName: string): boolean {
    const middlewares = this.getMiddlewares();
    const middlewareIndex = middlewares.findIndex(
      (m) => m.name === middlewareName,
    );

    return middlewareIndex !== -1;
  }

  /**
   * Adds a Body Parser middleware to the middleware collection using the given options.
   *
   * @param options - Optional configuration options for the JSON body parser.
   */
  public addBodyParser(options?: OptionsJson): void {
    const middlewareExist = this.middlewareExists("jsonParser");

    if (middlewareExist) {
      this.logger.warn(
        `[jsonParser] already exists. Skipping...`,
        "configure-service",
      );
    } else {
      this.middlewares.push(express.json(options));
    }
  }

  /**
   * Adds Cross-Origin Resource Sharing (CORS) middleware to enable or control cross-origin requests.
   *
   * @param options - Optional configuration options for CORS. Defines the behavior of CORS requests like allowed origins, methods, headers, etc.
   */
  addCors(options?: CorsOptions): void {
    const middleware = middlewareResolver("cors", options);
    const middlewareExist = this.middlewareExists("cors");

    if (middleware && !middlewareExist) {
      this.middlewares.push(middleware);
    }
  }

  /**
   * Adds Compression middleware to reduce the size of the response body and improve the speed of the client-server communication.
   *
   * @param options - Optional configuration options for Compression. Allows fine-tuning the compression behavior, such as setting the compression level, threshold, and filter functions to determine which requests should be compressed.
   */
  addCompression(options?: CompressionOptions): void {
    const middleware = middlewareResolver("compression", options);

    const middlewareExist = this.middlewareExists("compression");

    if (middleware && !middlewareExist) {
      this.middlewares.push(middleware);
    }
  }

  /**
   * Adds Cookie Parser middleware to parse the cookie header and populate req.cookies with an object keyed by the cookie names.
   *
   * @param secret - A string or array used for signing cookies. This is optional and if not specified, the cookie-parser will not parse signed cookies.
   * @param options - Optional configuration options for Cookie Parser.
   */
  addCookieParser(
    secret?: string | Array<string> | undefined,
    options?: CookieParserOptions | undefined,
  ): void {
    const middleware = middlewareResolver("cookieParser", secret, options);

    const middlewareExist = this.middlewareExists("cookieParser");

    if (middleware && !middlewareExist) {
      this.middlewares.push(middleware);
    }
  }

  /**
   * Adds Cookie Session middleware to enable cookie-based sessions.
   *
   * @param options - Optional configuration options for Cookie Session. Defines the behavior of cookie sessions like the name of the cookie, keys to sign the cookie, etc.
   */
  addCookieSession(options: CookieSessionOptions): void {
    const middleware = middlewareResolver("cookieSession", options);

    const middlewareExist = this.middlewareExists("cookieSession");

    if (middleware && !middlewareExist) {
      this.middlewares.push(middleware);
    }
  }

  /**
   * Adds a middleware to serve the favicon to the middleware collection.
   * The favicon is the icon that is displayed in the browser tab for the application.
   * 
   * @param path - The path to the favicon file.
   * @param options - Optional configuration options for serving the favicon. Defines the behavior of the favicon middleware like cache control, custom headers, etc.
   */
  addServeFavicon(path: string | Buffer, options?: ServeFaviconOptions): void {
    const middleware = middlewareResolver("serveFavicon", path, options);

    const middlewareExist = this.middlewareExists("serveFavicon");

    if (middleware && !middlewareExist) {
      this.middlewares.push(middleware);
    }
  }
  
  /**
   * Configures the error handling middleware for the application.
   *
   * @param errorHandling - The Express error handler function that takes care of processing errors and formulating the response.
   */
  setErrorHandler(errorHandling?: ExpressHandler): void {
    if (!errorHandling) {
      this.errorHandler = defaultErrorHandler;
    } else {
      this.errorHandler = errorHandling;
    }
  }

  /**
   * Adds a middleware to serve static files from the specified root directory.
   * Allows the application to serve files like images, CSS, JavaScript, etc.
   *
   * @param root - The root directory from which the static assets are to be served.
   * @param options - Optional configuration options for serving static files. Defines behavior like cache control, custom headers, etc.
   */
  serveStatic(root: string, options?: ServeStaticOptions): void {
    const middlewareExist = this.middlewareExists("serveStatic");

    if (middlewareExist) {
      this.logger.warn(
        `[serveStatic] already exists. Skipping...`,
        "configure-service",
      );
    } else {
      this.middlewares.push(express.static(root, options));
    }
  }

  /**
   * Adds a middleware to the middleware collection.
   *
   * @param middleware - The Express request handler function to be added to the middleware collection.
   *
   */
  addMiddleware(middleware: express.RequestHandler): void {
    const middlewareExist = this.middlewareExists(middleware.name);

    if (middlewareExist) {
      this.logger.warn(
        `[${middleware.name}] already exists. Skipping...`,
        "configure-service",
      );
    } else {
      this.middlewares.push(middleware);
    }
  }

  /**
   * Retrieves all the middlewares that have been added to the collection.
   *
   * @returns An array of Express request handlers representing the middlewares.
   */
  public getMiddlewares(): Array<express.RequestHandler> {
    return this.middlewares;
  }

  /**
   * Gets the configured error handler middleware.
   *
   * @returns The error handler middleware.
   */
  public getErrorHandler(): ExpressHandler {
    return this.errorHandler;
  }
}

export { Middleware, IMiddleware };
