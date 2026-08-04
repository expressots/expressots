import {
  Logger,
  getRouteRegistry,
  getErrorHints,
  getDefaultSuggestionsConfig,
  formatSuggestions,
} from "@expressots/core";
import { IConsoleMessage } from "@expressots/shared";
import express from "express";
import { Server } from "http";
import { disableBuffering } from "../log-buffer.js";
import {
  initializeStudio,
  stopStudio,
  isStudioEnabled as checkStudioEnabled,
  getStudioAgent,
  reportStudioRuntimeInfo,
  rescanStudioRoutes,
} from "../studio/index.js";
import { SERVERLESS_HOST_SETTING } from "./serverless/serverless-app.js";

/**
 * Minimal configuration for micro API
 * @public API
 */
export interface MicroConfig {
  /** Disable automatic JSON parsing (default: true) */
  autoParseJson?: boolean;
  /** Global route prefix (e.g., "/api") */
  globalPrefix?: string;
  /** Show startup banner (default: true) */
  showBanner?: boolean;
  /** Application environment. Auto-detected from NODE_ENV if not provided. */
  environment?: string;
  /** Studio Agent configuration. Auto-enabled in development when the package is installed. */
  studio?: {
    /** Explicitly enable/disable Studio (default: auto-detect in development) */
    enabled?: boolean;
    /** WebSocket port for the Studio Agent (default: 3334) */
    port?: number;
    /** Path to the SQLite database (default: ".studio/studio.db") */
    dbPath?: string;
    /** Service name shown in Studio (default: "expressots-micro") */
    serviceName?: string;
  };
}

/**
 * Route handler that can return a value or use res directly
 */
type RouteHandler = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => unknown | Promise<unknown>;

/**
 * Middleware type (Express-compatible)
 */
type Middleware = express.RequestHandler | express.ErrorRequestHandler;

/**
 * Pure simplicity micro API interface
 * @public API
 */
export interface MicroApp {
  /** Register a GET route */
  get(path: string, ...handlers: [...Array<Middleware>, RouteHandler]): this;

  /** Register a POST route */
  post(path: string, ...handlers: [...Array<Middleware>, RouteHandler]): this;

  /** Register a PUT route */
  put(path: string, ...handlers: [...Array<Middleware>, RouteHandler]): this;

  /** Register a PATCH route */
  patch(path: string, ...handlers: [...Array<Middleware>, RouteHandler]): this;

  /** Register a DELETE route */
  delete(path: string, ...handlers: [...Array<Middleware>, RouteHandler]): this;

  /** Add global middleware */
  use(...middleware: Array<Middleware>): this;
  use(path: string, ...middleware: Array<Middleware>): this;

  /** Set custom error handler */
  setErrorHandler(handler: express.ErrorRequestHandler): this;

  /** Start listening for requests */
  listen(port: number | string, appInfo?: IConsoleMessage): Promise<void>;

  /** Get the underlying HTTP server (null before listen resolves) */
  getHttpServer(): Server | null;

  /** Get the Express app instance (for advanced use) */
  getApp(): express.Application;

  /** Configure Studio integration (call before listen) */
  setStudio(config: NonNullable<MicroConfig["studio"]>): this;

  /** Check if Studio Agent is currently enabled */
  isStudioEnabled(): boolean;
}

/**
 * Create a new micro API instance
 *
 * @example
 * ```typescript
 * const app = micro();
 * app.get("/", () => "Hello World");
 * app.listen(3000);
 * ```
 *
 * @param config - Optional configuration
 * @returns MicroApp instance
 * @public API
 */
export function micro(config?: MicroConfig): MicroApp {
  // Disable the banner-first log buffering; micro() has no banner system.
  // Imported from ./log-buffer directly rather than via AppExpress: pulling
  // in AppExpress for this one call dragged the whole DI/full-framework
  // stack into every micro build (141 KiB gzip on a Worker).
  // This restores normal console output for micro API users
  disableBuffering();

  const app = express();
  const logger = new Logger();
  const globalPrefix = config?.globalPrefix?.replace(/\/$/, "") || "";
  let httpServer: Server;
  let errorHandler: express.ErrorRequestHandler | null = null;
  let studioConfig: NonNullable<MicroConfig["studio"]> = config?.studio ?? {};

  // Lazy proxy for the Studio Agent middleware. Installed at position 0 so
  // it always runs before route handlers — even though initializeStudio()
  // is only called in listen(). Once the agent starts, it sets the real
  // handler; until then the proxy is a no-op pass-through.
  let studioMiddlewareDelegate: express.RequestHandler | null = null;
  app.use((req, res, next) => {
    if (studioMiddlewareDelegate) {
      return studioMiddlewareDelegate(req, res, next);
    }
    next();
  });

  // Finalize the middleware stack on the first request. `listen()` also calls
  // this, but serverless adapters consume `getApp()` and never call `listen()`
  // — so without a lazy trigger the 404 fallback and setErrorHandler would be
  // dead on Cloudflare, Vercel and Lambda. Registered here, ahead of user
  // routes, so that by the time a request falls through the stack the
  // terminal handlers have been appended.
  app.use((_req, _res, next) => {
    finalize();
    next();
  });

  // Auto-enable JSON parsing by default.
  //
  // The parsers are wrapped rather than registered directly: on a serverless
  // runtime that synthesises a mock request, body-parser reaches for
  // `req.socket` and throws on *every* request, including GETs with no body.
  // The adapter sets SERVERLESS_HOST_SETTING at construction, and these stand
  // down — the adapter has already parsed the body by then, so nothing is
  // lost. The wrapper name matters: it must not collide with the names
  // `prepareServerlessApp` rejects, or micro's own parsers would trip its
  // guard.
  if (config?.autoParseJson !== false) {
    const parsers = [express.json(), express.urlencoded({ extended: true })];

    for (const parser of parsers) {
      app.use(function expressotsAutoParser(req, res, next) {
        if (app.get(SERVERLESS_HOST_SETTING)) {
          return next();
        }
        return parser(req, res, next);
      });
    }
  }

  /**
   * Wrap handler to auto-send return values
   */
  const wrapHandler = (handler: RouteHandler): express.RequestHandler => {
    return async (req, res, next) => {
      try {
        const result = await handler(req, res, next);

        // If response already sent, don't send again
        if (res.headersSent) {
          return;
        }

        // Auto-send return values
        if (result !== undefined) {
          if (typeof result === "string") {
            res.send(result);
          } else {
            res.json(result);
          }
        }
      } catch (error) {
        next(error);
      }
    };
  };

  /**
   * Register a route with Express-style middleware ordering
   */
  const route = (
    method: "get" | "post" | "put" | "patch" | "delete",
    path: string,
    ...handlers: [...Array<Middleware>, RouteHandler]
  ): MicroApp => {
    const fullPath = `${globalPrefix}${path.startsWith("/") ? path : `/${path}`}`;
    const handler = handlers.pop() as RouteHandler;
    const middleware = handlers as Array<Middleware>;

    app[method](fullPath, ...middleware, wrapHandler(handler));
    logger.info(`Route ${method.toUpperCase()} '${fullPath}' registered`, "micro");

    // Register in the suggestions engine so 404s can produce "Did you mean ...?"
    try {
      getRouteRegistry().register(method.toUpperCase(), fullPath, fullPath);
    } catch {
      // Suggestions registry is optional; never fail registration because of it.
    }

    return microApp;
  };

  /**
   * Install a catch-all 404 fallback that mirrors the behavior of the full
   * inversify-express-server: log "Did you mean ...?" via the framework Logger
   * and respond with a structured RFC-7807-style JSON body.
   *
   * Skipped entirely when the suggestion engine is disabled (the env-aware
   * default disables it in NODE_ENV=production).
   */
  const installNotFoundHandler = (): void => {
    app.use((req, res, next) => {
      if (res.headersSent) {
        return next();
      }

      const requestedPath = req.originalUrl || req.url;
      const requestedMethod = req.method;

      const body: Record<string, unknown> = {
        type: "https://expressots.dev/errors/not-found",
        title: "Route Not Found",
        status: 404,
        detail: `Route '${requestedMethod} ${requestedPath}' does not exist`,
        instance: requestedPath,
        timestamp: new Date().toISOString(),
      };

      const suggestionsConfig = getDefaultSuggestionsConfig();
      if (suggestionsConfig.enabled) {
        const hints = getErrorHints(
          new Error(`Route '${requestedMethod} ${requestedPath}' not found`),
          {
            path: requestedPath,
            method: requestedMethod,
            statusCode: 404,
          },
          suggestionsConfig,
        );

        if (hints.length > 0) {
          try {
            const formatted = formatSuggestions(hints);
            if (formatted) {
              logger.warn(
                `Route not found: ${requestedMethod} ${requestedPath}${formatted}`,
                "router-404",
              );
            }
          } catch {
            // best-effort logging
          }

          const routeSuggestion = hints.find((hint) => hint.type === "route");
          const actionHint = hints.find((hint) => hint.type === "hint");

          if (routeSuggestion?.routes && routeSuggestion.routes.length > 0) {
            body.suggestions = routeSuggestion.routes.map((suggestion) => ({
              method: suggestion.route.method,
              path: suggestion.route.fullPath || suggestion.route.path,
              similarity: Math.round(suggestion.similarity * 100),
              reason: suggestion.reason,
            }));
          } else if (actionHint?.actions && actionHint.actions.length > 0) {
            body.actions = actionHint.actions;
          }
        }
      }

      res.status(404).json(body);
    });
  };

  /**
   * Append the terminal middleware — the 404 fallback and the error handler —
   * exactly once, whatever is hosting the app.
   *
   * This used to live inline in `listen()`, which meant every serverless
   * target silently lost both: adapters consume `getApp()` and never listen.
   * `setErrorHandler` type-checked and did nothing, and unmatched routes fell
   * through to whatever the adapter did on its own.
   */
  let finalized = false;
  const finalize = (): void => {
    if (finalized) {
      return;
    }
    finalized = true;

    // 404 fallback first, so unmatched routes get suggestions instead of
    // falling through to Express's default HTML — or worse, to a regular
    // middleware that arity-confused its way into running on every request.
    installNotFoundHandler();

    // Then the error handler, always registered with 4 arity so Express
    // recognises it as error-handling regardless of whether the user wrote
    // `(err, req, res)` or `(err, req, res, next)`. Without the wrapper,
    // Express would treat a 3-arg user handler as ordinary middleware and run
    // it on every request, swallowing 404s and crashing when the user calls
    // `res.status(...)` (positional `res` would actually be Express's `next`).
    //
    // Registered unconditionally and resolved at call time, so
    // `setErrorHandler()` still takes effect when it is called after the
    // stack has been finalized. With no handler set, `next(err)` restores
    // Express's default behaviour exactly.
    const wrappedErrorHandler: express.ErrorRequestHandler = (err, req, res, next) => {
      if (!errorHandler) {
        return next(err);
      }
      return errorHandler(err, req, res, next);
    };
    app.use(wrappedErrorHandler);
  };

  /**
   * Handle server shutdown. In development, exit immediately for fast
   * hot-reload. In production, drain connections before exiting.
   */
  const handleExit = (): void => {
    const environment = config?.environment || process.env.NODE_ENV || "development";

    void stopStudio();

    if (environment === "development") {
      process.exit(0);
    }

    if (httpServer) {
      httpServer.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 5000).unref();
    } else {
      process.exit(0);
    }
  };

  const microApp: MicroApp = {
    get: (path, ...handlers) => route("get", path, ...handlers),
    post: (path, ...handlers) => route("post", path, ...handlers),
    put: (path, ...handlers) => route("put", path, ...handlers),
    patch: (path, ...handlers) => route("patch", path, ...handlers),
    delete: (path, ...handlers) => route("delete", path, ...handlers),

    use(...args: Array<unknown>) {
      if (typeof args[0] === "string") {
        app.use(args[0], ...(args.slice(1) as Array<Middleware>));
      } else {
        app.use(...(args as Array<Middleware>));
      }
      return microApp;
    },

    setErrorHandler(handler) {
      errorHandler = handler;
      return microApp;
    },

    async listen(port, appInfo) {
      const normalizedPort = typeof port === "string" ? parseInt(port, 10) : port;
      const listenStartedAt = Date.now();

      // Initialize Studio Agent. The agent's middleware is registered via
      // app.use() inside initializeStudio, but that lands AFTER the user's
      // routes in the Express stack. Our lazy proxy (installed at position 0
      // during micro() creation) ensures CORS headers are injected before
      // any route handler sends a response.
      const studioStarted = await initializeStudio(app, {
        ...studioConfig,
        serviceName: studioConfig.serviceName ?? "expressots-micro",
        appPort: normalizedPort,
        globalPrefix: globalPrefix || undefined,
      });

      if (studioStarted) {
        const agent = getStudioAgent();
        if (agent) {
          studioMiddlewareDelegate = agent.createMiddleware();
        }
      }

      // Append the 404 fallback and error handler. Idempotent, so a request
      // that already triggered the lazy finalize does not double-register.
      finalize();

      return new Promise((resolve, reject) => {
        httpServer = app.listen(normalizedPort, async () => {
          const address = httpServer.address();
          const actualPort =
            typeof address === "object" && address?.port ? address.port : normalizedPort;

          if (config?.showBanner !== false) {
            const name = appInfo?.appName || "ExpressoTS Micro";
            const version = appInfo?.appVersion || "1.0.0";
            const environment = config?.environment || process.env.NODE_ENV || "development";
            logger.info(
              `${name} version ${version} is running on port ${actualPort} - Environment: ${environment}`,
              "micro",
            );
          }

          // Push runtime info to Studio Agent now that we know the actual port
          reportStudioRuntimeInfo({
            appPort: actualPort,
            globalPrefix: globalPrefix || undefined,
            startupMs: Date.now() - listenStartedAt,
          });

          // Re-scan routes so Studio sees the fully-populated Express router
          void rescanStudioRoutes();

          // Handle graceful shutdown
          (["SIGTERM", "SIGHUP", "SIGBREAK", "SIGQUIT", "SIGINT"] as Array<NodeJS.Signals>).forEach(
            (signal) => {
              process.on(signal, handleExit);
            },
          );

          resolve();
        });

        httpServer.on("error", (error) => {
          logger.error(`Server error: ${error.message}`, "micro");
          reject(error);
        });
      });
    },

    getHttpServer() {
      return httpServer ?? null;
    },

    getApp() {
      return app;
    },

    setStudio(cfg) {
      studioConfig = cfg;
      return microApp;
    },

    isStudioEnabled() {
      return checkStudioEnabled();
    },
  };

  return microApp;
}
