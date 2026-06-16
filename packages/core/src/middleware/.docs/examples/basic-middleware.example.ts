/**
 * Basic Middleware Example
 *
 * This example demonstrates basic middleware usage.
 *
 * @example
 * ```bash
 * # Run this example
 * ts-node examples/basic-middleware.example.ts
 * ```
 */

import { ExpressoMiddleware } from "../index";
import { Request, Response, NextFunction } from "express";

// Example 1: Simple Express handler
export function simpleMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  console.log(`Request to ${req.path}`);
  req.timestamp = new Date();
  next();
}

// Example 2: Expresso middleware class
export class LoggingMiddleware extends ExpressoMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  }
}

// Example 3: Authentication middleware
export class AuthMiddleware extends ExpressoMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Validate token (simplified)
    if (token !== "Bearer valid-token") {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Attach user to request
    req.user = { id: 1, name: "John Doe" };
    next();
  }
}

// Example 4: Request ID middleware
export class RequestIdMiddleware extends ExpressoMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    req.id = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    res.setHeader("X-Request-ID", req.id);
    next();
  }
}

// Example 5: Async middleware
export class AsyncMiddleware extends ExpressoMiddleware {
  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 100));

    req.asyncData = "loaded";
    next();
  }
}

// Example usage
if (require.main === module) {
  console.log("Basic Middleware Examples");
  console.log("========================");
  console.log("\n1. Simple Express handler");
  console.log("2. Expresso middleware class");
  console.log("3. Authentication middleware");
  console.log("4. Request ID middleware");
  console.log("5. Async middleware");
}

export {
  LoggingMiddleware,
  AuthMiddleware,
  RequestIdMiddleware,
  AsyncMiddleware,
};
