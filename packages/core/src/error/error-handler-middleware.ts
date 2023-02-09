import { NextFunction, Request, Response } from "express";
import { AppError } from "./application-error";
import { StatusCode } from "./status-code";

function errorHandler(error: AppError, req: Request, res: Response, next: NextFunction): void {
    
    res.status(error.statusCode || StatusCode.InternalServerError).json({statusCode: error.statusCode, error: error.message});
}

export default errorHandler;