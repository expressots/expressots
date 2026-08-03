/**
 * AWS Lambda Adapter for ExpressoTS Micro API
 *
 * Converts Lambda events to Express requests and responses.
 */

import { prepareServerlessApp, resolveExpressApp, ServerlessApp } from "./serverless-app.js";

/**
 * AWS Lambda Event (simplified)
 */
export interface LambdaEvent {
  httpMethod: string;
  path: string;
  headers?: Record<string, string>;
  queryStringParameters?: Record<string, string>;
  body?: string;
  isBase64Encoded?: boolean;
  requestContext?: {
    requestId?: string;
    stage?: string;
  };
}

/**
 * AWS Lambda Context
 */
export interface LambdaContext {
  awsRequestId: string;
  functionName: string;
  functionVersion: string;
  invokedFunctionArn: string;
  memoryLimitInMB: string;
  logGroupName: string;
  logStreamName: string;
  getRemainingTimeInMillis(): number;
}

/**
 * AWS Lambda Response
 */
export interface LambdaResponse {
  statusCode: number;
  headers: Record<string, string>;
  /**
   * Headers that legitimately repeat — `Set-Cookie` above all. API Gateway
   * merges this with `headers`, so a header appears in exactly one of the
   * two, never both. Only present when some header was set more than once.
   */
  multiValueHeaders?: Record<string, Array<string>>;
  body: string;
  isBase64Encoded: boolean;
}

/**
 * AWS Lambda Handler Type
 */
export type LambdaHandler = (event: LambdaEvent, context: LambdaContext) => Promise<LambdaResponse>;

/**
 * AWS Lambda Adapter Configuration
 */
export interface LambdaAdapterConfig {
  /** Binary content types (will be base64 encoded) */
  binaryContentTypes?: Array<string>;
  /** Enable debug logging */
  debug?: boolean;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
}

/**
 * Create an AWS Lambda handler from an Express app
 *
 * @example
 * ```typescript
 * import { createMicroAPI, awsLambdaAdapter } from "@expressots/adapter-express";
 *
 * const microAPI = createMicroAPI();
 * const app = microAPI.build();
 *
 * app.Middleware.parse();
 * app.Route.get("/", (req, res) => res.json({ message: "Hello Lambda!" }));
 *
 * export const handler = awsLambdaAdapter(app);
 * ```
 */
export function awsLambdaAdapter(app: ServerlessApp, config?: LambdaAdapterConfig): LambdaHandler {
  const expressApp = resolveExpressApp(app);

  // Like Cloudflare, this adapter hands Express a mock request rather than a
  // stream, so body-reading middleware cannot work here either.
  prepareServerlessApp(expressApp, "awsLambdaAdapter");

  const binaryTypes = config?.binaryContentTypes ?? [
    "application/octet-stream",
    "image/*",
    "audio/*",
    "video/*",
    "font/*",
  ];
  const debug = config?.debug ?? false;

  return async (event: LambdaEvent, context: LambdaContext): Promise<LambdaResponse> => {
    if (debug) {
      console.log("[Lambda] Event:", JSON.stringify(event, null, 2));
    }

    // Parse body
    let body: string | Buffer | object | undefined;
    if (event.body) {
      let rawBody: string | Buffer;
      if (event.isBase64Encoded) {
        rawBody = Buffer.from(event.body, "base64");
      } else {
        rawBody = event.body;
      }

      // Parse JSON body if content-type is application/json
      const contentType = event.headers?.["content-type"] || event.headers?.["Content-Type"] || "";
      if (contentType.includes("application/json")) {
        try {
          const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody;
          body = JSON.parse(bodyStr);
        } catch {
          // Keep as raw if JSON parsing fails
          body = rawBody;
        }
      } else {
        body = rawBody;
      }
    }

    // Build request URL
    const queryString = event.queryStringParameters
      ? "?" +
        Object.entries(event.queryStringParameters)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
          .join("&")
      : "";
    const url = event.path + queryString;

    // Build headers
    const headers: Record<string, string> = {
      ...event.headers,
    };

    // Add Lambda context to headers
    headers["x-lambda-request-id"] = context.awsRequestId;
    headers["x-lambda-function"] = context.functionName;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return new Promise((resolve, _reject) => {
      // Create mock Express-compatible request object
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const req: any = {
        method: event.httpMethod,
        url,
        path: event.path,
        headers,
        body,
        query: event.queryStringParameters || {},
        params: {},
        lambda: { event, context },
        get: (name: string) => headers[name.toLowerCase()],
      };

      // Create mock Express-compatible response object.
      const chunks: Array<Buffer> = [];

      // Values are kept as arrays so repeatable headers survive. A plain
      // Record silently collapses two Set-Cookie calls into one malformed
      // header, which breaks any cookie-based session.
      const headerValues = new Map<string, Array<string>>();
      const appendHeader = (name: string, value: string | Array<string>): void => {
        const key = name.toLowerCase();
        const existing = headerValues.get(key) ?? [];
        for (const entry of Array.isArray(value) ? value : [value]) {
          existing.push(String(entry));
        }
        headerValues.set(key, existing);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = {
        statusCode: 200,
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
          const contentType = headerValues.get("content-type")?.[0] || "";
          const isBinary = binaryTypes.some((type) => {
            if (type.endsWith("/*")) {
              return contentType.startsWith(type.replace("/*", "/"));
            }
            return contentType === type;
          });

          // A header goes in exactly one of the two maps: API Gateway merges
          // them, so listing a value in both would emit it twice.
          const responseHeaders: Record<string, string> = {};
          const multiValueHeaders: Record<string, Array<string>> = {};
          headerValues.forEach((values, name) => {
            if (values.length > 1) {
              multiValueHeaders[name] = values;
            } else {
              responseHeaders[name] = values[0];
            }
          });

          const response: LambdaResponse = {
            statusCode: res.statusCode,
            headers: responseHeaders,
            ...(Object.keys(multiValueHeaders).length > 0 ? { multiValueHeaders } : {}),
            body: isBinary ? bodyBuffer.toString("base64") : bodyBuffer.toString("utf8"),
            isBase64Encoded: isBinary,
          };

          if (debug) {
            console.log("[Lambda] Response:", {
              statusCode: response.statusCode,
              headers: response.headers,
              bodyLength: response.body.length,
            });
          }

          resolve(response);
        },
        status: (code: number) => {
          res.statusCode = code;
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
            console.error("[Lambda] Express error:", err);
            resolve({
              statusCode: 500,
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ error: err.message }),
              isBase64Encoded: false,
            });
          }
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[Lambda] Handler error:", error);
        resolve({
          statusCode: 500,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ error: errorMessage }),
          isBase64Encoded: false,
        });
      }
    });
  };
}
