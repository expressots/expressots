// Unit tests for: ExpressoMiddleware abstract class

import { NextFunction, Request, Response } from "express";
import { ExpressoMiddleware } from "../middleware-service";

// Concrete implementation for testing
class SyncExpressoMiddleware extends ExpressoMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    next();
  }
}

class AsyncExpressoMiddleware extends ExpressoMiddleware {
  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    await Promise.resolve();
    next();
  }
}

class ErrorExpressoMiddleware extends ExpressoMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    next(new Error("Test error"));
  }
}

describe("ExpressoMiddleware abstract class", () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    req = {} as Request;
    res = {} as Response;
    next = jest.fn();
  });

  describe("name getter", () => {
    it("should return the constructor name", () => {
      const middleware = new SyncExpressoMiddleware();
      expect(middleware.name).toBe("SyncExpressoMiddleware");
    });

    it("should return different names for different implementations", () => {
      const sync = new SyncExpressoMiddleware();
      const async = new AsyncExpressoMiddleware();

      expect(sync.name).toBe("SyncExpressoMiddleware");
      expect(async.name).toBe("AsyncExpressoMiddleware");
    });
  });

  describe("Synchronous Middleware", () => {
    it("should return an instance of ExpressoMiddleware", () => {
      const middleware = new SyncExpressoMiddleware();
      expect(middleware).toBeInstanceOf(ExpressoMiddleware);
    });

    it("should call next()", () => {
      const middleware = new SyncExpressoMiddleware();
      middleware.use(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe("Asynchronous Middleware", () => {
    it("should support async use method", async () => {
      const middleware = new AsyncExpressoMiddleware();
      await middleware.use(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it("should return a Promise", () => {
      const middleware = new AsyncExpressoMiddleware();
      const result = middleware.use(req, res, next);
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe("Error Handling", () => {
    it("should pass errors to next()", () => {
      const middleware = new ErrorExpressoMiddleware();
      middleware.use(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});

// End of unit tests for: ExpressoMiddleware
