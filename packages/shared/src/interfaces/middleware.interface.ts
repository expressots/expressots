import { Request, Response, NextFunction } from "express";

/**
 * ExpressoTS Class middleware interface.
 */
export interface IExpressoMiddleware {
  //readonly name: string;
  use(req: Request, res: Response, next: NextFunction): Promise<void> | void;
}
