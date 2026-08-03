import { Application } from "express";

/**
 * Anything the serverless adapters accept as "the app".
 *
 * `micro()` returns a `MicroApp` whose Express instance is behind `getApp()`.
 * The full `AppExpress` surface exposes `getExpressApp()`. Passing a raw
 * `express.Application` is also supported. Accepting all three means users do
 * not have to remember which unwrapping call their host expects — passing the
 * wrong one used to hand Express an object that is not an Express app at all,
 * which fails deep inside the router rather than at the call site.
 */
export type ServerlessApp =
  { getExpressApp?: () => Application } | { getApp?: () => Application } | Application;

/**
 * Default ceiling on a buffered request body, matching the spirit of
 * `express.json()`'s 100 KB default but sized for API payloads.
 *
 * Workers isolates get 128 MB of memory and Cloudflare accepts bodies up to
 * 100 MB, so an unbounded read is an availability hazard: one large upload
 * can OOM the isolate. Configurable per adapter.
 */
export const DEFAULT_MAX_BODY_BYTES = 1_048_576;

/**
 * Content types whose bodies are text and can be UTF-8 decoded safely.
 * Everything else is treated as binary and kept as a Buffer — decoding
 * arbitrary bytes as UTF-8 replaces every invalid sequence with U+FFFD and
 * loses the original irrecoverably, which made file uploads impossible.
 */
export function isTextualContentType(contentType: string | undefined): boolean {
  if (!contentType) {
    // No content type means we cannot know. Text is the safer default
    // here: it preserves the historical behaviour for plain payloads.
    return true;
  }

  return (
    contentType.startsWith("text/") ||
    contentType === "application/json" ||
    contentType.endsWith("+json") ||
    contentType === "application/x-www-form-urlencoded" ||
    contentType === "application/xml" ||
    contentType.endsWith("+xml") ||
    contentType === "application/javascript" ||
    contentType === "application/graphql"
  );
}

/**
 * Statuses whose responses must not carry a body. Passing even an empty
 * Buffer for these throws `TypeError: Invalid response status code` under
 * Node/undici, while workerd tolerates it — so a 204 endpoint would pass in
 * production and fail in its own Jest suite.
 */
export const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);

/**
 * Express middleware that reads the request body as a stream. None of these
 * can work on an edge runtime, because the adapters hand Express a plain
 * mock object rather than a `Readable`. Matched by function name, which is
 * how `body-parser` and friends identify their own middleware.
 */
const STREAM_READING_MIDDLEWARE: Record<string, string> = {
  jsonParser: "express.json()",
  urlencodedParser: "express.urlencoded()",
  textParser: "express.text()",
  rawParser: "express.raw()",
  multerMiddleware: "multer()",
  compression: "compression()",
};

/**
 * Express setting used to tell `micro()` that it is being hosted on a
 * serverless runtime. Stored on the Express app rather than on the `MicroApp`
 * wrapper so it survives being passed as `app.getApp()` — the adapter can set
 * it whichever form it was handed.
 */
export const SERVERLESS_HOST_SETTING = "expressots:serverless-host";

export function resolveExpressApp(app: ServerlessApp): Application {
  if ("getExpressApp" in app && typeof app.getExpressApp === "function") {
    return app.getExpressApp();
  }

  if ("getApp" in app && typeof app.getApp === "function") {
    return app.getApp();
  }

  return app as Application;
}

/**
 * Mark the app as serverless-hosted so `micro()`'s auto-parsers stand down,
 * then reject any body-reading middleware the user registered explicitly.
 *
 * Called at adapter construction, which in a Worker is module scope — so the
 * failure surfaces at `wrangler dev` startup or deploy time rather than as a
 * 500 on every request once real traffic arrives.
 */
export function prepareServerlessApp(app: Application, hostName: string): void {
  // A bare request handler is a legitimate thing to pass here — tests stub
  // one, and `app.use`-less mini-apps exist in the wild. Only a real Express
  // application carries settings, so probe rather than assume.
  if (typeof (app as Partial<Application>).set === "function") {
    app.set(SERVERLESS_HOST_SETTING, true);
  }

  const offender = findStreamReadingMiddleware(app);
  if (offender) {
    throw new Error(
      `${hostName}: ${offender} cannot be used on this runtime.\n` +
        `The adapter parses the request body and hands Express a mock request, ` +
        `not a stream, so body-reading middleware fails on every request — ` +
        `including GET requests with no body.\n` +
        `Read parsed data from req.body instead, and remove the middleware. ` +
        `micro()'s built-in parsers are disabled automatically on this runtime.`,
    );
  }
}

function findStreamReadingMiddleware(app: Application): string | undefined {
  // Express 5 exposes `app.router`; Express 4 used the lazily-built
  // `app._router`. Neither is public API, so every access is defensive:
  // a missing stack must mean "nothing to check", never a crash at import
  // time in a Worker.
  const router = (
    app as unknown as {
      router?: { stack?: Array<{ handle?: { name?: string } }> };
      _router?: { stack?: Array<{ handle?: { name?: string } }> };
    }
  ).router;
  const legacyRouter = (
    app as unknown as {
      _router?: { stack?: Array<{ handle?: { name?: string } }> };
    }
  )._router;

  const stack = router?.stack ?? legacyRouter?.stack;
  if (!Array.isArray(stack)) {
    return undefined;
  }

  for (const layer of stack) {
    const name = layer?.handle?.name;
    if (name && name in STREAM_READING_MIDDLEWARE) {
      return STREAM_READING_MIDDLEWARE[name];
    }
  }

  return undefined;
}
