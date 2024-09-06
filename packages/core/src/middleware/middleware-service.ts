import express, { Request, Response, NextFunction } from "express";

import { provideSingleton } from "../decorator/index";
import defaultErrorHandler from "../error/error-handler-middleware";

import { Logger } from "../provider/logger/logger.provider";
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
import { provide } from "../di/binding-decorator";
import { OptionsUrlencoded } from "./interfaces/url-encoded.interface";

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
 * Expresso middleware interface.
 */
interface IExpressoMiddleware {
  //readonly name: string;
  use(req: Request, res: Response, next: NextFunction): Promise<void> | void;
}

/**
 * Abstract class for creating custom Expresso middleware.
 * Custom middleware classes should extend this class and implement the use method.
 *
 */
@provide(ExpressoMiddleware)
export abstract class ExpressoMiddleware implements IExpressoMiddleware {
  get name(): string {
    return this.constructor.name;
  }

  abstract use(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> | void;
}

/**
 * MiddlewareOptions Type
 *
 * The MiddlewareOptions type represents arguments that can be passed to a middleware function.
 * It can either be a expressjs request handler function, a middleware configuration object that is composed by a route and an expressjs handler or
 */
export type MiddlewareOptions =
  | ExpressHandler
  | MiddlewareConfig
  | IExpressoMiddleware;

/**
 * MiddlewareConfig Interface
 *
 * The MiddlewareConfig interface specifies the structure for middleware configuration objects.
 * - path: Optional. The route path for which the middleware is configured.
 * - middlewares: An array of ExpressHandler types that make up the middleware pipeline for the route specified by 'path'.
 */
type MiddlewareConfig = {
  path?: string;
  middlewares: Array<ExpressHandler | IExpressoMiddleware>;
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
  middleware: ExpressHandler | MiddlewareConfig | IExpressoMiddleware;
}

/**
 * MiddlewareType Enum
 *
 * The MiddlewareType enum represents the various types of middleware that can be added to the middleware collection.
 * - Config: Middleware configuration object.
 * - ExpressHandler: Express request handler function.
 * - IExpressoMiddleware: Custom Expresso middleware.
 */
enum MiddlewareType {
  Config,
  ExpressHandler,
  IExpressoMiddleware,
}

/**
 * ErrorHandlerOptions Interface
 *
 * The ErrorHandlerOptions interface specifies the configuration options for the error handler middleware.
 * @param errorHandler: An Express error handler function that takes care of processing errors and formulating the response.
 * @param showStackTrace: A boolean value indicating whether to include the stack trace in the error response. The default value is false.
 */
export interface ErrorHandlerOptions {
  errorHandler?: ExpressHandler;
  showStackTrace?: boolean;
}

/**
 * Interface for configuring and managing middlewares in the application.
 * Provides methods to be added automatically in the application without the need to import packages.
 */
interface IMiddleware {
  /**
   * Adds a URL Encoded Parser middleware to the middleware collection.
   * The URL Encoded Parser is responsible for parsing the URL-encoded data in the incoming request bodies.
   *
   * @param options - Optional configuration options for the URL Encoded Parser.
   */
  addUrlEncodedParser(options?: OptionsUrlencoded): void;

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
   * @param options - The object containing the configuration options for the error handler middleware.
   * @param errorHandler - The Express error handler function that takes care of processing errors and formulating the response.
   * @param showStackTrace - A boolean value indicating whether to show the stack trace in the response.
   */
  setErrorHandler(options?: ErrorHandlerOptions): void;

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
   * @param options - The Express request handler function to be added to the middleware collection, or a middleware configuration object
   * that is composed by a route and an expressjs handler, or a custom Expresso middleware.
   *
   * @example Express Handler
   *  const middleware = (req, res, next) => {
   *  // Your middleware logic here
   *  next();
   * }
   *
   * @example Middleware Configuration Object
   * const middleware = {
   *  path: "/",
   *  middlewares: [] // Array of Express Handlers
   * }
   *
   * @example Expresso Middleware
   * class CustomMiddleware implements IExpressoMiddleware {
   *  use(req: Request, res: Response, next: NextFunction): Promise<void> | void {
   *   // Your middleware logic here
   *   next();
   *  }
   * }
   */
  addMiddleware(options: MiddlewareOptions): void;

  /**
   * View middleware pipeline formatted.
   * @returns void
   */
  viewMiddlewarePipeline(): void;

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
   * Retrieves the type of the middleware.
   *
   * @param middleware - The middleware to be checked.
   *
   * @returns The type of the middleware.
   */
  private getMiddlewareType(middleware: MiddlewareOptions): MiddlewareType {
    // eslint-disable-next-line no-prototype-builtins
    if (middleware?.hasOwnProperty("path")) {
      return MiddlewareType.Config;
    } else if (middleware instanceof Function) {
      return MiddlewareType.ExpressHandler;
    } else {
      return MiddlewareType.IExpressoMiddleware;
    }
  }

  /**
   * Checks if a middleware with the given name exists in the middleware collection.
   *
   * @param middlewareName - The name of the middleware to be checked.
   *
   * @returns A boolean value indicating whether the middleware exists or not.
   */
  private middlewareExists(middlewareName: string): boolean {
    return this.middlewarePipeline.some((m) => {
      if (m.middleware instanceof Function) {
        return m.middleware.name === middlewareName;
      } else if (m.middleware instanceof Object) {
        return (m.middleware as MiddlewareConfig).path === middlewareName;
      }
      return false;
    });
  }

  /**
   * Adds a URL Encoded Parser middleware to the middleware collection.
   * The URL Encoded Parser is responsible for parsing the URL-encoded data in the incoming request bodies.
   *
   * @param options - Optional configuration options for the URL Encoded Parser.
   */
  addUrlEncodedParser(options?: OptionsUrlencoded): void {
    const middlewareExist = this.middlewareExists("urlencodedParser");

    if (middlewareExist) {
      this.logger.warn(
        `[urlencodedParser] already exists. Skipping...`,
        "configure-service",
      );
    } else {
      this.middlewarePipeline.push({
        timestamp: new Date(),
        middleware: express.urlencoded(options),
      });
    }
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
   * @param options - The object containing the configuration options for the error handler middleware.
   * @param errorHandler - The Express error handler function that takes care of processing errors and formulating the response.
   * @param showStackTrace - A boolean value indicating whether to show the stack trace in the response.
   */
  setErrorHandler(options: ErrorHandlerOptions = {}): void {
    const { errorHandler: errorHandling, showStackTrace } = options;

    if (!errorHandling) {
      this.errorHandler = (error, req, res, next): void => {
        defaultErrorHandler(error, res, next, showStackTrace);
      };
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
   * Helper method to add middleware configuration objects to the middleware collection.
   * @param middleware - The middleware configuration object to be added to the middleware collection.
   * @returns void
   */
  private addConfigMiddleware(middleware: MiddlewareConfig): void {
    // eslint-disable-next-line no-case-declarations
    const config = middleware as MiddlewareConfig;
    let routeExists: boolean = false;

    if (config.middlewares.length === 0) {
      this.logger.warn(
        `No middlewares in the route [${config.path}]. Skipping...`,
        "configure-service",
      );
      return;
    }

    if (this.middlewarePipeline.length === 0) {
      this.middlewarePipeline.push({
        timestamp: new Date(),
        middleware: config,
      });
    } else {
      this.middlewarePipeline.forEach((m) => {
        if ((m.middleware as MiddlewareConfig).path === config.path) {
          this.logger.warn(
            `[${config.path}] route already exists. Skipping...`,
            "configure-service",
          );

          routeExists = true;
        }
      });

      if (!routeExists) {
        this.middlewarePipeline.push({
          timestamp: new Date(),
          middleware: config,
        });
      }
    }
  }

  /**
   * Helper method to add express request handler functions to the middleware collection.
   * @param middleware - The express request handler function to be added to the middleware collection.
   * @returns void
   */
  private addExpressHandlerMiddleware(middleware: ExpressHandler): void {
    let middlewareExists: boolean = false;

    if (this.middlewarePipeline.length === 0) {
      this.middlewarePipeline.push({
        timestamp: new Date(),
        middleware,
      });

      return;
    }

    this.middlewarePipeline.forEach((m) => {
      const mType = this.getMiddlewareType(m.middleware);

      if (mType === MiddlewareType.ExpressHandler) {
        if ((m.middleware as ExpressHandler)?.name === middleware?.name) {
          this.logger.warn(
            `[${middleware?.name}] already exists. Skipping...`,
            "configure-service",
          );

          middlewareExists = true;
          return;
        }
      }
    });

    if (!middlewareExists) {
      this.middlewarePipeline.push({
        timestamp: new Date(),
        middleware,
      });
    }
  }

  /**
   * Helper method to add custom Expresso middleware to the middleware collection.
   * @param middleware - The custom Expresso middleware to be added to the middleware collection.
   * @returns void
   */
  private addIExpressoMiddleware(middleware: IExpressoMiddleware): void {
    let middlewareExists: boolean = false;

    if (this.middlewarePipeline.length === 0) {
      this.middlewarePipeline.push({
        timestamp: new Date(),
        middleware,
      });

      return;
    }

    this.middlewarePipeline.forEach((m) => {
      const mType = this.getMiddlewareType(m.middleware);

      if (mType === MiddlewareType.IExpressoMiddleware) {
        if (
          (m.middleware as IExpressoMiddleware).constructor.name ===
          middleware.constructor.name
        ) {
          this.logger.warn(
            `[${middleware.constructor.name}] already exists. Skipping...`,
            "configure-service",
          );

          middlewareExists = true;
          return;
        }
      }
    });

    if (!middlewareExists) {
      this.middlewarePipeline.push({
        timestamp: new Date(),
        middleware,
      });
    }
  }

  /**
   * Adds a middleware to the middleware collection.
   *
   * @param options - The Express request handler function to be added to the middleware collection, or a middleware configuration object
   * that is composed by a route and an expressjs handler, or a custom Expresso middleware.
   *
   * @example Express Handler
   *  const middleware = (req, res, next) => {
   *    // Your middleware logic here
   *    next();
   *  }
   *
   * @example Middleware Configuration Object
   *  const middleware = {
   *    path: "/",
   *    middlewares: [] // Array of Express Handlers
   *  }
   *
   * @example Expresso Middleware
   *  class CustomMiddleware implements IExpressoMiddleware {
   *    use(req: Request, res: Response, next: NextFunction): Promise<void> | void {
   *    // Your middleware logic here
   *      next();
   *    }
   *  }
   */
  addMiddleware(options: MiddlewareOptions): void {
    switch (this.getMiddlewareType(options)) {
      case MiddlewareType.Config:
        this.addConfigMiddleware(options as MiddlewareConfig);
        break;
      case MiddlewareType.ExpressHandler:
        this.addExpressHandlerMiddleware(options as ExpressHandler);
        break;
      case MiddlewareType.IExpressoMiddleware:
        this.addIExpressoMiddleware(options as IExpressoMiddleware);
        break;
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
   * View middleware pipeline formatted.
   * @returns void
   */
  public viewMiddlewarePipeline(): void {
    const sortedMiddlewarePipeline = this.getMiddlewarePipeline();

    const formattedPipeline = sortedMiddlewarePipeline.map((m) => {
      const middlewareType = this.getMiddlewareType(m.middleware);

      if (middlewareType === MiddlewareType.Config) {
        const middlewareNames = (
          m.middleware as MiddlewareConfig
        ).middlewares.map((mw) => (mw as ExpressHandler)?.name || "Anonymous");

        return {
          timestamp: m.timestamp.toISOString(),
          path: (m.middleware as MiddlewareConfig).path,
          middleware: `[${middlewareNames.join(", ")}]`,
        };
      } else if (middlewareType === MiddlewareType.IExpressoMiddleware) {
        return {
          timestamp: m.timestamp.toISOString(),
          path: (m.middleware as MiddlewareConfig).path ?? "Global",
          middleware: (m.middleware as IExpressoMiddleware).constructor.name,
        };
      } else {
        return {
          timestamp: m.timestamp.toISOString(),
          path: "Global",
          middleware: (m.middleware as ExpressHandler)?.name,
        };
      }
    });

    console.table(formattedPipeline);
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
