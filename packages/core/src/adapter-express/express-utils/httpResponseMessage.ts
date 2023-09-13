import type { OutgoingHttpHeaders } from "node:http";
import { HttpContent } from "./content/httpContent";

export class HttpResponseMessage {
  private _content!: HttpContent;

  private _headers: OutgoingHttpHeaders = {};

  public get headers(): OutgoingHttpHeaders {
    return this._headers;
  }

  public set headers(headers: OutgoingHttpHeaders) {
    this._headers = headers;
  }

  public get content(): HttpContent {
    return this._content;
  }

  public set content(value: HttpContent) {
    this._content = value;
  }

  private _statusCode!: number;

  public get statusCode(): number {
    return this._statusCode;
  }

  public set statusCode(code: number) {
    if (code < 0 || code > 999) {
      throw new Error(`${code} is not a valid status code`);
    }

    this._statusCode = code;
  }

  constructor(statusCode = 200) {
    this.statusCode = statusCode;
  }
}
