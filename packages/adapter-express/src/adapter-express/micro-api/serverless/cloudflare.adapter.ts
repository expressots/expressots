/**
 * Cloudflare Workers Adapter for ExpressoTS Micro API
 *
 * Converts Cloudflare Workers requests to Express format.
 * Note: This adapter requires a Cloudflare Workers-compatible Express implementation
 * or uses a fetch-based approach.
 */

import qs from "qs";
import {
  DEFAULT_MAX_BODY_BYTES,
  isTextualContentType,
  NULL_BODY_STATUSES,
  prepareServerlessApp,
  resolveExpressApp,
  ServerlessApp,
} from "./serverless-app.js";

function jsonResponse(status: number, payload: unknown): globalThis.Response {
  return new globalThis.Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function badRequest(): globalThis.Response {
  return jsonResponse(400, { error: "Bad Request" });
}

function payloadTooLarge(limit: number): globalThis.Response {
  return jsonResponse(413, { error: "Payload Too Large", limit });
}

/**
 * Turn a parsed `FormData` into a plain object.
 *
 * Repeated field names become arrays, matching how `qs` treats repeated
 * urlencoded keys. File parts keep their bytes as a Buffer rather than being
 * stringified.
 */
async function formDataToObject(form: globalThis.FormData): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {};

  const entries: Array<[string, globalThis.FormDataEntryValue]> = [];
  form.forEach((value, key) => {
    entries.push([key, value]);
  });

  for (const [key, value] of entries) {
    let parsed: unknown;

    if (typeof value === "string") {
      parsed = value;
    } else {
      const file = value as globalThis.File;
      parsed = {
        filename: file.name,
        contentType: file.type,
        size: file.size,
        data: Buffer.from(await file.arrayBuffer()),
      };
    }

    const existing = result[key];
    if (existing === undefined) {
      result[key] = parsed;
    } else if (Array.isArray(existing)) {
      existing.push(parsed);
    } else {
      result[key] = [existing, parsed];
    }
  }

  return result;
}

/**
 * Cloudflare Workers Environment bindings
 */
export interface CloudflareEnv {
  [key: string]: unknown;
}

/**
 * Cloudflare Workers Execution Context
 */
export interface CloudflareContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

/**
 * Cloudflare Workers Handler Type
 */
export type CloudflareHandler = {
  fetch(
    request: globalThis.Request,
    env: CloudflareEnv,
    ctx: CloudflareContext,
  ): Promise<globalThis.Response>;
};

/**
 * Cloudflare Adapter Configuration
 */
export interface CloudflareAdapterConfig {
  /** Enable debug logging */
  debug?: boolean;
  /**
   * Maximum buffered request body in bytes. Bodies whose `content-length`
   * exceeds this are rejected with 413 before being read. Defaults to 1 MiB.
   * Set to `0` to disable the limit (not recommended: a Workers isolate has
   * 128 MB of memory and Cloudflare accepts bodies up to 100 MB).
   */
  maxBodySize?: number;
}

/**
 * A file received in a `multipart/form-data` body.
 *
 * Multipart is parsed with the runtime's native `FormData`, so bytes survive
 * intact — `multer` and friends cannot run on this target.
 */
export interface CloudflareUploadedFile {
  filename: string;
  contentType: string;
  size: number;
  data: Buffer;
}

/**
 * Create a Cloudflare Workers handler from an Express app
 *
 * Note: Full Express compatibility in Cloudflare Workers requires
 * additional setup. This adapter provides a basic implementation.
 *
 * @example
 * ```typescript
 * // src/api.ts
 * import { cloudflareAdapter, micro } from "@expressots/adapter-express";
 *
 * const app = micro({
 *   autoParseJson: false,
 *   showBanner: false,
 *   studio: { enabled: false },
 * });
 *
 * app.get("/", () => ({ message: "Hello Workers!" }));
 *
 * export default cloudflareAdapter(app.getApp());
 * ```
 *
 * wrangler.toml:
 * ```toml
 * name = "my-worker"
 * main = "src/api.ts"
 * compatibility_date = "2026-07-29"
 * compatibility_flags = ["nodejs_compat"]
 * ```
 */
export function cloudflareAdapter(
  app: ServerlessApp,
  config?: CloudflareAdapterConfig,
): CloudflareHandler {
  const expressApp = resolveExpressApp(app);

  // Runs at module scope in a Worker, so an unusable middleware stack fails
  // at `wrangler dev` startup / deploy rather than as a 500 per request.
  prepareServerlessApp(expressApp, "cloudflareAdapter");

  const debug = config?.debug ?? false;
  const maxBodySize = config?.maxBodySize ?? DEFAULT_MAX_BODY_BYTES;

  return {
    async fetch(
      request: globalThis.Request,
      env: CloudflareEnv,
      ctx: CloudflareContext,
    ): Promise<globalThis.Response> {
      const url = new URL(request.url);

      if (debug) {
        console.log("[Cloudflare] Request:", {
          method: request.method,
          url: request.url,
          path: url.pathname,
        });
      }

      // Parse body if present
      let body: unknown;
      if (request.method !== "GET" && request.method !== "HEAD") {
        const contentType = request.headers
          .get("content-type")
          ?.split(";", 1)[0]
          .trim()
          .toLowerCase();

        // Reject oversized bodies from the declared length, before reading a
        // single byte. Bodies sent without content-length are still capped
        // below, but only after buffering — streaming is #947.
        const declaredLength = Number(request.headers.get("content-length"));
        if (maxBodySize > 0 && Number.isFinite(declaredLength) && declaredLength > maxBodySize) {
          return payloadTooLarge(maxBodySize);
        }

        if (contentType === "multipart/form-data") {
          // The runtime's own multipart parser. Hand-decoding would repeat
          // the UTF-8 corruption this whole branch exists to avoid.
          try {
            const form = await request.formData();
            body = await formDataToObject(form);
          } catch {
            return badRequest();
          }
        } else {
          // Read as bytes first so the size cap applies even without a
          // content-length header, and so non-text payloads survive intact.
          const raw = Buffer.from(await request.arrayBuffer());

          if (maxBodySize > 0 && raw.byteLength > maxBodySize) {
            return payloadTooLarge(maxBodySize);
          }

          if (raw.byteLength > 0) {
            if (!isTextualContentType(contentType)) {
              // Binary stays binary. `request.text()` would UTF-8 decode it
              // and replace every invalid sequence with U+FFFD, silently and
              // irrecoverably corrupting uploads.
              body = raw;
            } else {
              const requestBody = raw.toString("utf8");
              const isJson = contentType === "application/json" || contentType?.endsWith("+json");

              if (isJson) {
                try {
                  body = JSON.parse(requestBody);
                } catch {
                  return badRequest();
                }
              } else if (contentType === "application/x-www-form-urlencoded") {
                // qs, not URLSearchParams: it is what express.urlencoded({
                // extended: true }) uses, so `a=1&a=2`, `n[]=x` and
                // `u[name]=jo` produce the same shapes they do on Node.
                body = qs.parse(requestBody);
              } else {
                body = requestBody;
              }
            }
          }
        }
      }

      // Build query parameters with the same parser Express uses, so
      // `?tag=a&tag=b` is an array here as well rather than the last value
      // winning.
      const query = qs.parse(url.search.replace(/^\?/, ""));

      // Build headers
      const headers: Record<string, string> = {};
      request.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });

      return new Promise((resolve) => {
        // Create mock Express-compatible request object
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const req: any = {
          method: request.method,
          url: url.pathname + url.search,
          path: url.pathname,
          headers,
          query,
          params: {},
          body,
          get: (name: string) => headers[name.toLowerCase()],
          cloudflare: { env, ctx },
        };

        // Create mock Express-compatible response object.
        const chunks: Array<Buffer> = [];

        // Values are kept as arrays so repeatable headers survive. Set-Cookie
        // is the one that matters: a Record collapses two cookies into one
        // comma-joined value, which breaks every cookie-based session. The
        // Headers object is built from this at the end, via append().
        const headerValues = new Map<string, Array<string>>();
        const appendHeader = (name: string, value: string | Array<string>): void => {
          const key = name.toLowerCase();
          const existing = headerValues.get(key) ?? [];
          for (const entry of Array.isArray(value) ? value : [value]) {
            existing.push(String(entry));
          }
          headerValues.set(key, existing);
        };
        let statusCode = 200;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res: any = {
          setHeader: (name: string, value: string | Array<string>) => {
            headerValues.delete(name.toLowerCase());
            appendHeader(name, value);
          },
          appendHeader: (name: string, value: string | Array<string>) => {
            appendHeader(name, value);
          },
          getHeader: (name: string) => {
            const values = headerValues.get(name.toLowerCase());
            if (!values) return undefined;
            return values.length > 1 ? values : values[0];
          },
          removeHeader: (name: string) => {
            headerValues.delete(name.toLowerCase());
          },
          write: (chunk: string | Buffer) => {
            chunks.push(Buffer.from(chunk));
          },
          end: (chunk?: string | Buffer) => {
            if (chunk) {
              chunks.push(Buffer.from(chunk));
            }

            const bodyBuffer = Buffer.concat(chunks);

            // append() rather than the Headers constructor, so a header set
            // more than once emits more than once.
            const responseHeaders = new globalThis.Headers();
            headerValues.forEach((values, name) => {
              for (const value of values) {
                responseHeaders.append(name, value);
              }
            });

            if (debug) {
              const debugHeaders: Record<string, Array<string>> = {};
              headerValues.forEach((values, name) => {
                debugHeaders[name] = values;
              });
              console.log("[Cloudflare] Response:", {
                statusCode,
                headers: debugHeaders,
                bodyLength: bodyBuffer.length,
              });
            }

            // 204/205/304 and friends must carry no body at all. workerd
            // tolerates an empty Buffer here, but Node/undici throws — which
            // would make a 204 endpoint pass in production and fail in its
            // own Jest suite.
            resolve(
              new globalThis.Response(NULL_BODY_STATUSES.has(statusCode) ? null : bodyBuffer, {
                status: statusCode,
                headers: responseHeaders,
              }),
            );
          },
          status: (code: number) => {
            statusCode = code;
            return res;
          },
          json: (data: unknown) => {
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify(data));
          },
          send: (data: unknown) => {
            if (typeof data === "string") {
              res.setHeader("content-type", "text/html");
              res.end(data);
            } else if (Buffer.isBuffer(data)) {
              res.end(data);
            } else {
              res.json(data);
            }
          },
        };

        // `res.statusCode = 201` is ordinary Express, and several third-party
        // middlewares set it directly rather than calling res.status(). Back
        // it with the same storage res.status() writes to, or the assignment
        // is silently dropped and the response goes out as 200.
        Object.defineProperty(res, "statusCode", {
          get: () => statusCode,
          set: (code: number) => {
            statusCode = code;
          },
          enumerable: true,
          configurable: true,
        });

        // Handle request through Express
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          expressApp(req, res, (err: any) => {
            if (err) {
              console.error("[Cloudflare] Express error:", err);
              // Details stay in the log; the response body must not leak
              // internal error messages or stack fragments.
              resolve(
                new globalThis.Response(JSON.stringify({ error: "Internal Server Error" }), {
                  status: 500,
                  headers: {
                    "content-type": "application/json",
                  },
                }),
              );
            } else {
              resolve(
                new globalThis.Response(JSON.stringify({ error: "Not Found" }), {
                  status: 404,
                  headers: { "content-type": "application/json" },
                }),
              );
            }
          });
        } catch (error: unknown) {
          console.error("[Cloudflare] Handler error:", error);
          resolve(
            new globalThis.Response(JSON.stringify({ error: "Internal Server Error" }), {
              status: 500,
              headers: { "content-type": "application/json" },
            }),
          );
        }
      });
    },
  };
}
