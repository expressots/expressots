import "reflect-metadata";

import { Request, Response, NextFunction } from "express";
import { ExpressoMiddleware } from "@expressots/core";

/**
 * Middleware that applies the status code to the response.
 * @returns express.RequestHandler
 */
export class HttpStatusCodeMiddleware extends ExpressoMiddleware {
  use(req: Request, res: Response, next: NextFunction): void | Promise<void> {
    const routeHandler = req.route.stack.find((layer) => layer.method === req.method.toLowerCase());

    if (routeHandler) {
      const handler = routeHandler.handle;
      const target = handler.constructor;
      const key = handler.name;
      const statusCode = Reflect.getMetadata("status_code", target, key);
      if (statusCode) {
        res.status(statusCode);
      } else {
        switch (req.method.toLowerCase()) {
          case "get":
            res.statusCode = 200;
            break;
          case "post":
            res.statusCode = 201;
            break;
          case "put":
            res.statusCode = 204;
            break;
          case "delete":
            res.statusCode = 204;
            break;
          default:
            res.statusCode = 200;
            break;
        }
      }
    }
    next();

    /* const statusCode = Reflect.getMetadata("status_code", Reflect, req.path);
    console.log("path", req.path);
    if (statusCode === undefined) {
      switch (req.method.toLowerCase()) {
        case "get":
          res.statusCode = 200;
          break;
        case "post":
          res.statusCode = 201;
          break;
        case "put":
          res.statusCode = 204;
          break;
        case "delete":
          res.statusCode = 204;
          break;
        default:
          res.statusCode = 200;
          break;
      }
    } else {
      res.statusCode = statusCode;
    }

    next(); */
  }
}
