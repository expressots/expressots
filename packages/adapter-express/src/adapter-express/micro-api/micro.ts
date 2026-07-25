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
import { AppExpress } from "../application-express.js";
import {
  initializeStudio,
  stopStudio,
  isStudioEnabled as checkStudioEnabled,
  getStudioAgent,
  reportStudioRuntimeInfo,
  rescanStudioRoutes,
} from "../studio/index.js";

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
  // Disable the log buffering from AppExpress since micro() doesn't use the banner system
  // This restores normal console output for micro API users
  AppExpress.disableBuffering();

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

  // Auto-enable JSON parsing by default
  if (config?.autoParseJson !== false) {
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
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

      // Install the 404 fallback before the user error handler so unmatched
      // routes get suggestions instead of falling through to the default
      // Express HTML or - worse - to a regular middleware that arity-confused
      // its way into running on every request.
      installNotFoundHandler();

      // Apply error handler last. Wrap it in a 4-arity function so that
      // Express recognizes it as an error-handling middleware regardless of
      // whether the user wrote `(err, req, res)` or `(err, req, res, next)`.
      // Without this wrapper, Express would treat a 3-arg user handler as a
      // regular middleware and run it on every request, which both swallows
      // 404s and crashes when the user calls `res.status(...)` (positional
      // `res` would actually be Express's `next`).
      if (errorHandler) {
        const userHandler = errorHandler;
        const wrappedErrorHandler: express.ErrorRequestHandler = (err, req, res, next) =>
          userHandler(err, req, res, next);
        app.use(wrappedErrorHandler);
      }

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
