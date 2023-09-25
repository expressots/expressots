import http from "http";

export interface StreamOptions {
  /**
   * Output stream for writing log lines.
   */
  write(str: string): void;
}

/***
 * Morgan accepts these properties in the options object.
 */
export interface OptionsMorgan {
  /***
   * Buffer duration before writing logs to the stream, defaults to false.
   * When set to true, defaults to 1000 ms.
   * @deprecated
   */
  buffer?: boolean | undefined;

  /***
   * Write log line on request instead of response. This means that a
   * requests will be logged even if the server crashes, but data from the
   * response cannot be logged (like the response code).
   */
  immediate?: boolean | undefined;

  /***
   * Function to determine if logging is skipped, defaults to false. This
   * function will be called as skip(req, res).
   */
  skip?(req: http.IncomingMessage, res: http.ServerResponse): boolean;

  /***
   * Output stream for writing log lines, defaults to process.stdout.
   * @param str
   */
  stream?: StreamOptions | undefined;
}

export type FormatFn = (
  tokens: TokenIndexer,
  req: http.IncomingMessage,
  res: http.ServerResponse,
) => string;

export type TokenCallbackFn = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  arg?: string | number,
) => string | number;

export interface TokenIndexer {
  [tokenName: string]: TokenCallbackFn;
}
