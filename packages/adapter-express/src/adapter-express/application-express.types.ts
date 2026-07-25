import express from "express";

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
