import "reflect-metadata";

import { Request, Response, NextFunction } from "express";
import { ExpressoMiddleware } from "@expressots/core";
import { HTTP_CODE_METADATA } from "./constants";

/**
 * Middleware that applies the status code to the response.
 * @returns express.RequestHandler
 */
export class HttpStatusCodeMiddleware extends ExpressoMiddleware {
  private globalPrefix: string;

  constructor(globalPrefix: string = "/") {
    super();
    this.globalPrefix = globalPrefix;
  }

  use(req: Request, res: Response, next: NextFunction): void | Promise<void> {
    const statusCodeMapping = Reflect.getMetadata(HTTP_CODE_METADATA.httpCode, Reflect);

    let path = req.path;
    if (this.globalPrefix !== "/" && path.startsWith(this.globalPrefix)) {
      path = path.slice(this.globalPrefix.length);
    }

    path = path.endsWith("/") ? path.slice(0, -1) : path;
    const formattedMethod = req.method.toLowerCase();

    path = `${path || "/"}/-${formattedMethod}`;

    const statusCode = statusCodeMapping[path];

    if (statusCode) {
      res.status(statusCode);
    } else {
      const patternMatchStatusCode = this.findMatchingParameterPath(path, statusCodeMapping);

      if (patternMatchStatusCode) {
        res.status(patternMatchStatusCode);
      } else {
        this.setDefaultStatusCode(req, res);
      }
    }
    next();
  }

  /**
   * Find the matching parameter path.
   * @param path - The path to match.
   * @param mapping - The mapping to check.
   * @param method - The method to check.
   * @returns The status code if found, otherwise null.
   **/
  private findMatchingParameterPath(path: string, mapping: Record<string, number>): number | null {
    for (const pathCode in mapping) {
      const patternCheck = new RegExp("^" + pathCode.replace(/:[^\s/]+/g, "([^/]+)") + "$");

      if (patternCheck.test(path)) {
        return mapping[pathCode];
      }
    }

    return null;
  }

  /**
   * Set the default status code based on the request method.
   * @param req - The request object.
   * @param res - The response object.
   **/
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
      case "patch":
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
