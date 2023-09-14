/**
 * Represents the possible values for the `origin` property in the `CorsOptions` interface.
 */
// eslint-disable-next-line @typescript-eslint/array-type
type StaticOrigin = boolean | string | RegExp | (boolean | string | RegExp)[];

/**
 * A function type to define a custom origin configuration in the `CorsOptions` interface.
 *
 * @param requestOrigin - The origin of the incoming request, or undefined if not available.
 * @param callback - A callback function to indicate whether the request origin is allowed or not.
 */
type CustomOrigin = (
  requestOrigin: string | undefined,
  callback: (err: Error | null, origin?: StaticOrigin) => void,
) => void;

/**
 * Interface to define Cross-Origin Resource Sharing (CORS) options.
 */
interface CorsOptions {
  /**
   * Configures the Access-Control-Allow-Origin CORS header.
   *
   * @default '*' (allows requests from any origin)
   */
  origin?: StaticOrigin | CustomOrigin | undefined;
  /**
   * Configures the Access-Control-Allow-Methods CORS header.
   *
   * @default 'GET,HEAD,PUT,PATCH,POST,DELETE' (allows these HTTP methods)
   */
  methods?: string | Array<string> | undefined;

  /**
   * Configures the Access-Control-Allow-Headers CORS header.
   */
  allowedHeaders?: string | Array<string> | undefined;

  /**
   * Configures the Access-Control-Expose-Headers CORS header.
   */
  exposedHeaders?: string | Array<string> | undefined;

  /**
   * Configures the Access-Control-Allow-Credentials CORS header.
   */
  credentials?: boolean | undefined;

  /**
   * Configures the Access-Control-Max-Age CORS header.
   */
  maxAge?: number | undefined;

  /**
   * If true, allows preflight requests to pass to the next handler.
   *
   * @default false
   */
  preflightContinue?: boolean | undefined;

  /**
   * Defines the status code to be sent to the client on a successful OPTIONS request, as a part of the preflight request.
   *
   * @default 204
   */
  optionsSuccessStatus?: number | undefined;
}

export { CorsOptions };
