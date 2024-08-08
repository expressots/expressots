/* eslint-disable @typescript-eslint/no-explicit-any */
import * as http from "http";

interface Options {
  /** When set to true, then deflated (compressed) bodies will be inflated; when false, deflated bodies are rejected. Defaults to true. */
  inflate?: boolean | undefined;
  /**
   * Controls the maximum request body size. If this is a number,
   * then the value specifies the number of bytes; if it is a string,
   * the value is passed to the bytes library for parsing. Defaults to '100kb'.
   */
  limit?: number | string | undefined;
  /**
   * The type option is used to determine what media type the middleware will parse
   */
  type?:
    | string
    | Array<string>
    | ((req: http.IncomingMessage) => any)
    | undefined;
  /**
   * The verify option, if supplied, is called as verify(req, res, buf, encoding),
   * where buf is a Buffer of the raw request body and encoding is the encoding of the request.
   */
  verify?(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    buf: Buffer,
    encoding: string,
  ): void;
}

/**
 * These are the options available to urlencodedParser.
 */
export interface OptionsUrlencoded extends Options {
  /**
   * The extended option allows to choose between parsing the URL-encoded data
   * with the querystring library (when `false`) or the qs library (when `true`).
   */
  extended?: boolean | undefined;
  /**
   * The parameterLimit option controls the maximum number of parameters
   * that are allowed in the URL-encoded data. If a request contains more parameters than this value,
   * a 413 will be returned to the client. Defaults to 1000.
   */
  parameterLimit?: number | undefined;
}
