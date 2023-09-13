import type { OutgoingHttpHeaders } from "node:http";

export abstract class HttpContent {
  private _headers: OutgoingHttpHeaders = {};

  public get headers(): OutgoingHttpHeaders {
    return this._headers;
  }

  public abstract readAsync(): Promise<
    // eslint-disable-next-line @typescript-eslint/array-type
    string | Record<string, unknown> | Record<string, unknown>[]
  >;
}
