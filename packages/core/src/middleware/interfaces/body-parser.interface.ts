/* eslint-disable @typescript-eslint/no-explicit-any */
import * as http from "http";

interface OptionsJson {
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
  /**
   *
   * The reviver option is passed directly to JSON.parse as the second argument.
   */
  reviver?(key: string, value: any): any;
  /**
   * When set to `true`, will only accept arrays and objects;
   * when `false` will accept anything JSON.parse accepts. Defaults to `true`.
   */
  strict?: boolean | undefined;
}

export { OptionsJson };
