import express, { Request, Response, NextFunction } from "express";
import { IApplicationMessageToConsole } from "@expressots/core";
import { interfaces } from "../di/di.interfaces";
import { Engine, EngineOptions } from "./render/engine";

/**
 * Interface for the WebServer application implementation.
 */
export interface IWebServer {
  configure(container: interfaces.Container): Promise<void>;
  listen(
    port: number,
    environment: ServerEnvironment,
    consoleMessage?: IApplicationMessageToConsole,
  ): Promise<void>;
  setEngine<T extends EngineOptions>(engine: Engine, options?: T): Promise<void>;
}

/**
 * Constructor type for IWebServer.
 */
export interface IWebServerConstructor<T extends IWebServer> {
  new (): T;
}

/**
 * ExpressHandler Type
 *
 * The ExpressHandler type is a union type that represents various types of Express middleware functions.
 * It can be one of the following types:
 * - express.ErrorRequestHandler: Handles errors in the middleware pipeline.
 * - express.RequestParamHandler: Handles parameters in the middleware pipeline.
 * - express.RequestHandler: General request handler.
 * - undefined: Represents the absence of a handler.
 */
export type ExpressHandler =
  | express.ErrorRequestHandler
  | express.RequestParamHandler
  | express.RequestHandler
  | undefined;

/**
 * MiddlewareConfig Interface
 *
 * The MiddlewareConfig interface specifies the structure for middleware configuration objects.
 * - path: Optional. The route path for which the middleware is configured.
 * - middlewares: An array of ExpressHandler types that make up the middleware pipeline for the route specified by 'path'.
 */
export type MiddlewareConfig = {
  path?: string;
  middlewares: Array<ExpressHandler>;
};

/**
 * Expresso middleware interface.
 */
interface IExpressoMiddleware {
  //readonly name: string;
  use(req: Request, res: Response, next: NextFunction): Promise<void> | void;
}

/**
 * Abstract class for creating custom Expresso middleware.
 * Custom middleware classes should extend this class and implement the use method.
 *
 */
export abstract class ExpressoMiddleware implements IExpressoMiddleware {
  get name(): string {
    return this.constructor.name;
  }

  abstract use(req: Request, res: Response, next: NextFunction): Promise<void> | void;
}

/**
 * Enum representing possible server environments.
 */
export enum ServerEnvironment {
  Development = "development",
  Production = "production",
}
