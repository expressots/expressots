/**
 * Vercel Adapter for ExpressoTS Micro API
 *
 * Converts Vercel serverless function requests to Express format.
 */

import { Request, Response } from "express";
import { resolveExpressApp, ServerlessApp } from "./serverless-app.js";

/**
 * Vercel Request type - extends Express Request with Vercel-specific properties
 */
export interface VercelRequest extends Request {
  query: Record<string, string | Array<string>>;
  cookies: Record<string, string>;
  body: unknown;
}

/**
 * Vercel Response type - use Express Response directly to avoid type conflicts
 */
export type VercelResponse = Response;

/**
 * Vercel Handler Type
 */
export type VercelHandler = (req: VercelRequest, res: VercelResponse) => Promise<void>;

/**
 * Vercel Adapter Configuration
 */
export interface VercelAdapterConfig {
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Create a Vercel serverless handler from an Express app
 *
 * @example
 * ```typescript
 * // api/index.ts
 * import { createMicroAPI, vercelAdapter } from "@expressots/adapter-express";
 *
 * const microAPI = createMicroAPI();
 * const app = microAPI.build();
 *
 * app.Middleware.parse();
 * app.Route.get("/api", (req, res) => res.json({ message: "Hello Vercel!" }));
 *
 * export default vercelAdapter(app);
 * ```
 *
 * vercel.json:
 * ```json
 * {
 *   "rewrites": [{ "source": "/api/(.*)", "destination": "/api" }]
 * }
 * ```
 */
export function vercelAdapter(app: ServerlessApp, config?: VercelAdapterConfig): VercelHandler {
  const expressApp = resolveExpressApp(app);

  // Deliberately no `prepareServerlessApp` here. Vercel hands the function a
  // real Node IncomingMessage/ServerResponse pair, so `express.json()` and
  // friends work normally — unlike the Cloudflare and Lambda adapters, which
  // synthesise a mock request. Disabling the parsers here would break working
  // deployments.
  const debug = config?.debug ?? false;

  return async (req: VercelRequest, res: VercelResponse): Promise<void> => {
    if (debug) {
      console.log("[Vercel] Request:", {
        method: req.method,
        url: req.url,
        query: req.query,
      });
    }

    // Vercel passes the request directly to Express
    // We just need to handle the response properly
    return new Promise((resolve) => {
      const originalEnd = res.end.bind(res);

      // Override end to resolve the promise when response is complete
      // Using 'any' to avoid complex Express Response type conflicts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (res as any).end = function (
        this: Response,
        chunk?: unknown,
        encoding?: unknown,
        callback?: () => void,
      ): Response {
        if (debug) {
          console.log("[Vercel] Response:", {
            statusCode: res.statusCode,
          });
        }

        // Call original end with proper typing
        if (typeof chunk === "function") {
          originalEnd();
          (chunk as () => void)();
        } else if (typeof encoding === "function") {
          originalEnd(chunk as string | Buffer);
          (encoding as () => void)();
        } else if (callback) {
          originalEnd(chunk as string | Buffer, encoding as BufferEncoding, callback);
        } else if (encoding) {
          originalEnd(chunk as string | Buffer, encoding as BufferEncoding);
        } else if (chunk) {
          originalEnd(chunk as string | Buffer);
        } else {
          originalEnd();
        }

        resolve();
        return this;
      };

      // Handle request through Express
      try {
        expressApp(req as Request, res as Response, (err: unknown) => {
          if (err) {
            console.error("[Vercel] Express error:", err);
            // Details stay in the log; the response body must not leak
            // internal error messages or stack fragments to the client.
            res.status(500).json({ error: "Internal Server Error" });
            resolve();
          }
        });
      } catch (error: unknown) {
        console.error("[Vercel] Handler error:", error);
        res.status(500).json({ error: "Internal Server Error" });
        resolve();
      }
    });
  };
}
