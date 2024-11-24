import { Logger } from "@expressots/core";
import express from "express";
import { Middleware } from "../express-utils/interfaces";

type RouteDefinition = {
  method: "get" | "post" | "put" | "patch" | "delete";
  path: string;
  handler: express.RequestHandler;
  middleware: Array<Middleware>;
};

/**
 * Route manager for Express Micro API adapter
 * @public API
 */
export interface IRoute {
  define(
    method: "get" | "post" | "put" | "delete" | "patch",
    path: string,
    handler: express.RequestHandler,
    ...middleware: Array<Middleware>
  ): void;
  get(path: string, handler: express.RequestHandler, ...middleware: Array<Middleware>): void;
  post(path: string, handler: express.RequestHandler, ...middleware: Array<Middleware>): void;
  put(path: string, handler: express.RequestHandler, ...middleware: Array<Middleware>): void;
  delete(path: string, handler: express.RequestHandler, ...middleware: Array<Middleware>): void;
  patch(path: string, handler: express.RequestHandler, ...middleware: Array<Middleware>): void;
}

export class Route implements IRoute {
  private logger: Logger = new Logger();
  private routes: Array<RouteDefinition> = [];
  private app: express.Application;
  private globalPrefix: string = "";

  constructor(app: express.Application) {
    this.app = app;
  }

  /**
   * Set the global route prefix
   * @param prefix
   * @public API
   */
  public setGlobalRoutePrefix(prefix: string): void {
    this.globalPrefix = prefix;
  }

  /**
   * Define a route
   * @param method - HTTP method
   * @param path - Route path
   * @param handler - Route handler
   * @param middleware - Route middleware
   * @public API
   */
  public define(
    method: "get" | "post" | "put" | "delete" | "patch",
    path: string,
    handler: express.RequestHandler,
    ...middleware: Array<Middleware>
  ): void {
    const normalizedPath = `${this.globalPrefix.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

    this.routes.push({ method, path: normalizedPath, handler, middleware });
    this.logger.info(`Route ${method.toUpperCase()} '${normalizedPath}' added.`, "Route");
  }

  /**
   * Define a GET route
   * @param path - Route path
   * @param handler - Route handler
   * @param middleware - Route middleware
   * @public API
   */
  public get(
    path: string,
    handler: express.RequestHandler,
    ...middleware: Array<Middleware>
  ): void {
    this.define("get", path, handler, ...middleware);
  }

  /**
   * Define a POST route
   * @param path - Route path
   * @param handler - Route handler
   * @param middleware - Route middleware
   * @public API
   */
  public post(
    path: string,
    handler: express.RequestHandler,
    ...middleware: Array<Middleware>
  ): void {
    this.define("post", path, handler, ...middleware);
  }

  /**
   * Define a PUT route
   * @param path - Route path
   * @param handler - Route handler
   * @param middleware - Route middleware
   * @public API
   */
  public put(
    path: string,
    handler: express.RequestHandler,
    ...middleware: Array<Middleware>
  ): void {
    this.define("put", path, handler, ...middleware);
  }

  /**
   * Define a DELETE route
   * @param path - Route path
   * @param handler - Route handler
   * @param middleware - Route middleware
   * @public API
   */
  public delete(
    path: string,
    handler: express.RequestHandler,
    ...middleware: Array<Middleware>
  ): void {
    this.define("delete", path, handler, ...middleware);
  }

  /**
   * Define a PATCH route
   * @param path - Route path
   * @param handler - Route handler
   * @param middleware - Route middleware
   * @public API
   */
  public patch(
    path: string,
    handler: express.RequestHandler,
    ...middleware: Array<Middleware>
  ): void {
    this.define("patch", path, handler, ...middleware);
  }

  /**
   * Apply the routes to the Express application
   */
  public applyRoutes(): void {
    this.routes.forEach(({ method, path, handler, middleware }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.app as any)[method](path, ...middleware, handler);
    });
  }

  /**
   * Get the routes
   * @returns Array of route definitions
   * @public API
   */
  public get Routes(): Array<RouteDefinition> {
    return this.routes;
  }
}
