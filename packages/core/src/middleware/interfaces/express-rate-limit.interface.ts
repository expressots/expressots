/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from "express";

type ValueDeterminingMiddleware<T> = (
  request: Request,
  response: Response,
) => T | Promise<T>;

type RateLimitExceededEventHandler = (
  request: Request,
  response: Response,
  next: NextFunction,
  optionsUsed: RateLimitOptions,
) => void;

type ClientRateLimitInfo = {
  totalHits: number;
  resetTime: Date | undefined;
};

type IncrementResponse = ClientRateLimitInfo;

/**
 * An interface that all hit counter stores must implement.
 */
interface Store {
  /**
   * Method that initializes the store, and has access to the options passed to
   * the middleware too.
   *
   * @param options {Options} - The options used to setup the middleware.
   */
  init?: (options: RateLimitOptions) => void;
  /**
   * Method to fetch a client's hit count and reset time.
   *
   * @param key {string} - The identifier for a client.
   *
   * @returns {ClientRateLimitInfo} - The number of hits and reset time for that client.
   */
  get?: (
    key: string,
  ) =>
    | Promise<ClientRateLimitInfo | undefined>
    | ClientRateLimitInfo
    | undefined;
  /**
   * Method to increment a client's hit counter.
   *
   * @param key {string} - The identifier for a client.
   *
   * @returns {IncrementResponse | undefined} - The number of hits and reset time for that client.
   */
  increment: (key: string) => Promise<IncrementResponse> | IncrementResponse;
  /**
   * Method to decrement a client's hit counter.
   *
   * @param key {string} - The identifier for a client.
   */
  decrement: (key: string) => Promise<void> | void;
  /**
   * Method to reset a client's hit counter.
   *
   * @param key {string} - The identifier for a client.
   */
  resetKey: (key: string) => Promise<void> | void;
  /**
   * Method to reset everyone's hit counter.
   */
  resetAll?: () => Promise<void> | void;
  /**
   * Method to shutdown the store, stop timers, and release all resources.
   */
  shutdown?: () => Promise<void> | void;
  /**
   * Flag to indicate that keys incremented in one instance of this store can
   * not affect other instances. Typically false if a database is used, true for
   * MemoryStore.
   *
   * Used to help detect double-counting misconfigurations.
   */
  localKeys?: boolean;
  /**
   * Optional value that the store prepends to keys
   *
   * Used by the double-count check to avoid false-positives when a key is counted twice, but with different prefixes
   */
  prefix?: string;
}

interface Validations {
  enabled: {
    [key: string]: boolean;
  };
  disable(): void;
  /**
   * Checks whether the IP address is valid, and that it does not have a port
   * number in it.
   *
   * See https://github.com/express-rate-limit/express-rate-limit/wiki/Error-Codes#err_erl_invalid_ip_address.
   *
   * @param ip {string | undefined} - The IP address provided by Express as request.ip.
   *
   * @returns {void}
   */
  ip(ip: string | undefined): void;
  /**
   * Makes sure the trust proxy setting is not set to `true`.
   *
   * See https://github.com/express-rate-limit/express-rate-limit/wiki/Error-Codes#err_erl_permissive_trust_proxy.
   *
   * @param request {Request} - The Express request object.
   *
   * @returns {void}
   */
  trustProxy(request: Request): void;
  /**
   * Makes sure the trust proxy setting is set in case the `X-Forwarded-For`
   * header is present.
   *
   * See https://github.com/express-rate-limit/express-rate-limit/wiki/Error-Codes#err_erl_unset_trust_proxy.
   *
   * @param request {Request} - The Express request object.
   *
   * @returns {void}
   */
  xForwardedForHeader(request: Request): void;
  /**
   * Ensures totalHits value from store is a positive integer.
   *
   * @param hits {any} - The `totalHits` returned by the store.
   */
  positiveHits(hits: any): void;
  /**
   * Ensures a given key is incremented only once per request.
   *
   * @param request {Request} - The Express request object.
   * @param store {Store} - The store class.
   * @param key {string} - The key used to store the client's hit count.
   *
   * @returns {void}
   */
  singleCount(request: Request, store: Store, key: string): void;
  /**
   * Warns the user that the behaviour for `max: 0` / `limit: 0` is changing in the next
   * major release.
   *
   * @param limit {number} - The maximum number of hits per client.
   *
   * @returns {void}
   */
  limit(limit: number): void;
  /**
   * Warns the user that the `draft_polli_ratelimit_headers` option is deprecated
   * and will be removed in the next major release.
   *
   * @param draft_polli_ratelimit_headers {any | undefined} - The now-deprecated setting that was used to enable standard headers.
   *
   * @returns {void}
   */
  draftPolliHeaders(draft_polli_ratelimit_headers?: any): void;
  /**
   * Warns the user that the `onLimitReached` option is deprecated and will be removed in the next
   * major release.
   *
   * @param onLimitReached {any | undefined} - The maximum number of hits per client.
   *
   * @returns {void}
   */
  onLimitReached(onLimitReached?: any): void;
  /**
   * Warns the user when the selected headers option requires a reset time but
   * the store does not provide one.
   *
   * @param resetTime {Date | undefined} - The timestamp when the client's hit count will be reset.
   *
   * @returns {void}
   */
  headersResetTime(resetTime?: Date): void;
  /**
   * Checks the options.validate setting to ensure that only recognized validations are enabled or disabled.
   *
   * If any unrecognized values are found, an error is logged that includes the list of supported vaidations.
   */
  validationsConfig(): void;
}

type DraftHeadersVersion = "draft-6" | "draft-7";

interface RateLimitOptions {
  windowMs?: number;
  limit?: number | ValueDeterminingMiddleware<number>;
  message?: any | ValueDeterminingMiddleware<any>;
  statusCode?: number;
  legacyHeaders?: boolean;
  standardHeaders?: false | DraftHeadersVersion;
  requestPropertyName?: string;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: ValueDeterminingMiddleware<string>;
  handler?: RateLimitExceededEventHandler;
  skip?: ValueDeterminingMiddleware<boolean>;
  requestWasSuccessful?: ValueDeterminingMiddleware<boolean>;
  store?: Store;
  validations?: Validations;
}

export { RateLimitOptions };
