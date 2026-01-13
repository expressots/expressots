import { Console, Logger } from "@expressots/core";
import { IConsoleMessage } from "@expressots/shared";
import express from "express";
import { Server } from "http";
import { AppExpress } from "../application-express";

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

  /** Get the underlying HTTP server (available after listen) */
  getHttpServer(): Server;

  /** Get the Express app instance (for advanced use) */
  getApp(): express.Application;
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
  const console = new Console();
  const globalPrefix = config?.globalPrefix?.replace(/\/$/, "") || "";
  let httpServer: Server;
  let errorHandler: express.ErrorRequestHandler | null = null;

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

    return microApp;
  };

  /**
   * Handle server shutdown gracefully
   */
  const handleExit = (): void => {
    logger.info("Server shutting down", "micro");
    process.exit(0);
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

      // Apply error handler last
      if (errorHandler) {
        app.use(errorHandler);
      }

      return new Promise((resolve, reject) => {
        httpServer = app.listen(normalizedPort, async () => {
          const address = httpServer.address();
          const actualPort =
            typeof address === "object" && address?.port ? address.port : normalizedPort;

          if (config?.showBanner !== false) {
            await console.messageServer(actualPort, "development", {
              appName: appInfo?.appName || "ExpressoTS Micro",
              appVersion: appInfo?.appVersion || "1.0.0",
            });
          }

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
      return httpServer;
    },

    getApp() {
      return app;
    },
  };

  return microApp;
}
