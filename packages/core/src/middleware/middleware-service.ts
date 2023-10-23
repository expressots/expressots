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
import { FormatFn, OptionsMorgan } from "./interfaces/morgan.interface";
import { RateLimitOptions } from "./interfaces/express-rate-limit.interface";
import { OptionsHelmet } from "./interfaces/helmet.interface";
import { multer } from "./interfaces/multer.interface";
import { SessionOptions } from "./interfaces/express-session.interface";

/**
 * ExpressHandler Type
 *
 * The ExpressHandler type is a union type that represents various types of Express middleware functions.
 * It can be one of the following types:
 * - express.ErrorRequestHandler: Handles errors in the middleware pipeline.
 * - express.RequestParamHandler: Handles parameters in the middleware pipeline.
 * - express.RequestHandler: General request handler.
 * - undefined: Represents the absence of a handler.
 */
export type ExpressHandler =
  | express.ErrorRequestHandler
  | express.RequestParamHandler
  | express.RequestHandler
  | undefined;

/**
 * MiddlewareArgs Type
 *
 * The MiddlewareArgs type represents arguments that can be passed to a middleware function.
 * It can either be a string (a route or path) or an instance of ExpressHandler.
 */
type MiddlewareArgs = string | ExpressHandler;

/**
 * MiddlewareConfig Interface
 *
 * The MiddlewareConfig interface specifies the structure for middleware configuration objects.
 * - path: Optional. The route path for which the middleware is configured.
 * - middlewares: An array of ExpressHandler types that make up the middleware pipeline for the route specified by 'path'.
 */
type MiddlewareConfig = {
  path?: string;
  middlewares: Array<ExpressHandler>;
};

/**
 * MiddlewarePipeline Interface
 *
 * The MiddlewarePipeline interface represents the metadata and actual middleware to be executed in a middleware pipeline.
 * - timestamp: The date and time at which the middleware was added to the pipeline.
 * - middleware: Can be either an ExpressHandler function or a MiddlewareConfig object defining a more complex middleware setup.
 */
interface MiddlewarePipeline {
  timestamp: Date;
  middleware: ExpressHandler | MiddlewareConfig;
}

/**
 * Interface for configuring and managing middlewares in the application.
 * Provides methods to be added automatically in the application without the need to import packages.
 */
interface IMiddleware {
  /**
   * Adds a Rate Limit middleware to the middleware collection.
   * The rate limiter is responsible for adding dynamic rate limit and request throttling to the application.
   *
   * @param options - Optional configuration options for the rate limiter.
   */
  addRateLimiter(options?: RateLimitOptions): void;

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
   * Adds Morgan middleware to log HTTP requests.
   *
   * @param format - The log format. Can be a string or a function.
   * @param options - Optional configuration options for Morgan. Defines the behavior of the logger like the output stream, buffer duration, etc.
   */
  addMorgan(format: string | FormatFn, options?: OptionsMorgan): void;

  /**
   * Adds a middleware to serve the favicon to the middleware collection.
   * The favicon is the icon that is displayed in the browser tab for the application.
   *
   * @param path - The path to the favicon file.
   * @param options - Optional configuration options for serving the favicon. Defines the behavior of the favicon middleware like cache control, custom headers, etc.
   */
  addServeFavicon(path: string | Buffer, options?: ServeFaviconOptions): void;

  /**
   * Add a middleware to enable express-session.
   *
   * @param options - Optional configuration options for Session.
   *
   */
  addSession(options: SessionOptions): void;

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
  addMiddleware(...middleware: Array<MiddlewareArgs>): void;

  /**
   * Retrieves middleware pipeline in the order they were added.
   *
   * @returns An array of Express request handlers representing the middlewares.
   */
  getMiddlewarePipeline(): Array<MiddlewarePipeline>;

  /**
   * Gets the configured error handler middleware.
   *
   * @returns The error handler middleware.
   */
  getErrorHandler(): ExpressHandler;

  /**
   * Adds Helmet middleware to enhance security by setting various HTTP headers.
   *
   * @param options - Optional configuration options for Helmet.
   * @returns The configuration options for Helmet middleware.
   */
  addHelmet(options?: OptionsHelmet): void;

  /**
   * Adds Multer middleware for handling multipart/form-data, typically used for file uploads.
   *
   * @param options - Optional configuration options for Multer.
   */
  setupMulter(options?: multer.Options): multer.Multer;
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
  private middlewarePipeline: Array<MiddlewarePipeline> = [];
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
    const middlewareIndex = this.middlewarePipeline.findIndex((m) =>
      typeof m.middleware === "object"
        ? m.middleware.middlewares.some((mw) => mw?.name === middlewareName)
        : m.middleware?.name === middlewareName,
    );
    return middlewareIndex !== -1;
  }

  public addRateLimiter(options?: RateLimitOptions): void {
    const middleware = middlewareResolver("rateLimit", options);
    const middlewareExist = this.middlewareExists("rateLimit");

    if (middleware && !middlewareExist) {
      this.middlewarePipeline.push({
        timestamp: new Date(),
        middleware,
      });
    }
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
      this.middlewarePipeline.push({
        timestamp: new Date(),
        middleware: express.json(options),
      });
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
      this.middlewarePipeline.push({
        timestamp: new Date(),
        middleware,
      });
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
      this.middlewarePipeline.push({
        timestamp: new Date(),
        middleware,
      });
    }
  }

  /**
   * Adds Morgan middleware to log HTTP requests.
   *
   * @param format - The log format. Can be a string or a function.
   * @param options - Optional configuration options for Morgan. Defines the behavior of the logger like the output stream, buffer duration, etc.
   */
  addMorgan(
    format: string | FormatFn,
    options?: OptionsMorgan | undefined,
  ): void {
    const middleware = middlewareResolver("morgan", format, options);
    const middlewareExist = this.middlewareExists("morgan");

    if (middleware && !middlewareExist) {
      this.middlewarePipeline.push({
        timestamp: new Date(),
        middleware,
      });
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
      this.middlewarePipeline.push({
        timestamp: new Date(),
        middleware,
      });
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
      this.middlewarePipeline.push({
        timestamp: new Date(),
        middleware,
      });
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
      this.middlewarePipeline.push({
        timestamp: new Date(),
        middleware,
      });
    }
  }

  public setupMulter(options?: multer.Options): multer.Multer {
    const multerMiddleware = middlewareResolver("multer", options);

    const middlewareExist = this.middlewareExists("multer");

    if (multerMiddleware && !middlewareExist) {
      return multerMiddleware as unknown as multer.Multer;
    }

    return null as unknown as multer.Multer;
  }

  /**
   * Adds a middleware to enhance security by setting various HTTP headers.
   *
   * @param options - Optional configuration options for Helmet.
   *
   */
  addHelmet(options?: OptionsHelmet): void {
    const middleware = middlewareResolver("helmet", options);
    const middlewareExist = this.middlewareExists("helmet");
    if (middleware && !middlewareExist) {
      this.middlewarePipeline.push({
        timestamp: new Date(),
        middleware,
      });
    }
  }

  /**
   * Add a middleware to enable express-session.
   *
   * @param options - Optional configuration options for Session.
   *
   */
  addSession(options: SessionOptions): void {
    const middleware = middlewareResolver("session", options);
    const middlewareExist = this.middlewareExists("session");
    if (middleware && !middlewareExist) {
      this.middlewarePipeline.push({
        timestamp: new Date(),
        middleware,
      });
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
      this.middlewarePipeline.push({
        timestamp: new Date(),
        middleware: express.static(root, options),
      });
    }
  }

  /**
   * Adds a middleware to the middleware collection.
   *
   * @param middleware - The Express request handler function to be added to the middleware collection.
   *
   */
  addMiddleware(...middleware: Array<MiddlewareArgs>): void {
    let config: MiddlewareConfig;

    if (typeof middleware[0] === "string") {
      const [path, ...middlewares] = middleware;
      config = {
        path,
        middlewares: middlewares as Array<ExpressHandler>,
      };
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      config = {
        middlewares: middleware as Array<ExpressHandler>,
      };
    }

    if (config.path) {
      // verify if middleware if path already exists
      const middlewareIndex = this.middlewarePipeline.findIndex(
        (m) =>
          typeof m.middleware === "object" && m.middleware.path === config.path,
      );

      if (middlewareIndex !== -1) {
        this.logger.warn(
          `[${config.path}] route already exists. Skipping...`,
          "configure-service",
        );
      } else {
        this.middlewarePipeline.push({
          timestamp: new Date(),
          middleware: config,
        });
      }
    } else {
      config.middlewares.forEach((m) => {
        const middlewareName = m?.name || "anonymous";
        const middlewareExist = this.middlewareExists(middlewareName);

        if (middlewareExist) {
          this.logger.warn(
            `[${middlewareName}] already exists. Skipping...`,
            "configure-service",
          );
        } else {
          this.middlewarePipeline.push({
            timestamp: new Date(),
            middleware: config,
          });
        }
      });
    }
  }

  /**
   * Retrieves middleware pipeline in the order they were added.
   *
   * @returns An array of Express request handlers representing the middlewares.
   */
  public getMiddlewarePipeline(): Array<MiddlewarePipeline> {
    return this.middlewarePipeline.sort((a, b) => {
      return a.timestamp.getTime() - b.timestamp.getTime();
    });
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
