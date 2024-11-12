import { ExpressHandler, MiddlewareOptions } from './middleware-service';
import { OptionsJson } from "./interfaces/body-parser.interface";
import { CompressionOptions } from "./interfaces/compression.interface";
import { CookieParserOptions } from "./interfaces/cookie-parser.interface";
import { CookieSessionOptions } from "./interfaces/cookie-session/cookie-session.interface";
import { CorsOptions } from "./interfaces/cors.interface";
import { RateLimitOptions } from "./interfaces/express-rate-limit.interface";
import { SessionOptions } from "./interfaces/express-session.interface";
import { OptionsHelmet } from "./interfaces/helmet.interface";
import { FormatFn, OptionsMorgan } from "./interfaces/morgan.interface";
import { multer } from "./interfaces/multer.interface";
import { ServeFaviconOptions } from "./interfaces/serve-favicon.interface";
import { ServeStaticOptions } from "./interfaces/serve-static.interface";
import { OptionsUrlencoded } from "./interfaces/url-encoded.interface";

/**
 * ErrorHandlerOptions Interface
 *
 * The ErrorHandlerOptions interface specifies the configuration options for the error handler middleware.
 * @param errorHandler: An Express error handler function that takes care of processing errors and formulating the response.
 * @param showStackTrace: A boolean value indicating whether to include the stack trace in the error response. The default value is false.
 * @public API
 */
export interface ErrorHandlerOptions {
    errorHandler?: ExpressHandler;
    showStackTrace?: boolean;
  }

/**
 * Interface for configuring and managing middlewares in the application.
 * Provides methods to be added automatically in the application without the need to import packages.
 * @public API
 */
export interface IMiddleware {
    /**
     * Adds a URL Encoded Parser middleware to the middleware collection.
     * The URL Encoded Parser is responsible for parsing the URL-encoded data in the incoming request bodies.
     *
     * @param options - Optional configuration options for the URL Encoded Parser.
     * @public API
     */
    addUrlEncodedParser(options?: OptionsUrlencoded): void;
  
    /**
     * Adds a Rate Limit middleware to the middleware collection.
     * The rate limiter is responsible for adding dynamic rate limit and request throttling to the application.
     *
     * @param options - Optional configuration options for the rate limiter.
     * @public API
     */
    addRateLimiter(options?: RateLimitOptions): void;
  
    /**
     * Adds a Body Parser middleware to the middleware collection.
     * The body parser is responsible for parsing the incoming request bodies in a middleware.
     *
     * @param options - Optional configuration options for the JSON body parser.
     * @public API
     */
    addBodyParser(options?: OptionsJson): void;
  
    /**
     * Adds Cross-Origin Resource Sharing (CORS) middleware to enable or control cross-origin requests.
     *
     * @param options - Optional configuration options for CORS. Defines the behavior of CORS requests like allowed origins, methods, headers, etc.
     * @public API
     */
    addCors(options?: CorsOptions): void;
  
    /**
     * Adds Compression middleware to reduce the size of the response body and improve the speed of the client-server communication.
     *
     * @param options - Optional configuration options for Compression. Allows fine-tuning the compression behavior, such as setting the compression level, threshold, and filter functions to determine which requests should be compressed.
     * @public API
     */
    addCompression(options?: CompressionOptions): void;
  
    /**
     * Adds Cookie Parser middleware to parse the cookie header and populate req.cookies with an object keyed by the cookie names.
     *
     * @param secret - A string or array used for signing cookies. This is optional and if not specified, the cookie-parser will not parse signed cookies.
     * @param options - Optional configuration options for Cookie Parser.
     * @public API
     */
    addCookieParser(
      secret?: string | Array<string> | undefined,
      options?: CookieParserOptions,
    ): void;
  
    /**
     * Adds Cookie Session middleware to enable cookie-based sessions.
     *
     * @param options - Optional configuration options for Cookie Session. Defines the behavior of cookie sessions like the name of the cookie, keys to sign the cookie, etc.
     * @public API
     */
    addCookieSession(options: CookieSessionOptions): void;
  
    /**
     * Adds Morgan middleware to log HTTP requests.
     *
     * @param format - The log format. Can be a string or a function.
     * @param options - Optional configuration options for Morgan. Defines the behavior of the logger like the output stream, buffer duration, etc.
     * @public API
     */
    addMorgan(format: string | FormatFn, options?: OptionsMorgan): void;
  
    /**
     * Adds a middleware to serve the favicon to the middleware collection.
     * The favicon is the icon that is displayed in the browser tab for the application.
     *
     * @param path - The path to the favicon file.
     * @param options - Optional configuration options for serving the favicon. Defines the behavior of the favicon middleware like cache control, custom headers, etc.
     * @public API
     */
    addServeFavicon(path: string | Buffer, options?: ServeFaviconOptions): void;
  
    /**
     * Add a middleware to enable express-session.
     *
     * @param options - Optional configuration options for Session.
     * @public API
     */
    addSession(options: SessionOptions): void;
  
    /**
     * Configures the error handling middleware for the application.
     *
     * @param options - The object containing the configuration options for the error handler middleware.
     * @option errorHandler - The Express error handler function that takes care of processing errors and formulating the response.
     * @option showStackTrace - A boolean value indicating whether to show the stack trace in the response.
     * @public API
     */
    setErrorHandler(options?: ErrorHandlerOptions): void;
  
    /**
     * Adds a middleware to serve static files from the specified root directory.
     * Allows the application to serve files like images, CSS, JavaScript, etc.
     *
     * @param root - The root directory from which the static assets are to be served.
     * @param options - Optional configuration options for serving static files. Defines behavior like cache control, custom headers, etc.
     * @public API
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
     * @public API
     */
    addMiddleware(options: MiddlewareOptions): void;
  
    /**
     * View middleware pipeline formatted.
     * @returns void
     * @public API
     */
    viewMiddlewarePipeline(): void;
  
    /**
     * Gets the configured error handler middleware.
     *
     * @returns The error handler middleware.
     * @public API
     */
    getErrorHandler(): ExpressHandler;
  
    /**
     * Adds Helmet middleware to enhance security by setting various HTTP headers.
     *
     * @param options - Optional configuration options for Helmet.
     * @returns The configuration options for Helmet middleware.
     * @public API
     */
    addHelmet(options?: OptionsHelmet): void;
  
    /**
     * Adds Multer middleware for handling multipart/form-data, typically used for file uploads.
     *
     * @param options - Optional configuration options for Multer.
     * @returns The Multer middleware.
     * @public API
     */
    setupMulter(options?: multer.Options): multer.Multer;
  }