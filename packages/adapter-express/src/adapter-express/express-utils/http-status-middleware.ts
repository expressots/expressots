import "reflect-metadata";

import { Request, Response, NextFunction } from "express";
import { ExpressoMiddleware } from "@expressots/core";
import { HTTP_CODE_METADATA } from "./constants";

/**
 * Middleware that applies the status code to the response.
 * @returns express.RequestHandler
 */
export class HttpStatusCodeMiddleware extends ExpressoMiddleware {
  use(req: Request, res: Response, next: NextFunction): void | Promise<void> {
    const statusCodeMapping = Reflect.getMetadata(HTTP_CODE_METADATA.httpCode, Reflect);
    let path = req.path.endsWith("/") ? req.path.slice(0, -1) : req.path;

    if (path === "/" || path === "") {
      path = "/";
    }

    const statusCode = statusCodeMapping[path];

    if (statusCode) {
      res.status(statusCode);
    } else {
      this.setDefaultStatusCode(req, res);
    }
    next();
  }

  private setDefaultStatusCode(req: Request, res: Response): void {
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
