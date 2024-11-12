// Unit tests for: use

import { NextFunction, Request, Response } from "express";
import { ExpressoMiddleware } from "../middleware-service";

// Mock interfaces and types
class ConcreteExpressoMiddleware extends ExpressoMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    next();
  }
}

describe("ExpressoMiddleware.use() use method", () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;
  let middleware: ConcreteExpressoMiddleware;

  beforeEach(() => {
    req = {} as Request;
    res = {} as Response;
    next = jest.fn();
    middleware = new ConcreteExpressoMiddleware();
  });

  describe("Happy Path", () => {
    it("should return an instance of ConcreteExpressoMiddleware", () => {
        expect(middleware).toBeInstanceOf(ConcreteExpressoMiddleware);
        });
  });

  describe("Edge Cases", () => {
   it("should return the constructor name", () => {
    expect(middleware.name).toBe("ConcreteExpressoMiddleware");
    });
   it("should call next()", () => {
    middleware.use(req, res, next);
    expect(next).toHaveBeenCalled();
    });
  });
});

// End of unit tests for: use
