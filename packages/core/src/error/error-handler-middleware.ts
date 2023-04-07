import { NextFunction, Request, Response } from "express";
import { StatusCode } from "./status-code";
import { IAppError } from "./report";

function errorHandler(error: IAppError, req: Request, res: Response, next: NextFunction): void {
    res.status(error.statusCode || StatusCode.InternalServerError).json({statusCode: error.statusCode, error: error.message});
}

export default errorHandler;