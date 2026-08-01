/**
 * Cloudflare Workers Adapter for ExpressoTS Micro API
 *
 * Converts Cloudflare Workers requests to Express format.
 * Note: This adapter requires a Cloudflare Workers-compatible Express implementation
 * or uses a fetch-based approach.
 */

import { Application } from "express";

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
  app: { getExpressApp?: () => Application } | Application,
  config?: CloudflareAdapterConfig,
): CloudflareHandler {
  const expressApp =
    "getExpressApp" in app && app.getExpressApp ? app.getExpressApp() : (app as Application);

  const debug = config?.debug ?? false;

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
        const requestBody = await request.text();
        if (requestBody) {
          const contentType = request.headers
            .get("content-type")
            ?.split(";", 1)[0]
            .trim()
            .toLowerCase();
          const isJson = contentType === "application/json" || contentType?.endsWith("+json");

          if (isJson) {
            try {
              body = JSON.parse(requestBody);
            } catch {
              return new globalThis.Response(JSON.stringify({ error: "Bad Request" }), {
                status: 400,
                headers: { "content-type": "application/json" },
              });
            }
          } else if (contentType === "application/x-www-form-urlencoded") {
            body = Object.fromEntries(new URLSearchParams(requestBody));
          } else {
            body = requestBody;
          }
        }
      }

      // Build query parameters
      const query: Record<string, string> = {};
      url.searchParams.forEach((value, key) => {
        query[key] = value;
      });

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

        // Create mock Express-compatible response object
        const chunks: Array<Buffer> = [];
        const responseHeaders: Record<string, string> = {};
        let statusCode = 200;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res: any = {
          statusCode: 200,
          setHeader: (name: string, value: string) => {
            responseHeaders[name.toLowerCase()] = value;
          },
          getHeader: (name: string) => responseHeaders[name.toLowerCase()],
          write: (chunk: string | Buffer) => {
            chunks.push(Buffer.from(chunk));
          },
          end: (chunk?: string | Buffer) => {
            if (chunk) {
              chunks.push(Buffer.from(chunk));
            }

            const bodyBuffer = Buffer.concat(chunks);

            if (debug) {
              console.log("[Cloudflare] Response:", {
                statusCode,
                headers: responseHeaders,
                bodyLength: bodyBuffer.length,
              });
            }

            resolve(
              new globalThis.Response(bodyBuffer, {
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
